const TEXT_ENTRY = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

/**
 * Determines whether the event target is an active text entry element.
 * Used to avoid triggering hotkeys when typing in forms, inputs, or contentEditable.
 */
export function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (TEXT_ENTRY.has(target.tagName)) return true;
  if (target.isContentEditable) return true;
  return target.getAttribute('role') === 'textbox';
}
