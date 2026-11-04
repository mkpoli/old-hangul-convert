import { composedForm, segment, type Syllable } from './segment';

const TONE_H = '\u302E';
const TONE_R = '\u302F';
const DOTS = '·・‧･˙';
const COLONS = ':：∶ː';
const WRITTEN_BEFORE = new RegExp(`[${DOTS}${COLONS}]$`);
const WRITTEN_AFTER = /^[\u0307\u0308]/;

const toneOf = (mark: string) => (DOTS.includes(mark) || mark === '\u0307' ? TONE_H : TONE_R);

/**
 * Reads 聲點 written as `·` or `:` before the syllable, or as a combining dot or diaeresis
 * after it, and writes them as the Hangul tone marks U+302E and U+302F after the syllable.
 * A colon or middle dot in modern prose would be read too, so call this only on text that
 * marks tones this way.
 */
export function fromDotTones(text: string): string {
  const parts = segment(text);
  let out = '';
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!;
    if (part.kind === 'syllable') {
      out += composedForm(part);
      continue;
    }
    let other = part.text;
    const after = WRITTEN_AFTER.exec(other);
    if (after && parts[i - 1]?.kind === 'syllable') {
      out += toneOf(after[0]);
      other = other.slice(1);
    }
    const next = parts[i + 1];
    const before = WRITTEN_BEFORE.exec(other);
    if (before && next?.kind === 'syllable') {
      out += other.slice(0, -1) + composedForm(next) + toneOf(before[0]);
      i++;
    } else {
      out += other;
    }
  }
  return out;
}

/** Writes the tone marks U+302E and U+302F as `·` and `:` before their syllable. */
export function toDotTones(text: string): string {
  const parts = segment(text);
  let out = '';
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!;
    if (part.kind === 'other') {
      out += i > 0 ? part.text.replace(/^[\u302E\u302F]/, '') : part.text;
      continue;
    }
    const next = parts[i + 1];
    const mark = next?.kind === 'other' ? next.text[0] : undefined;
    const prefix = mark === TONE_H ? '·' : mark === TONE_R ? ':' : '';
    out += prefix + composedForm(part satisfies Syllable);
  }
  return out;
}

/** Removes the tone marks U+302E and U+302F. */
export function stripTones(text: string): string {
  return text.replace(/[\u302E\u302F]/g, '');
}
