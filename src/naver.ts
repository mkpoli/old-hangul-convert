import { hanyangTables } from './hanyang';

const IMAGE_TAG = /<img\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi;
const SOURCE = /\ssrc\s*=\s*(?:"([^"]*)"|'([^']*)')/i;
const IMAGE_FONT = /^(?:https?:)?\/\/[^/]*\bpstatic\.net\/[^"']*\/imgfont\/[^/]+\/([0-9a-f]{4})_[^/]*$/i;

/**
 * Replaces Naver Dictionary's image-font tags with the Hanyang PUA character each one
 * draws. Its file names are Hanyang code points: `imgfont/NVD14BL0TRNN/ed93_NVD14BL0TRNN.png`
 * is U+ED93. Other images stay, as does a tag whose name is not in the table.
 */
export function fromNaverImages(html: string): string {
  const { toJamo } = hanyangTables();
  return html.replace(IMAGE_TAG, (tag) => {
    const source = SOURCE.exec(tag);
    const hex = IMAGE_FONT.exec(source?.[1] ?? source?.[2] ?? '')?.[1];
    if (!hex) return tag;
    const char = String.fromCharCode(Number.parseInt(hex, 16));
    return toJamo.has(char) ? char : tag;
  });
}
