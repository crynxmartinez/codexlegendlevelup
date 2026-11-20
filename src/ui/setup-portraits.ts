import portraits from './setup-portraits.json';

/** Setup hero artwork only. Card tiles and Codex previews retain their real cards. */
export function setupPortrait(id: string, fallback: string): string {
  return (portraits as Readonly<Record<string, string>>)[id] ?? fallback;
}
