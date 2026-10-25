const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'), path = require('path');
const J = require('../renderer/japanese.js');
const G = require('../renderer/geodata.js');
const MAPS = require('../renderer/mapdata.js');

test('bonus lessons: every country has a flag and a place on the world map, every kanji name a reading', () => {
  assert.equal(G.WORLD.length, 195); assert.equal(G.PREFECTURES.length, 47);
  const world = new Set(MAPS.world.shapes.map((s) => s[0]).concat(Object.keys(MAPS.world.pts)));
  for (const c of G.WORLD) {
    assert.ok(fs.existsSync(path.join(__dirname, '..', 'renderer', 'flags', c.id + '.svg')), 'flag for ' + c.id);
    assert.ok(world.has(c.id), 'world map has ' + c.id);
  }
  for (const it of [...G.WORLD, ...G.PREFECTURES, ...G.JAPAN_PLACES]) for (const [w, r] of [[it.name, it.rd], [it.cap, it.capRd]]) {
    if (w && J.hasKanji(w)) assert.ok(r, 'reading for ' + w);
    if (r) assert.ok(J.ruby(w, r).every(([t, rt]) => !J.hasKanji(t) || rt), 'furigana fits ' + w);
  }
});

test('bonus lessons: the Japan map has every prefecture and place', () => {
  const ids = new Set(MAPS.japan.shapes.map((s) => s[0]));
  for (const p of G.PREFECTURES) assert.ok(ids.has(p.id), 'prefecture ' + p.id);
  for (const p of G.JAPAN_PLACES) assert.ok(MAPS.japan.feat[p.id], 'place ' + p.id);
});

test('bonus lessons: answers in kana, kanji or romaji count; English is told apart', () => {
  const de = G.WORLD.find((c) => c.id === 'de'), cn = G.WORLD.find((c) => c.id === 'cn'), it = G.WORLD.find((c) => c.id === 'it');
  assert.equal(G.geoJudge('doitsu', de, 'name'), 'right');
  assert.equal(G.geoJudge('ドイツ', de, 'name'), 'right');
  assert.equal(G.geoJudge('Germany', de, 'name'), 'english');
  assert.equal(G.geoJudge('ちゅうごく', cn, 'name'), 'right');
  assert.equal(G.geoJudge('北京', cn, 'cap'), 'right');
  assert.equal(G.geoJudge('pekin', cn, 'cap'), 'right');
  assert.equal(G.geoJudge('roma', it, 'cap'), 'close'); // ローマ without the long ー
  assert.equal(G.geoJudge('paris', it, 'cap'), 'wrong');
  const aomori = G.PREFECTURES.find((p) => p.id === '02'), tokyo = G.PREFECTURES.find((p) => p.id === '13');
  for (const t of ['aomori', '青森', '青森県', 'あおもりけん']) assert.equal(G.geoJudge(t, aomori, 'name'), 'right', t);
  assert.equal(G.geoJudge('shinjuku', tokyo, 'cap'), 'right');
  assert.equal(G.geoJudge('sapporoshi', G.PREFECTURES[0], 'cap'), 'right');
});
