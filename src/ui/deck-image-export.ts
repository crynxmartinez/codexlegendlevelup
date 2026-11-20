import type { DeckViewModel, DeckViewEntry } from './deck-view-model.js';
import { deckImageLayout } from './deck-view-model.js';
import { artUrl } from './assets.js';

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const timeout = setTimeout(() => { image.onload = null; image.onerror = null; reject(new Error('An image is taking too long to load. Check your connection and try again.')); }, 20_000);
    image.onload = () => { clearTimeout(timeout); resolve(image); };
    image.onerror = () => { clearTimeout(timeout); reject(new Error('An image could not load. Check your connection and try again.')); };
    image.src = url;
  });
}

function wrappedLines(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const result: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > width) { result.push(line); line = word; }
    else line = next;
  }
  if (line) result.push(line);
  return result;
}

/** Uses real cards and exact quantities. No screenshot, controls, or player identity is exported. */
export async function deckImageBlob(model: DeckViewModel, name: string, region: string, starter: boolean, coverId?: string): Promise<Blob> {
  const layout = deckImageLayout(model.main.length, model.codex.length);
  const records = [...model.main, ...model.codex];
  const [loadedCards, logo] = await Promise.all([
    Promise.all(records.map(async entry => [entry.id, await loadImage(artUrl(entry.card.art))] as const)),
    loadImage('/ui/menu-v1/logo-approved.png'),
  ]);
  const images = new Map(loadedCards);
  const canvas = document.createElement('canvas');
  canvas.width = layout.width; canvas.height = layout.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Image export is unavailable in this browser. Your deck has not changed.');
  ctx.fillStyle = '#e8f5ff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#cfe6f4'; ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += 24) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
  for (let y = 0; y < canvas.height; y += 24) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }
  const bar = (x: number, y: number, width: number, height: number) => {
    const gradient = ctx.createLinearGradient(x, y, x + width, y); gradient.addColorStop(0, '#12437b'); gradient.addColorStop(1, '#061b37');
    ctx.fillStyle = gradient; ctx.beginPath(); ctx.moveTo(x + 14, y); ctx.lineTo(x + width, y); ctx.lineTo(x + width - 14, y + height); ctx.lineTo(x, y + height); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#b6ccdc'; ctx.lineWidth = 3; ctx.stroke();
  };
  bar(0, 0, canvas.width, 108);
  ctx.fillStyle = '#fff'; ctx.font = 'italic 900 48px Arial'; ctx.fillText(`${name.toUpperCase()} / DECKLIST`, 36, 65);
  const logoScale = Math.min(390 / logo.naturalWidth, 65 / logo.naturalHeight);
  ctx.drawImage(logo, canvas.width - 36 - logo.naturalWidth * logoScale, 4, logo.naturalWidth * logoScale, logo.naturalHeight * logoScale);
  ctx.textAlign = 'right';
  ctx.font = '20px Arial'; ctx.fillText(`${starter ? 'NORMAL STARTER · ' : ''}${region} · ${model.mainCount} MAIN · ${model.codexCount} CODEX`, canvas.width - 36, 77); ctx.textAlign = 'left';
  const cover = model.main.find(entry => entry.id === coverId) ?? model.main.find(entry => entry.card.type === 'Unit' && entry.card.level === 3) ?? model.main[0];
  if (cover) {
    const image = images.get(cover.id)!;
    const width = 290, height = width * image.naturalHeight / image.naturalWidth;
    ctx.drawImage(image, 30, 150, width, height);
  }
  let summaryY = 610;
  ctx.fillStyle = '#092044'; ctx.font = 'italic bold 30px Arial'; ctx.fillText(region.toUpperCase(), 30, summaryY); summaryY += 32;
  for (const count of model.counts) {
    bar(24, summaryY, 296, 48); ctx.fillStyle = '#fff'; ctx.font = 'italic bold 24px Arial';
    ctx.fillText(count.label.toUpperCase(), 44, summaryY + 32); ctx.textAlign = 'right'; ctx.fillText(String(count.value), 294, summaryY + 32); ctx.textAlign = 'left'; summaryY += 60;
  }
  ctx.fillStyle = '#18416a'; ctx.font = '18px Arial';
  for (const [i, line] of wrappedLines(ctx, 'Persona is chosen from your main deck. Codex cards are held separately.', 280).entries()) ctx.fillText(line, 30, summaryY + 26 + i * 24);
  const drawCards = (entries: DeckViewEntry[], top: number) => entries.forEach((entry, i) => {
    const x = layout.gridLeft + (i % layout.columns) * (layout.cellWidth + layout.gap);
    const y = top + Math.floor(i / layout.columns) * layout.cellHeight;
    const image = images.get(entry.id)!;
    const artHeight = 254, artWidth = Math.min(layout.cellWidth, artHeight * image.naturalWidth / image.naturalHeight);
    ctx.save(); ctx.shadowColor = '#09204466'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 3;
    ctx.drawImage(image, x + (layout.cellWidth - artWidth) / 2, y, artWidth, artHeight); ctx.restore();
    bar(x + layout.cellWidth - 62, y + artHeight - 35, 62, 35);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 27px Arial'; ctx.fillText(`×${entry.copies}`, x + layout.cellWidth - 48, y + artHeight - 8);
    ctx.fillStyle = '#092044'; ctx.font = 'bold 15px Arial'; ctx.textAlign = 'center';
    const lines = wrappedLines(ctx, entry.card.name, layout.cellWidth);
    // Shrink only exceptionally long labels; the artwork size remains consistent.
    const fontSize = lines.length > 3 ? 12 : 15; ctx.font = `bold ${fontSize}px Arial`;
    wrappedLines(ctx, entry.card.name, layout.cellWidth).forEach((line, n) => ctx.fillText(line, x + layout.cellWidth / 2, y + artHeight + 20 + n * 17));
    ctx.textAlign = 'left';
  });
  drawCards(model.main, layout.mainTop);
  bar(layout.gridLeft, layout.codexTop - 42, canvas.width - layout.gridLeft - 24, 34);
  ctx.fillStyle = '#fff'; ctx.font = 'italic bold 22px Arial'; ctx.fillText(`CODEX / ${model.codexCount} · OUTSIDE THE MAIN DECK`, layout.gridLeft + 24, layout.codexTop - 17);
  drawCards(model.codex, layout.codexTop + 8);
  bar(0, canvas.height - 52, canvas.width, 52); ctx.fillStyle = '#fff'; ctx.font = '18px Arial';
  ctx.fillText('Deck image · Use a CL1 deck code to import this list into Codex Legend TCG.', 36, canvas.height - 20);
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('The deck image could not be created. Please try again.')), 'image/png'));
}

export async function downloadDeckImage(model: DeckViewModel, name: string, region: string, starter: boolean, coverId?: string): Promise<void> {
  const blob = await deckImageBlob(model, name, region, starter, coverId);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = `${name.replace(/[^a-z0-9_-]+/gi, '-') || 'deck'}-decklist.png`;
  link.click(); setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
