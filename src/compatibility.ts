import { toComposed } from './convert';
import { joinClusters, leadToTail, spellOut, tailToLead } from './jamo';

const COMPAT_RUN = /[ㄱ-ㆎﾡ-ￜ]+/g;
const VOWEL = /[ᅠ-ᆧힰ-ퟆ]/;

/** NFKD gives ㄳ as the final ᆪ, which has to become two consonants before it can be split. */
function readLetter(char: string): string {
  const jamo = char.normalize('NFKD');
  return tailToLead(jamo) ?? jamo;
}

const isOneCluster = (run: string) => joinClusters(run).length === 1;

/**
 * Splits the consonants between two vowels. The next syllable takes as few letters as
 * leaves a valid final: ㄹㅁ → ᆯ + ᄆ, ㅂㅅㄱ → ᆸ + ᄭ when ᆹ is not wanted is unknowable, so ᆹ + ᄀ.
 */
function splitConsonants(consonants: string): [tail: string, lead: string] {
  const letters = spellOut(consonants);
  for (let size = 1; size < letters.length; size++) {
    const tail = leadToTail(letters.slice(0, -size));
    const lead = letters.slice(-size);
    if (tail && tail.length === 1 && isOneCluster(lead)) return [tail, joinClusters(lead)];
  }
  return ['', joinClusters(letters)];
}

function readRun(run: string): string {
  const letters = [...run].map(readLetter);
  if (!letters.some((letter) => VOWEL.test(letter))) return run;
  let out = '';
  let consonants = '';
  let afterVowel = false;
  for (const letter of letters) {
    if (!VOWEL.test(letter)) {
      consonants += letter;
      continue;
    }
    if (consonants) {
      const [tail, lead] = afterVowel ? splitConsonants(consonants) : ['', joinClusters(consonants)];
      out += tail + lead;
      consonants = '';
    }
    out += letter;
    afterVowel = true;
  }
  if (consonants) out += leadToTail(consonants) ?? consonants;
  return toComposed(out);
}

/**
 * Reads old Hangul spelled with compatibility letters: ㅅㆍㄹ → ᄉᆞᆯ. Runs with no vowel,
 * such as ㅋㅋ, stay. The spelling records no syllable boundaries, so consonants between
 * two vowels are split by a best guess. Call this only on text known to be spelled this way.
 */
export function fromCompatibility(text: string): string {
  return text.replace(COMPAT_RUN, readRun);
}
