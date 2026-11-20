/** Input instructions follow deliberate input, never viewport width or hover. */
export type InputMode = 'mouse' | 'touch' | 'keyboard';
let mode: InputMode | undefined;
export function inputMode(): InputMode {
  return mode ?? (typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches ? 'touch' : 'mouse');
}
export function inputCopy(text: string, input = inputMode()): string {
  const inspect = input === 'touch' ? 'Press and hold' : input === 'keyboard' ? 'Focus and press Shift+F10 on' : 'Right-click';
  return text
    .replace(/Right-click the glowing card, or press and hold on a phone/gi, `${inspect} the glowing card`)
    .replace(/Right-click your Persona, or press and hold it/gi, `${inspect} your Persona`)
    .replace(/right-click it with a mouse, or press and hold on a touch\s+(?:device|screen)/gi, input === 'touch' ? 'press and hold it' : input === 'keyboard' ? 'focus it and press Shift+F10' : 'right-click it')
    .replace(/right-click/gi, inspect)
    .replace(/\bclick\b/gi, word => input === 'touch' ? (word === 'Click' ? 'Tap' : 'tap') : input === 'keyboard' ? (word === 'Click' ? 'Select' : 'select') : word);
}
export function inspectHint(): string {
  return inputMode() === 'touch' ? 'Press and hold to read' : inputMode() === 'keyboard' ? 'Shift+F10 to read' : 'Right-click to read';
}
if (typeof document !== 'undefined') {
  document.addEventListener('pointerdown', e => { mode = e.pointerType === 'touch' || e.pointerType === 'pen' ? 'touch' : 'mouse'; }, true);
  document.addEventListener('keydown', e => { if (['Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) mode = 'keyboard'; }, true);
}
