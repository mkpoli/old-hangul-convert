import { LEAD_CLUSTERS, TAIL_CLUSTERS, VOWEL_CLUSTERS } from './tables';

const SYLLABLE_BASE = 0xac00;
const LEAD_BASE = 0x1100;
const VOWEL_BASE = 0x1161;
const TAIL_BASE = 0x11a7;
const VOWEL_COUNT = 21;
const TAIL_COUNT = 28;
const SYLLABLE_COUNT = 11172;

export const LEAD = '\\u1100-\\u115F\\uA960-\\uA97C';
export const VOWEL = '\\u1160-\\u11A7\\uD7B0-\\uD7C6';
export const TAIL = '\\u11A8-\\u11FF\\uD7CB-\\uD7FB';

/** Writes a modern syllable as jamo. Other text passes through unchanged, unlike NFD. */
export function decomposeSyllables(text: string): string {
  return text.replace(/[\uAC00-\uD7A3]/g, (char) => {
    const index = char.charCodeAt(0) - SYLLABLE_BASE;
    const tail = index % TAIL_COUNT;
    const rest = (index - tail) / TAIL_COUNT;
    const vowel = rest % VOWEL_COUNT;
    const lead = (rest - vowel) / VOWEL_COUNT;
    return (
      String.fromCharCode(LEAD_BASE + lead, VOWEL_BASE + vowel) +
      (tail ? String.fromCharCode(TAIL_BASE + tail) : '')
    );
  });
}

/** The precomposed syllable for a lead and vowel, and optional tail, if there is one. */
export function precompose(lead: string, vowel: string, tail: string): string | undefined {
  if (lead.length !== 1 || vowel.length !== 1 || tail.length > 1) return undefined;
  const l = lead.charCodeAt(0) - LEAD_BASE;
  const v = vowel.charCodeAt(0) - VOWEL_BASE;
  const t = tail ? tail.charCodeAt(0) - TAIL_BASE : 0;
  if (l < 0 || l >= 19 || v < 0 || v >= VOWEL_COUNT || t < 0 || t >= TAIL_COUNT) return undefined;
  const code = SYLLABLE_BASE + (l * VOWEL_COUNT + v) * TAIL_COUNT + t;
  return code < SYLLABLE_BASE + SYLLABLE_COUNT ? String.fromCharCode(code) : undefined;
}

type Clusters = {
  /** Single letters to cluster, every spelling. */
  compose: Map<string, string>;
  /** Cluster to its current spelling. */
  spell: Map<string, string>;
  longest: number;
};

function parseClusters(table: string): Clusters {
  const compose = new Map<string, string>();
  const spell = new Map<string, string>();
  let longest = 1;
  for (const row of table.split('|')) {
    const cluster = row[0]!;
    const letters = row.slice(1);
    compose.set(letters, cluster);
    if (!spell.has(cluster)) spell.set(cluster, letters);
    longest = Math.max(longest, letters.length);
  }
  return { compose, spell, longest };
}

let clusters: Clusters | undefined;
function allClusters(): Clusters {
  if (!clusters) {
    const parts = [LEAD_CLUSTERS, VOWEL_CLUSTERS, TAIL_CLUSTERS].map(parseClusters);
    clusters = {
      compose: new Map(parts.flatMap((part) => [...part.compose])),
      spell: new Map(parts.flatMap((part) => [...part.spell])),
      longest: Math.max(...parts.map((part) => part.longest)),
    };
  }
  return clusters;
}

/** Spells every cluster in a run of jamo with single letters: ᄢ → ᄇᄉᄀ. */
export function spellOut(run: string): string {
  const { spell } = allClusters();
  let letters = '';
  for (const char of run) letters += spell.get(char) ?? char;
  return letters;
}

/** Joins single letters into clusters, longest first: ᄇᄉᄀ → ᄢ. */
export function joinClusters(run: string): string {
  const { compose, longest } = allClusters();
  const letters = spellOut(run);
  let out = '';
  for (let i = 0; i < letters.length; ) {
    let size = Math.min(longest, letters.length - i);
    let cluster: string | undefined;
    for (; size > 1; size--) {
      cluster = compose.get(letters.slice(i, i + size));
      if (cluster) break;
    }
    out += cluster ?? letters[i];
    i += cluster ? size : 1;
  }
  return out;
}

const LEAD_TO_TAIL_LETTERS = 'ᄀᆨᄂᆫᄃᆮᄅᆯᄆᆷᄇᆸᄉᆺᄋᆼᄌᆽᄎᆾᄏᆿᄐᇀᄑᇁᄒᇂᅀᇫᅌᇰᅙᇹ';
const TAIL_OF = new Map<string, string>();
const LEAD_OF = new Map<string, string>();
for (let i = 0; i < LEAD_TO_TAIL_LETTERS.length; i += 2) {
  TAIL_OF.set(LEAD_TO_TAIL_LETTERS[i]!, LEAD_TO_TAIL_LETTERS[i + 1]!);
  LEAD_OF.set(LEAD_TO_TAIL_LETTERS[i + 1]!, LEAD_TO_TAIL_LETTERS[i]!);
}

/** The same consonants as a lead (ᇫ → ᅀ), or undefined if a letter has no lead form. */
export function tailToLead(tail: string): string | undefined {
  let letters = '';
  for (const char of spellOut(tail)) {
    const lead = LEAD_OF.get(char);
    if (!lead) return undefined;
    letters += lead;
  }
  return joinClusters(letters);
}

/** The same consonants as a tail (ᅀ → ᇫ), or undefined if a letter has no tail form. */
export function leadToTail(lead: string): string | undefined {
  let letters = '';
  for (const char of spellOut(lead)) {
    const tail = TAIL_OF.get(char);
    if (!tail) return undefined;
    letters += tail;
  }
  return joinClusters(letters);
}
