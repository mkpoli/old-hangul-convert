import { hanyangTables } from './hanyang';
import { composedForm, hanyangForm, segment } from './segment';

const CONJOINING = /[ᄀ-ᇿꥠ-ꥼힰ-ퟆퟋ-ퟻ]/;
const COMPATIBILITY = /[ㄱ-ㆎﾠ-ﾾￂ-ￇￊ-ￏￒ-ￗￚ-ￜ]/;

/** What a text is written with. Each count is in characters unless it says syllables. */
export type Analysis = {
  /// Hanyang PUA code points standing for a whole syllable
  hanyangSyllables: number;
  /// Hanyang PUA code points standing for one jamo
  hanyangJamo: number;
  /// Conjoining jamo (U+1100–U+11FF, U+A960–U+A97C, U+D7B0–U+D7C6, U+D7CB–U+D7FB)
  conjoiningJamo: number;
  /// Precomposed modern syllables (U+AC00–U+D7A3)
  precomposed: number;
  /// Compatibility letters, full and half width
  compatibility: number;
  /// Tone marks U+302E and U+302F
  toneMarks: number;
  /// 구결자 in the Hanyang convention (U+F67E–U+F77C), which no Unicode block holds
  gugyeol: number;
  /// Private-use characters outside the table and the 구결자 range. Not decoded.
  otherPua: string[];
  /// Syllables with no modern form
  oldSyllables: number;
  /// Old syllables with no Hanyang PUA code point, in NFC, without repeats
  missingFromHanyang: string[];
};

export function analyze(text: string): Analysis {
  const { toJamo } = hanyangTables();
  const analysis: Analysis = {
    hanyangSyllables: 0,
    hanyangJamo: 0,
    conjoiningJamo: 0,
    precomposed: 0,
    compatibility: 0,
    toneMarks: 0,
    gugyeol: 0,
    otherPua: [],
    oldSyllables: 0,
    missingFromHanyang: [],
  };
  const otherPua = new Set<string>();
  for (const char of text) {
    const code = char.codePointAt(0)!;
    if ((code >= 0xe000 && code <= 0xf8ff) || code >= 0xf0000) {
      if (toJamo.has(char)) {
        if (code >= 0xf784) analysis.hanyangJamo++;
        else analysis.hanyangSyllables++;
      } else if (code >= 0xf67e && code <= 0xf77c) analysis.gugyeol++;
      else otherPua.add(char);
    } else if (CONJOINING.test(char)) analysis.conjoiningJamo++;
    else if (code >= 0xac00 && code <= 0xd7a3) analysis.precomposed++;
    else if (COMPATIBILITY.test(char)) analysis.compatibility++;
    else if (code === 0x302e || code === 0x302f) analysis.toneMarks++;
  }
  const missing = new Set<string>();
  for (const part of segment(text)) {
    if (part.kind !== 'syllable') continue;
    const form = hanyangForm(part);
    if (form && form >= '\uAC00' && form <= '\uD7A3') continue;
    analysis.oldSyllables++;
    if (!form) missing.add(composedForm(part));
  }
  analysis.otherPua = [...otherPua];
  analysis.missingFromHanyang = [...missing];
  return analysis;
}
