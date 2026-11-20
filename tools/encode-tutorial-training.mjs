import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';

// No browser is opened. Only actual saved captures are encoded.
// Run: node tools/encode-tutorial-training.mjs [evidence-directory]
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const evidence = path.resolve(root, process.argv[2] ?? 'docs/design/tutorial-training-v1/evidence');
const sequence = path.join(evidence, 'sequence');
const binary = process.env.FFMPEG_PATH ?? path.join(root, '.tmp/video-export-runtime/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe');
await fs.access(binary);
const times = JSON.parse(await fs.readFile(path.join(sequence, 'times.json'), 'utf8'));
if (!Array.isArray(times) || times.length < 2) throw new Error('Need at least two timestamped browser captures.');
const seen = new Set();
for (const [i, row] of times.entries()) {
  if (!Number.isInteger(row.n) || row.n < 0 || seen.has(row.n) || !Number.isFinite(row.t)
    || (i > 0 && row.t <= times[i - 1].t)) throw new Error(`Invalid capture timestamp at row ${i}.`);
  seen.add(row.n);
  await fs.access(path.join(sequence, `frame-${row.n}.jpg`));
}
const intervals = times.slice(1).map((row, i) => row.t - times[i].t);
const sorted = [...intervals].sort((a, b) => a - b);
const percentile = p => sorted[Math.ceil((sorted.length - 1) * p)];
const frameSize = await sharp(path.join(sequence, `frame-${times[0].n}.jpg`)).metadata();
const quote = value => value.replaceAll('\\', '/').replaceAll("'", "'\\''");
// Image demuxer time base defaults to 1/25. Explicitly use 1/1000 so the
// timestamp intervals are not rounded to artificial 40 ms increments.
const manifest = ['ffconcat version 1.0', ...times.flatMap((row, i) => [
  `file '${quote(path.join(sequence, `frame-${row.n}.jpg`))}'`,
  'option framerate 1000',
  ...(i < intervals.length ? [`duration ${(intervals[i] / 1000).toFixed(6)}`] : []),
])].join('\n') + '\n';
const concat = path.join(sequence, 'frames.ffconcat');
await fs.writeFile(concat, manifest);
const output = path.join(evidence, '03-first-battle-teaching-sequence.mp4');
const encoded = spawnSync(binary, ['-y', '-hide_banner', '-loglevel', 'error',
  '-f', 'concat', '-safe', '0', '-i', concat, '-map', '0:v:0',
  '-vf', 'pad=ceil(iw/2)*2:ceil(ih/2)*2', '-fps_mode', 'passthrough',
  '-enc_time_base', '1:1000', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-bf', '0',
  '-pix_fmt', 'yuv420p', '-video_track_timescale', '1000', '-movflags', '+faststart', output],
{ encoding: 'utf8', windowsHide: true });
if (encoded.error || encoded.status !== 0) throw encoded.error ?? new Error(encoded.stderr);
// Decode the export and compare all presentation timestamps, not just its header.
const decoded = spawnSync(binary, ['-hide_banner', '-i', output, '-vf', 'showinfo', '-fps_mode', 'passthrough', '-f', 'null', '-'],
  { encoding: 'utf8', windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
if (decoded.error || decoded.status !== 0) throw decoded.error ?? new Error(decoded.stderr);
const pts = [...decoded.stderr.matchAll(/\bn:\s*\d+\s+pts:\s*-?\d+\s+pts_time:([\d.-]+)/g)].map(match => Number(match[1]) * 1000);
if (pts.length !== times.length) throw new Error(`Export has ${pts.length} decoded frames; expected ${times.length}.`);
const maxTimestampErrorMs = Math.max(...pts.map((value, i) => Math.abs(value - (times[i].t - times[0].t))));
if (maxTimestampErrorMs > 1.01) throw new Error(`Export changed capture timing by ${maxTimestampErrorMs} ms.`);
const convertedScreenshots = [];
for (const entry of await fs.readdir(evidence, { withFileTypes: true })) {
  if (!entry.isFile() || !/\.jpe?g$/i.test(entry.name)) continue;
  const name = entry.name.replace(/\.jpe?g$/i, '.png');
  await sharp(path.join(evidence, entry.name)).png().toFile(path.join(evidence, name));
  convertedScreenshots.push(name);
}
const captureSpanMs = times.at(-1).t - times[0].t;
const summary = {
  source: 'Built-in browser JPEG captures; timestamps from sequence/times.json.',
  video: path.basename(output), captureFrames: times.length, captureSpanMs,
  averageCaptureFps: (times.length - 1) * 1000 / captureSpanMs,
  minCaptureIntervalMs: sorted[0], medianCaptureIntervalMs: percentile(.5),
  p95CaptureIntervalMs: percentile(.95), maxCaptureIntervalMs: sorted.at(-1),
  sourceWidth: frameSize.width, sourceHeight: frameSize.height,
  encodedFrames: pts.length, maxTimestampErrorMs,
  finalFrameDurationMs: 1,
  convertedScreenshots,
  limitations: [
    'Capture cadence is not game frame rate. Sub-frame animation quality cannot be established from this recording.',
    'Original intervals are preserved; no interpolated motion, generated frames, frame blending or speed changes.',
    'The final capture has no following timestamp; the container retains it for one millisecond.',
    'No audio was captured. PNG screenshots are conversions of the original JPEG captures, not new lossless captures.',
  ],
};
await fs.writeFile(path.join(evidence, 'capture-report.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
