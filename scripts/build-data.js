// Builds data/dict.js, data/freq.js and data/sentences.js from three downloaded sources (see data/README.md):
//   node scripts/build-data.js <folder with jmdict-eng-common-*.json, ja_50k.txt and jpn.txt>
//   jmdict-eng-common-*.json  JMdict (common words), https://github.com/scriptin/jmdict-simplified/releases (jmdict-eng-common-*.json.zip)
//   ja_50k.txt                OpenSubtitles Japanese frequency list, hermitdave/FrequencyWords (content/2016/ja/ja_50k.txt)
//   jpn.txt                   Tatoeba Japanese-English pairs, https://www.manythings.org/anki/jpn-eng.zip
const fs = require('fs'), path = require('path');
const dir = process.argv[2]; if (!dir) { console.error('usage: node scripts/build-data.js <download folder>'); process.exit(1); }
const out = path.join(__dirname, '..', 'data');
const file = (re) => { const f = fs.readdirSync(dir).find((x) => re.test(x)); if (!f) throw new Error('missing ' + re + ' in ' + dir); return path.join(dir, f); };

// ---------- dictionary ----------
// entry: [word, type, reading, forms, meanings]
//   word      the usual spelling (kanji if the word is normally written with kanji, otherwise kana)
//   reading   the kana reading when the word has kanji, else ''
//   forms     verbs: JMdict class + vt/vi (v1 ichidan, v5k godan -ku ... vs-i suru, vk kuru); suru-nouns: 'vs'; adjectives: 'i' | 'na' | 'ix'; else ''
const TYPE = [[/^v(1|5|k|s-i|s-s|s-c|z|r)/, 'v'], [/^adj-(i|ix)$/, 'a'], [/^adj-(na|no|t|f)$/, 'a'], [/^adv/, 'd'], [/^prt$/, 'p'], [/^conj$/, 'c'], [/^pn$/, 'r'], [/^adj-pn$/, 'e'], [/^int$/, 'i'], [/^(num|ctr)$/, 'u'], [/^(suf|n-suf|pref|n-pref)$/, 'x'], [/^exp$/, 'h'], [/^aux/, 'x'], [/^cop$/, 'x'], [/^n(-adv|-t)?$/, 'n']];
const typeOf = (poss) => { for (const [re, t] of TYPE) if (poss.some((p) => re.test(p))) return t; return ''; };
const hasKanji = (s) => /[一-鿿々]/.test(s);
const clean = (g) => g.replace(/\s*\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
const meanings = (w) => {
  const res = [];
  for (const s of w.sense) {
    if ((s.misc || []).some((m) => ['obs', 'arch', 'rare', 'sl', 'vulg', 'derog', 'col', 'obsc'].includes(m)) && w.sense.length > 1) continue;
    for (const g of s.gloss.slice(0, 2)) { const c = clean(g.text); if (c && c.length <= 50 && !res.includes(c)) res.push(c); if (res.length >= 3) break; }
    if (res.length >= 3) break;
  }
  return res;
};
const jm = JSON.parse(fs.readFileSync(file(/^jmdict.*\.json$/), 'utf8'));
const entries = [];
for (const w of jm.words) {
  const poss = [...new Set(w.sense.flatMap((s) => s.partOfSpeech))], type = typeOf(poss);
  const m = meanings(w); if (!m.length) continue;
  const kanji = (w.kanji || []).find((k) => k.common && !(k.tags || []).some((t) => ['rK', 'sK', 'iK', 'oK'].includes(t))) || (w.kanji || []).find((k) => !(k.tags || []).some((t) => ['rK', 'sK', 'iK', 'oK', 'ateji'].includes(t)));
  const kana = (w.kana || []).find((k) => k.common && !(k.tags || []).includes('sk')) || w.kana[0]; if (!kana) continue;
  // words usually written in kana alone (uk) are listed in kana
  const usuallyKana = (w.sense[0].misc || []).includes('uk') || !kanji;
  const word = usuallyKana ? kana.text : kanji.text, reading = hasKanji(word) ? kana.text : '';
  if (word.length > 14) continue;
  let forms = '';
  if (type === 'v') { const cls = poss.find((p) => /^v(1|5|k|s-i|s-s|s-c|z|r)/.test(p)) || ''; forms = [cls, poss.includes('vt') ? 'vt' : poss.includes('vi') ? 'vi' : ''].filter(Boolean).join(','); }
  else if (type === 'a') forms = poss.includes('adj-ix') ? 'ix' : poss.includes('adj-i') ? 'i' : 'na';
  else if (type === 'n' && poss.some((p) => /^vs(-s|-i)?$/.test(p))) forms = 'vs';
  entries.push([word, type || 'h', reading, forms, m.join('; '), w.kana.some((k) => k.common) ? 1 : 0]);
}
// the same spelling and type once: merge meanings
const seen = new Map(), dict = [];
for (const e of entries) {
  const k = e[0] + '|' + e[1] + '|' + e[2], prev = seen.get(k);
  if (prev) prev[4] = (prev[4] + '; ' + e[4]).split('; ').filter((x, i, a) => a.indexOf(x) === i).slice(0, 3).join('; ');
  else { seen.set(k, e); dict.push(e); }
}
dict.sort((a, b) => (a[2] || a[0]).localeCompare(b[2] || b[0], 'ja'));
const rows = dict.map((e) => e.slice(0, 5));
fs.writeFileSync(path.join(out, 'dict.js'), '// Japanese dictionary from JMdict (common words), via jmdict-simplified. EDRDG licence, CC BY-SA 4.0. [word, type, reading, forms, meanings]\n// type: n noun, v verb, a adjective, d adverb, p particle, c conjunction, r pronoun, e pre-noun adjective, i interjection, u number/counter, x suffix/prefix/auxiliary, h expression\n// reading: the kana reading when the word is written with kanji\n// forms: verbs "class,vt|vi" (v1 ichidan, v5k godan, vs-i suru, vk kuru...) | nouns "vs" (can take する) | adjectives "i", "ix" (いい) or "na"\nvar DICT = ' + JSON.stringify(rows) + ';\n');

// ---------- frequency list: common words, as dictionary base forms ----------
const byWord = new Map();
for (const e of dict) { for (const k of [e[0]]) { const cur = byWord.get(k); if (!cur || (e[5] > cur[5])) byWord.set(k, e); } }
const freq = [], used = new Set();
const lines = fs.readFileSync(file(/^ja_50k/), 'utf8').split(/\r?\n/);
lines.forEach((line, i) => {
  const w = line.split(' ')[0]; if (!w || freq.length >= 6000) return;
  const e = byWord.get(w); if (!e || used.has(e[0] + e[2]) || e[1] === 'h' || e[1] === 'x' || w.length < 1) return;
  if (!hasKanji(e[0]) && [...e[0]].length < 2) return; // single kana are particles and endings
  used.add(e[0] + e[2]); freq.push([e[0], e[4].split('; ').slice(0, 2).join('; '), freq.length + 1, e[2], e[1]]); // rank = place among the common words
});
fs.writeFileSync(path.join(out, 'freq.js'), '// Japanese words by how common they are (OpenSubtitles frequency list), matched to JMdict common words. [word, meaning, rank, reading, type]\nvar FREQ = ' + JSON.stringify(freq) + ';\n');


// ---------- sentences: short ones only, each split into words with readings (kuromoji, a dev dependency) ----------
// [japanese, english, words]  words are joined by "|"; a word is "surface" (kana, nothing to add) or "surface;reading;basicForm":
// reading in hiragana (left empty when it equals the surface), basicForm = the dictionary form of a content word (left out otherwise).
const kuromoji = require('kuromoji');
const kata2hira = (s) => s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
const sen = [], dup = new Set();
for (const line of fs.readFileSync(file(/^jpn\.txt$/), 'utf8').split(/\r?\n/)) {
  const [en, ja] = line.split('\t'); if (!en || !ja) continue;
  const n = [...ja].length;
  if (n < 4 || n > 32 || en.length > 90 || dup.has(ja)) continue;
  dup.add(ja); sen.push([ja, en]);
}
sen.sort((a, b) => a[0].length - b[0].length);
const keep = sen.slice(0, 50000);
kuromoji.builder({ dicPath: path.join(__dirname, '..', 'node_modules', 'kuromoji', 'dict') }).build((err, tk) => {
  if (err) throw err;
  const CONTENT = ['名詞', '動詞', '形容詞', '副詞', '連体詞', '感動詞'];
  const rows = keep.map(([ja, en]) => {
    const toks = tk.tokenize(ja).map((t) => {
      const sf = t.surface_form, rd = t.reading && t.reading !== '*' ? kata2hira(t.reading) : sf;
      const content = CONTENT.includes(t.pos) && t.pos_detail_1 !== '非自立' && t.pos_detail_1 !== '接尾' && t.pos_detail_1 !== '数';
      const basic = content && t.basic_form && t.basic_form !== '*' && t.basic_form !== sf ? t.basic_form : '';
      return rd === sf && !basic ? sf : sf + ';' + (rd === sf ? '' : rd) + (basic ? ';' + basic : '');
    });
    return [ja, en, toks.join('|')];
  });
  fs.writeFileSync(path.join(out, 'sentences.js'), '// Real Japanese sentences with English translations (Tatoeba, CC BY 2.0 FR), split into words with readings by kuromoji. [japanese, english, words]\n// words: "|" between words; "surface;reading;basicForm" (reading and basicForm only when they differ from the surface)\nvar SENTENCES = ' + JSON.stringify(rows) + ';\n');
  console.log('dictionary', dict.length, '| frequency words', freq.length, '| sentences', rows.length);
});
