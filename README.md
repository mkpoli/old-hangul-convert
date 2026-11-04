# old-hangul-convert

Converts old Hangul (옛한글) between the ways Korean text and websites store it.

A web interface is available at [hangul.mkpo.li](https://hangul.mkpo.li).

## Usage

```sh
npm install old-hangul-convert
```

```ts
import { fromNaverImages, toComposed, toHanyang } from 'old-hangul-convert';

toComposed(''); // 'ᄆᆞᅀᆞᆶ', PUA from 우리말샘 to standard Unicode
toHanyang('ᄆᆞᅀᆞᆶ'); // '', back for a document or font that needs PUA
toComposed(fromNaverImages(html)); // Naver Dictionary's image glyphs to text
```

`to*` functions read any mix of Hanyang PUA, conjoining jamo and modern syllables, so a string needs no declared source format. Text that is not Hangul passes through unchanged. The package is ESM only.

| Function | Writes | Example |
|---|---|---|
| `toComposed` | Standard Unicode: NFC, one code point per cluster | ᄉᆞᆯ, 한 |
| `toJamo` | Conjoining jamo for every syllable. `{ clusters: 'single' }` spells ᄢ as ᄇᄉᄀ | ᄒᆞᆫ, 한 (U+1112 U+1161 U+11AB) |
| `toHanyang` | Hanyang PUA (U+E0BC–U+F8F7) for old syllables | U+E560 U+ED96 |
| `toCompatibility` | Compatibility letters side by side. Lossy: syllable boundaries disappear | ㅅㆍㄹ |
| `toDotTones` | 聲點 as `·` and `:` before the syllable | ·나랏 |

`from*` functions read spellings that can't be told apart from ordinary text, so you call them only on text you know uses that spelling. They can feed a `to*` function.

| Function | Reads | Example |
|---|---|---|
| `fromNaverImages` | `<img>` tags of Naver's image font, into PUA | `…/imgfont/NVD14BL0TRNN/ed93_NVD14BL0TRNN.png` → U+ED93 |
| `fromCompatibility` | Compatibility letters. Consonants between two vowels are split by a best guess | ㅅㆍㄹ → ᄉᆞᆯ |
| `fromDotTones` | 聲點 as `·` or `:` before the syllable, or a combining dot or diaeresis after it | ·나랏 → 나〮랏 |

`stripTones` removes U+302E and U+302F. `segment` splits text into syllables. `analyze` counts what a text is written with, and lists the private-use characters it could not decode and the syllables Hanyang PUA has no code point for.

## Limits

- **Hanyang PUA holds 5,299 syllables.** `toHanyang` leaves any other syllable as standard jamo. `{ unmapped: 'jamo' }` spells it with the table's PUA jamo instead, which a font has to join itself.
- **Eleven forms have two code points.** Examples are U+E0E5 and U+E0E7. Both read correctly, and the lower one is written, so these eleven do not round-trip byte for byte.
- **구결자 and other PUA stay as they are.** 구결자 at U+F67E–U+F77C have no Unicode equivalent. The Jeju font's syllables at U+E001–U+E0A0 are a separate scheme with no table here. `analyze` reports both.
- **Naver images only go one way.** Naver doesn't serve every code point: U+F66E and U+F8F7 returned 404, so writing image tags would leave broken images, and it would hot-link another site's files.
- **Images from other sites are not read.** `fromNaverImages` only accepts `pstatic.net` addresses, since only Naver's file names are known to hold the code point.

## What sites use

Checked by reading page source on 2026-11-04, one or two entries per site. This is a sample.

| Site | Observed |
|---|---|
| Naver 국어사전 | Three forms for one entry: image glyphs in search results, raw PUA in the entry page, jamo in quoted text. Webfont `NanumBarunGothic-YetHangul` covers U+E000–F8FF |
| 우리말샘 | Raw PUA, no webfont |
| 표준국어대사전 | Its script allows the PUA range U+E0D2–U+F66E in headwords. Entry markup not seen |
| 한국고전종합DB | PUA and jamo in the same result |
| 한국민족문화대백과 | Jamo, in one article |
| Korean Wikipedia and Wikisource | Jamo, with PUA available through `틀:한양` |

Every PUA character seen decoded with the Hanyang table. No site was found using another table.

## Tables

`data/` holds the tables as published, and `bun run tables` generates `src/tables.ts` from them.

The Hanyang table reads the same as hypua2jamo 0.7 for all 5,661 code points. The decomposed table differs from `toJamo(…, { clusters: 'single' })` in one way: it keeps ᄽ and ᄿ whole, though the composition map has both as doubled letters.

## References

- Korean TeX Users Group (KTUG), [Hanyang PUA Table Project](https://web.archive.org/web/2016/http://faq.ktug.or.kr/faq/HanyangPuaTableProject): `hypua2jamocomposed.txt` and `hypua2jamodecomposed.txt`, rev. 1.12, 2011, public domain by their own header. The project's site is down, so the link is an archive.
- Dohyun Kim, `jamocompose.map`, rev. 1.2, 2010, public domain by its own header. Both tables were taken from the `data/` directory of [mete0r/hypua2jamo](https://github.com/mete0r/hypua2jamo).
- mete0r, [hypua2jamo](https://github.com/mete0r/hypua2jamo) 0.7, LGPL-3.0-or-later. Used only as a check. None of its code is included.
- Wikipedia contributors, [옛한글](https://ko.wikipedia.org/wiki/%EC%98%9B%ED%95%9C%EA%B8%80), read 2026-11-04: the layout of the Hanyang range, the 구결자 range and the Jeju range. Community-edited, and the only source here for the Jeju range.
- Pages read for the survey, 2026-11-04: [Naver 국어사전](https://ko.dict.naver.com/#/entry/koko/819f39ce714c47b08da9e45a61253a0b/historyInfo), [우리말샘](https://opendict.korean.go.kr/dictionary/view?sense_no=514519&viewType=confirm), [표준국어대사전](https://stdict.korean.go.kr/search/searchView.do), [한국고전종합DB](https://db.itkc.or.kr/search/group?q=query%E2%80%A0%E1%84%92%E1%86%9E), [한국민족문화대백과](https://encykorea.aks.ac.kr/Article/E0001089), [Wikisource 훈민정음](https://ko.wikisource.org/wiki/%ED%9B%88%EB%AF%BC%EC%A0%95%EC%9D%8C). The Naver and 표준국어대사전 links need a browser session to show the same content.

## License

Code is MIT. The tables in `data/` are public domain.
