import { hanyangTables } from './hanyang';
import { spellOut, tailToLead } from './jamo';
import { composedForm, hanyangForm, type Segment, segment, type Syllable } from './segment';

const mapSegments = (text: string, write: (syllable: Syllable) => string): string =>
  segment(text)
    .map((part: Segment) => (part.kind === 'other' ? part.text : write(part)))
    .join('');

/**
 * Standard Unicode text in Normalization Form C: modern syllables precomposed, old
 * syllables as conjoining jamo with each cluster in one code point.
 */
export function toComposed(text: string): string {
  return mapSegments(text, composedForm);
}

export type JamoOptions = {
  /** `single` spells clusters letter by letter (ᄢ → ᄇᄉᄀ). Default `cluster`. */
  clusters?: 'cluster' | 'single';
};

/** Conjoining jamo for every syllable, modern ones too. */
export function toJamo(text: string, { clusters = 'cluster' }: JamoOptions = {}): string {
  return mapSegments(text, ({ lead, vowel, tail }) =>
    clusters === 'single' ? spellOut(lead + vowel + tail) : lead + vowel + tail,
  );
}

export type HanyangOptions = {
  /**
   * What to write for a syllable with no code point of its own. `keep` leaves it as
   * standard conjoining jamo. `jamo` spells it with the table's PUA jamo (U+F785–U+F8F7),
   * which only Hanyang fonts can join. Default `keep`.
   */
  unmapped?: 'keep' | 'jamo';
};

/** Hanyang PUA for old syllables. Modern syllables stay as they are in Unicode. */
export function toHanyang(text: string, { unmapped = 'keep' }: HanyangOptions = {}): string {
  const { toPua } = hanyangTables();
  return mapSegments(text, (syllable) => {
    const whole = hanyangForm(syllable);
    if (whole) return whole;
    if (unmapped === 'keep') return composedForm(syllable);
    const { lead, vowel, tail } = syllable;
    return [...lead, ...vowel, ...tail].map((char) => toPua.get(char) ?? char).join('');
  });
}

let compatOf: Map<string, string> | undefined;
function compatLetters(): Map<string, string> {
  if (!compatOf) {
    compatOf = new Map();
    for (let code = 0x3131; code <= 0x318e; code++) {
      const char = String.fromCharCode(code);
      const jamo = char.normalize('NFKD');
      if (jamo !== char && jamo.length === 1 && !compatOf.has(jamo)) compatOf.set(jamo, char);
    }
  }
  return compatOf;
}

function compatLetter(jamo: string): string {
  const letters = compatLetters();
  const whole = letters.get(jamo);
  if (whole) return whole;
  return [...spellOut(jamo)].map((char) => letters.get(char) ?? char).join('');
}

/**
 * Compatibility letters written side by side: ᄉᆞᆯ → ㅅㆍㄹ. Readable in any font, but
 * syllable boundaries are lost, and a letter outside the compatibility block stays a jamo.
 */
export function toCompatibility(text: string): string {
  return mapSegments(text, ({ lead, vowel, tail }) => {
    const coda = tail && !compatLetters().has(tail) ? (tailToLead(tail) ?? tail) : tail;
    return [lead, vowel, coda]
      .filter((part) => part && part !== '\u115F' && part !== '\u1160')
      .map(compatLetter)
      .join('');
  });
}
