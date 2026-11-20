export type MusicScene = 'title' | 'tutorial' | 'battle' | 'victory' | 'defeat';
export interface SoundtrackTrack {
  /** Same-origin file in assets/music. Never load a YouTube player into a duel. */
  file: string;
  title: string;
  artist: string;
  loop: boolean;
}

export const MUSIC_LIBRARY: SoundtrackTrack[] = [
  { file: '/music/journey-of-hearts.m4a', title: 'Journey of Hearts', artist: 'Codex Legends soundtrack', loop: true },
  { file: '/music/break-those-limits.m4a', title: 'Break Those Limits', artist: 'Codex Legends soundtrack', loop: false },
  { file: '/music/break-the-chains.m4a', title: 'Break the Chains', artist: 'Codex Legends soundtrack', loop: false },
];
// Battles retain the quiet procedural instrumental. No instrumental exports
// were supplied; a vocal track is not relabeled as an instrumental version.
export const SOUNDTRACK: Partial<Record<MusicScene, SoundtrackTrack>> = {
  title: MUSIC_LIBRARY[0], tutorial: MUSIC_LIBRARY[0], victory: MUSIC_LIBRARY[1],
};

export function musicScene(soundscape: string): MusicScene {
  if (['title', 'tutorial', 'victory', 'defeat'].includes(soundscape)) return soundscape as MusicScene;
  return 'battle';
}
