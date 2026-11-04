import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { analyze, fromHanyang, segment, toComposed, toHanyang, toJamo } from '../src';

function table(name: string): Map<string, string> {
  const rows = new Map<string, string>();
  for (const raw of readFileSync(new URL(`../data/${name}`, import.meta.url), 'utf8').split('\n')) {
    const line = raw.split('%')[0]!.trim();
    if (!line) continue;
    const [from, to] = line.split('=>') as [string, string];
    const chars = (side: string) =>
      side
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((code) => String.fromCodePoint(Number.parseInt(code.slice(2), 16)))
        .join('');
    rows.set(chars(from), chars(to));
  }
  return rows;
}

const composed = table('hypua2jamocomposed.txt');
const single = table('hypua2jamodecomposed.txt');
const SHARED = '';

test('reads every code point as the KTUG table says', () => {
  expect(composed.size).toBe(5661);
  for (const [pua, jamo] of composed) expect(toJamo(pua)).toBe(jamo);
});

test('spells clusters letter by letter as the decomposed KTUG table says', () => {
  // That table keeps ᄽ and ᄿ whole, though the KTUG composition map has both as doubled letters.
  const doubled = (jamo: string) => jamo.replaceAll('\u113D', '\u113C\u113C').replaceAll('\u113F', '\u113E\u113E');
  for (const [pua, jamo] of single) expect(toJamo(pua, { clusters: 'single' })).toBe(doubled(jamo));
});

test('round-trips every code point but the lower-numbered twin of a shared form', () => {
  for (const [pua, jamo] of composed) {
    if (!jamo) continue;
    if (SHARED.includes(pua)) {
      expect(toHanyang(jamo)).not.toBe(pua);
      expect(toJamo(toHanyang(jamo))).toBe(jamo);
    } else {
      expect(toHanyang(jamo)).toBe(pua);
    }
  }
});

test('fromHanyang changes PUA and nothing else', () => {
  expect(fromHanyang('\uE560\uED96')).toBe('\u1106\u119E\u1140\u119E\u11B6');
  const untouched = '\u1100\u1161 한글 \uF67E\uE001 e\u0301 \uF900';
  expect(fromHanyang(untouched)).toBe(untouched);
  expect(fromHanyang(`${untouched}\uE560${untouched}`)).toBe(`${untouched}\u1106\u119E${untouched}`);
  expect(fromHanyang('A\uF86AB')).toBe('AB');
  for (const [pua, jamo] of composed) expect(fromHanyang(pua)).toBe(jamo);
  expect(fromHanyang(toHanyang('\u1106\u119E\u1140\u119E\u11B6'))).toBe('\u1106\u119E\u1140\u119E\u11B6');
});

test('reads the opening of the Hunminjeongeum Eonhae in PUA', () => {
  // U+EBD4 is the example in the hypua2jamo documentation.
  expect(toComposed('나랏〮말〯미〮')).toBe('나랏〮말〯ᄊᆞ미〮');
});

test('reads the forms on Wooriimalsaem and ITKC', () => {
  // U+E560 U+ED96 and U+E560 U+ED93, 우리말샘 sense 514519.
  expect(toComposed('')).toBe('ᄆᆞᅀᆞᆶ');
  expect(toComposed('')).toBe('ᄆᆞᅀᆞᆯ');
});

test('keeps a mix of PUA and jamo apart only by syllable', () => {
  const pua = '마 ᄆᆞᅀᆞᆯ';
  expect(toComposed(pua)).toBe('마ᅀᆞᆯ ᄆᆞᅀᆞᆯ');
});

test('leaves other private-use characters and all other text alone', () => {
  const text = 'é 豈 😀  abc';
  expect(toComposed(text)).toBe(text);
  expect(toHanyang(text)).toBe(text);
  expect(toJamo(text)).toBe(text);
});

test('matches Unicode normalization on Hangul', () => {
  const text = 'ᄒᆞᆫ가ᇫ 한글 각';
  expect(toComposed(text)).toBe(text.normalize('NFC'));
  expect(toJamo('한글').normalize('NFC')).toBe('한글');
  const twoTails = '\u1100\u1161\u11A8\u11B7';
  expect(toComposed(twoTails)).toBe(twoTails.normalize('NFC'));
});

test('writes a syllable outside the table by the chosen fallback', () => {
  const rare = 'ᄒᆞᇫᆯ';
  expect(segment(rare)).toHaveLength(1);
  const jamo = toJamo(rare);
  expect(toHanyang(rare)).toBe(jamo);
  const spelled = toHanyang(rare, { unmapped: 'jamo' });
  expect(spelled).not.toBe(jamo);
  for (const char of spelled) expect(composed.has(char)).toBe(true);
  expect(toJamo(spelled)).toBe(jamo);
});

test('analyze tells representations apart', () => {
  const report = analyze('마 ᄒᆞᆫ〮 ㅋ ');
  expect(report.hanyangSyllables).toBe(1);
  expect(report.conjoiningJamo).toBe(3);
  expect(report.precomposed).toBe(1);
  expect(report.compatibility).toBe(1);
  expect(report.toneMarks).toBe(1);
  expect(report.gugyeol).toBe(1);
  expect(report.otherPua).toEqual(['']);
  expect(report.oldSyllables).toBe(2);
  expect(analyze('\u{F0000}').otherPua).toEqual(['\u{F0000}']);
  expect(analyze('\uD7C7\uFFBF\uFFA0')).toMatchObject({ conjoiningJamo: 0, compatibility: 1 });
});
