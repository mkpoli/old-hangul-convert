import { expect, test } from 'bun:test';
import {
  fromCompatibility,
  fromDotTones,
  fromNaverImages,
  stripTones,
  toCompatibility,
  toComposed,
  toDotTones,
  toJamo,
} from '../src';

test('joins single letters into clusters', () => {
  expect(toComposed('ᄇᄉ가')).toBe('ᄢᅡ');
  expect(toJamo('ᄢᅡ', { clusters: 'single' })).toBe('ᄇᄉ가');
  expect(toComposed('ᄇᄉ가')).toBe('ᄢᅡ');
  expect(toComposed('ᄉ사')).toBe('싸');
});

test('reads the legacy ᆼ spelling of a cluster', () => {
  expect(toComposed('강ᆨ')).toBe('가ᇬ');
  expect(toJamo('ᇬ', { clusters: 'single' })).toBe('ᇰᆨ');
});

test('Naver image tags become the character they draw', () => {
  const html =
    '마<img src="https://ssl.pstatic.net/sstatic/imgfont/NVD14BL0TRNN/ed93_NVD14BL0TRNN.png" class="t_aw" alt=""/>';
  expect(fromNaverImages(html)).toBe('마');
  expect(toComposed(fromNaverImages(html))).toBe('마ᅀᆞᆯ');
  const other = '<img src="/imgfont/X/ac00_X.png"><img src="/a/ed93.png">';
  expect(fromNaverImages(other)).toBe(other);
});

test('compatibility letters read back', () => {
  expect(toCompatibility('ᄉᆞᆯ')).toBe('ㅅㆍㄹ');
  expect(toCompatibility('ᅀᅡ')).toBe('ㅿㅏ');
  expect(fromCompatibility('ㅅㆍㄹ')).toBe('ᄉᆞᆯ');
  expect(fromCompatibility('ㅿㅏ ㅎㆍㄴ')).toBe('ᅀᅡ ᄒᆞᆫ');
  expect(fromCompatibility('ㅅㆍㄹㅁㅏ')).toBe('ᄉᆞᆯ마');
  expect(fromCompatibility('ㅂㅅㄱㅏ')).toBe('ᄢᅡ');
  expect(fromCompatibility('ㅋㅋ 좋아')).toBe('ㅋㅋ 좋아');
});

test('reads 聲點 written with dots', () => {
  expect(fromDotTones('·나랏')).toBe('나〮랏');
  expect(fromDotTones(':말ᄊᆞᆷ')).toBe('말〯ᄊᆞᆷX'.replace('X', ''));
  expect(fromDotTones('나·랏:말')).toBe('나랏〮말〯');
  expect(fromDotTones('나・랏')).toBe('나랏〮');
  expect(fromDotTones('나̇랏̈')).toBe('나〮랏〯');
  expect(fromDotTones('12:30')).toBe('12:30');
});

test('writes 聲點 with dots and strips them', () => {
  expect(toDotTones('나랏〮말〯ᄊᆞ미〮')).toBe('나·랏:말ᄊᆞ·미');
  expect(fromDotTones(toDotTones('나랏〮말〯'))).toBe('나랏〮말〯');
  expect(stripTones('나랏〮말〯')).toBe('나랏말');
});
