const test = require('node:test');
const assert = require('node:assert/strict');
const J = require('../renderer/japanese.js');

test('romaji typing becomes hiragana', () => {
  const k = J.romajiToKana;
  assert.equal(k('konnichiha'), 'こんにちは');
  assert.equal(k('arigatou'), 'ありがとう');
  assert.equal(k('gakkou'), 'がっこう');
  assert.equal(k('shinbun'), 'しんぶん');
  assert.equal(k("kon'ya"), 'こんや');
  assert.equal(k('sensei'), 'せんせい');
  assert.equal(k('kyou'), 'きょう');
  assert.equal(k('jishin'), 'じしん');
  assert.equal(k('nihon'), 'にほん');
  assert.equal(k('rāmen'), 'らあめん');
  assert.equal(k('kōhī'), 'こうひい');
  assert.equal(k('chotto'), 'ちょっと');
  assert.equal(k('tsukue'), 'つくえ');
  assert.equal(k('ohayou gozaimasu'), 'おはよう ございます');
  assert.equal(k('ra-men'), 'らーめん');
  assert.equal(k('nn'), 'ん');
});
test('live typing keeps an unfinished syllable', () => {
  assert.equal(J.toKana('kon'), 'こn');
  assert.equal(J.toKana('konn'), 'こん');
  assert.equal(J.toKana('ka'), 'か');
  assert.equal(J.toKana('sh'), 'sh');
  assert.equal(J.toKana('nihon'), 'にほn');
});
test('hiragana to romaji', () => {
  assert.equal(J.toRomaji('こんにちは'), 'konnichiha');
  assert.equal(J.toRomaji('がっこう'), 'gakkou');
  assert.equal(J.toRomaji('きょう'), 'kyou');
  assert.equal(J.toRomaji('しんぶん'), 'shinbun');
  assert.equal(J.toRomaji('ちょっと'), 'chotto');
  assert.equal(J.toRomaji('ほんや'), "hon'ya");
});
test('normalising: kana script, romaji, spaces and punctuation do not matter', () => {
  assert.equal(J.norm('タベル'), 'たべる');
  assert.equal(J.norm('taberu'), 'たべる');
  assert.equal(J.norm('たべる。'), 'たべる');
  assert.equal(J.norm('たべ る'), 'たべる');
});
test('matching a typed word', () => {
  const w = { ja: '食べる', reading: 'たべる' };
  assert.equal(J.matchWord('食べる', w), 'right');
  assert.equal(J.matchWord('たべる', w), 'reading');
  assert.equal(J.matchWord('taberu', w), 'reading');
  assert.equal(J.matchWord('のむ', w), 'wrong');
  assert.equal(J.matchWord('たべろ', w), 'wrong'); // 3 letters: no typo leeway
  const long = { ja: 'ありがとう', reading: '' };
  assert.equal(J.matchWord('arigatou', long), 'right');
  assert.equal(J.matchWord('ありがと', long), 'close');
  assert.equal(J.matchWord('', long), 'wrong');
});
test('furigana only over the kanji', () => {
  assert.deepEqual(J.ruby('食べる', 'たべる'), [['食', 'た'], ['べる', '']]);
  assert.deepEqual(J.ruby('大きい', 'おおきい'), [['大', 'おお'], ['きい', '']]);
  assert.deepEqual(J.ruby('お金', 'おかね'), [['お', ''], ['金', 'かね']]);
  assert.deepEqual(J.ruby('ありがとう', ''), [['ありがとう', '']]);
  assert.deepEqual(J.ruby('勉強', 'べんきょう'), [['勉強', 'べんきょう']]);
  assert.equal(J.rubyHtml('食べる', 'たべる'), '<ruby>食<rt>た</rt></ruby>べる');
});
test('sentence tokens', () => {
  const s = ['食べます。', 'I eat.', '食べ;たべ;食べる|ます|。'];
  const t = J.tokens(s);
  assert.deepEqual(t[0], { s: '食べ', r: 'たべ', b: '食べる' });
  assert.deepEqual(t[1], { s: 'ます', r: 'ます', b: 'ます' });
  assert.equal(J.sentenceKana(s), 'たべます。');
});
test('verb forms', () => {
  const f = (w, c) => J.verbForms(w, c);
  const taberu = f('食べる', 'v1');
  assert.equal(taberu.masu, '食べます'); assert.equal(taberu.te, '食べて'); assert.equal(taberu.ta, '食べた'); assert.equal(taberu.nai, '食べない'); assert.equal(taberu.potential, '食べられる'); assert.equal(taberu.volitional, '食べよう'); assert.equal(taberu.ba, '食べれば');
  const kaku = f('書く', 'v5k'); assert.equal(kaku.masu, '書きます'); assert.equal(kaku.te, '書いて'); assert.equal(kaku.nai, '書かない'); assert.equal(kaku.potential, '書ける'); assert.equal(kaku.causative, '書かせる'); assert.equal(kaku.imperative, '書け');
  const iku = f('行く', 'v5k-s'); assert.equal(iku.te, '行って'); assert.equal(iku.ta, '行った');
  assert.equal(f('泳ぐ', 'v5g').te, '泳いで'); assert.equal(f('話す', 'v5s').te, '話して'); assert.equal(f('待つ', 'v5t').te, '待って'); assert.equal(f('死ぬ', 'v5n').te, '死んで');
  assert.equal(f('遊ぶ', 'v5b').ta, '遊んだ'); assert.equal(f('飲む', 'v5m').ta, '飲んだ'); assert.equal(f('乗る', 'v5r').te, '乗って');
  const kau = f('買う', 'v5u'); assert.equal(kau.nai, '買わない'); assert.equal(kau.te, '買って'); assert.equal(kau.volitional, '買おう');
  const aru = f('ある', 'v5r-i'); assert.equal(aru.nai, 'ない'); assert.equal(aru.nakatta, 'なかった');
  const suru = f('する', 'vs-i'); assert.equal(suru.masu, 'します'); assert.equal(suru.te, 'して'); assert.equal(suru.nai, 'しない'); assert.equal(suru.potential, 'できる'); assert.equal(suru.passive, 'される');
  const bs = f('勉強する', 'vs-i'); assert.equal(bs.masu, '勉強します'); assert.equal(bs.potential, '勉強できる');
  const kuru = f('来る', 'vk'); assert.equal(kuru.masu, '来ます'); assert.equal(kuru.nai, '来ない'); assert.equal(kuru.te, '来て'); assert.equal(kuru.imperative, '来い');
  const kuru2 = f('くる', 'vk'); assert.equal(kuru2.masu, 'きます'); assert.equal(kuru2.nai, 'こない'); assert.equal(kuru2.potential, 'こられる');
  assert.equal(f('たべる', 'v1').masen, 'たべません');
  assert.equal(f('xx', 'n'), null);
});
test('adjective forms', () => {
  const a = J.adjForms('大きい', 'i'); assert.equal(a.negative, '大きくない'); assert.equal(a.past, '大きかった'); assert.equal(a.te, '大きくて'); assert.equal(a.adverb, '大きく'); assert.equal(a.pastNeg, '大きくなかった');
  const ii = J.adjForms('いい', 'ix'); assert.equal(ii.negative, 'よくない'); assert.equal(ii.past, 'よかった');
  const ii2 = J.adjForms('格好いい', 'ix'); assert.equal(ii2.negative, '格好よくない');
  const na = J.adjForms('静か', 'na'); assert.equal(na.negative, '静かではない'); assert.equal(na.past, '静かだった'); assert.equal(na.adverb, '静かに'); assert.equal(na.noun, '静かな');
});
