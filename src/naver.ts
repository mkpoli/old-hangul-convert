import { hanyangTables } from './hanyang';

const IMAGE_FONT = /<img\b[^>]*?\bsrc\s*=\s*["'][^"']*\/imgfont\/[^/"']+\/([0-9a-fA-F]{4})_[^"']*["'][^>]*>/gi;

/**
 * Replaces Naver Dictionary's image-font tags with the Hanyang PUA character each one
 * draws. Its file names are Hanyang code points: `imgfont/NVD14BL0TRNN/ed93_NVD14BL0TRNN.png`
 * is U+ED93. A tag whose name is not in the table stays.
 */
export function fromNaverImages(html: string): string {
  const { toJamo } = hanyangTables();
  return html.replace(IMAGE_FONT, (tag, hex: string) => {
    const char = String.fromCharCode(Number.parseInt(hex, 16));
    return toJamo.has(char) ? char : tag;
  });
}
