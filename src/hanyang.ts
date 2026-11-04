import { HANYANG } from './tables';

const JAMO_PATTERN = /([\uE000-\uF8FF])([^\uE000-\uF8FF]*)/g;

type Tables = {
  toJamo: Map<string, string>;
  toPua: Map<string, string>;
};

let tables: Tables | undefined;

/** The Hanyang PUA table. Where two code points share jamo, the lower one is written. */
export function hanyangTables(): Tables {
  if (!tables) {
    const toJamo = new Map<string, string>();
    const toPua = new Map<string, string>();
    for (const [, pua, jamo] of HANYANG.matchAll(JAMO_PATTERN)) {
      toJamo.set(pua!, jamo!);
      if (jamo && !toPua.has(jamo)) toPua.set(jamo, pua!);
    }
    tables = { toJamo, toPua };
  }
  return tables;
}

/** Replaces Hanyang PUA with conjoining jamo. Other private-use characters stay. */
export function decodeHanyang(text: string): string {
  if (!/[\uE000-\uF8FF]/.test(text)) return text;
  const { toJamo } = hanyangTables();
  return text.replace(/[\uE000-\uF8FF]/g, (char) => toJamo.get(char) ?? char);
}
