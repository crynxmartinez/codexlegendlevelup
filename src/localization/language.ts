export type CardLanguage = 'tl' | 'en';
let currentLanguage: CardLanguage = 'tl';
export function cardLanguage(): CardLanguage { return currentLanguage; }
export function setCardLanguage(language: CardLanguage): void {
  currentLanguage = language;
}
