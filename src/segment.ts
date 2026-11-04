import { fromHanyang, hanyangTables } from './hanyang';
import { decomposeSyllables, joinClusters, LEAD, precompose, TAIL, VOWEL } from './jamo';

/** One Hangul syllable, or a lone jamo, with each part as a single cluster. */
export type Syllable = {
  kind: 'syllable';
  /// Initial consonant (初聲), empty when absent
  lead: string;
  /// Vowel (中聲), empty when absent
  vowel: string;
  /// Final consonant (終聲), empty when absent
  tail: string;
};

/** A run of anything that is not Hangul jamo or syllables. */
export type Other = { kind: 'other'; text: string };

export type Segment = Syllable | Other;

const SYLLABLE = new RegExp(`([${LEAD}]*)([${VOWEL}]*)([${TAIL}]*)`, 'y');
const JAMO = new RegExp(`[${LEAD}${VOWEL}${TAIL}]`);

/**
 * Reads text in any mix of Hanyang PUA, conjoining jamo and modern syllables.
 * Runs of jamo become one syllable as Unicode conjoining rules say, so ᄇ + ᄉ + 가 is ᄡ + ᅡ.
 */
export function segment(text: string): Segment[] {
  const jamo = decomposeSyllables(fromHanyang(text));
  const segments: Segment[] = [];
  let other = '';
  for (let i = 0; i < jamo.length; ) {
    if (!JAMO.test(jamo[i]!)) {
      other += jamo[i];
      i++;
      continue;
    }
    if (other) segments.push({ kind: 'other', text: other });
    other = '';
    SYLLABLE.lastIndex = i;
    const [match, lead, vowel, tail] = SYLLABLE.exec(jamo)! as unknown as [
      string,
      string,
      string,
      string,
    ];
    segments.push({
      kind: 'syllable',
      lead: joinClusters(lead),
      vowel: joinClusters(vowel),
      tail: joinClusters(tail),
    });
    i += match.length;
  }
  if (other) segments.push({ kind: 'other', text: other });
  return segments;
}

/** The syllable in Normalization Form C: precomposed as far as Unicode allows. */
export function composedForm({ lead, vowel, tail }: Syllable): string {
  const first = tail.slice(0, 1);
  const rest = tail.slice(1);
  const closed = precompose(lead, vowel, first);
  if (closed) return closed + rest;
  const open = precompose(lead, vowel, '');
  return open ? open + tail : lead + vowel + tail;
}

/** The syllable as one Hanyang PUA code point or modern syllable, if the table has it. */
export function hanyangForm(syllable: Syllable): string | undefined {
  const { lead, vowel, tail } = syllable;
  return precompose(lead, vowel, tail) ?? hanyangTables().toPua.get(lead + vowel + tail);
}
