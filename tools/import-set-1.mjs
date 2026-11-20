/** Build the Set 1 runtime catalogue and board/thumb art from reviewed data. */
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = JSON.parse(await readFile(path.join(root, 'content/set-1.json'), 'utf8'));
const guilds = { Agta: 'Gubat Banwa', Babaylan: 'Visayas Arch', Maguindanao: 'Mindanao Arch' };
const seen = new Set();
const cards = [];
for (const c of source) {
  if (seen.has(c.id)) throw new Error(`Duplicate card: ${c.id}`);
  seen.add(c.id);
  await access(path.join(root, c.art));
  for (const [folder, height] of [['board', 512], ['thumb', 256]]) {
    const dest = path.join(root, c.art.replace('/web/', `/${folder}/`));
    await mkdir(path.dirname(dest), { recursive: true });
    await sharp(path.join(root, c.art)).resize({ height, withoutEnlargement: true })
      .webp({ quality: 85 }).toFile(dest);
  }
  // Authored fields pass THROUGH.
  //
  // This used to hardcode `effectsPending: true` with empty abilities and
  // no text, which made it a one-shot importer: re-running it silently
  // erased every rules text anyone had written since. It also dropped
  // `state`, and a Codex without `state` can never release its State —
  // which is why Bayanihan never fired for any Set 1 Agta Codex.
  //
  // content/set-1.json is the source of truth for card text now, so the
  // importer is safe to run as often as the art needs rebuilding.
  cards.push({
    id: c.id, name: c.name, type: c.type, guild: guilds[c.deck], deck: c.deck,
    archipelago: c.archipelago, set: 'set-1',
    effectsPending: c.effectsPending ?? !(c.text || c.abilities?.length),
    level: c.level, power: c.power, defense: c.defense,
    subtypes: [`${c.archipelago} Arch`, ...(c.subtype ? [c.subtype] : [])],
    abilities: c.abilities ?? [], text: c.text ?? '',
    flavor: c.flavor ?? '', artist: c.artist ?? null,
    ...(c.state ? { state: c.state } : {}),
    art: c.art, thumb: c.art.replace('/web/', '/thumb/'),
    guildPrinted: `${c.archipelago} Arch`,
  });
}
await writeFile(path.join(root, 'src/data/set-1.json'), JSON.stringify(cards, null, 1) + '\n');
console.log(`Imported ${cards.length} Set 1 cards with board and thumbnail images.`);
