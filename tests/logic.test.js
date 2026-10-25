const test = require('node:test');
const assert = require('node:assert');
const L = require('../renderer/logic.js');
const J = require('../renderer/japanese.js');

test('FSRS: first reviews, then a lapse', () => {
  const w = L.newWord({ ja: '家', en: 'house' });
  const a = L.grade(w, 'good', '2026-10-12');
  assert.equal(a.due, '2026-10-15'); assert.equal(a.box, 2); assert.equal(a.reps, 1); // first Good: 3 days
  const e = L.grade(w, 'easy', '2026-10-12'); assert.ok(e.stab > a.stab);
  const b = L.grade(a, 'good', '2026-10-15');
  assert.ok(b.stab > a.stab * 1.5, 'stability grows after a successful review'); assert.ok(b.due > a.due);
  const c = L.grade(b, 'again', b.due);
  assert.equal(c.box, 0); assert.equal(c.due, b.due); assert.equal(c.lapses, 1); assert.ok(c.stab < b.stab);
  const aw = L.grade(w, 'again', '2026-10-12'); assert.equal(aw.due, '2026-10-12');
});
test('FSRS: reviewing late helps more than early; old Leitner words carry over', () => {
  const a = L.grade(L.newWord({ ja: 'x', en: 'y' }), 'good', '2026-10-12');
  const early = L.grade(a, 'good', '2026-10-13'), late = L.grade(a, 'good', '2026-10-25');
  assert.ok(late.stab > early.stab);
  const old = L.newWord({ ja: 'o', en: 'o', box: 4, reps: 5, due: '2026-10-20' }); // 8-day box, last seen 10-12
  const n = L.grade(old, 'good', '2026-10-20'); assert.ok(n.stab > 8 && n.box >= 4);
  assert.equal(L.previewIntervals(L.newWord({}), '2026-10-12').good, 3);
});
test('box never exceeds the top level', () => {
  const w = L.grade(L.newWord({ ja: 'x', en: 'y', box: 7, reps: 9, stab: 5000, last: '2025-01-01', due: '2025-01-02' }), 'easy', '2026-01-01');
  assert.ok(w.box <= 7 && w.due <= L.addDays('2026-01-01', 365));
});
test('dueWords: new and past-due only, deleted skipped', () => {
  const ws = [L.newWord({ ja: 'a', en: 'a' }), L.newWord({ ja: 'b', en: 'b', due: '2026-12-01' }), L.newWord({ ja: 'c', en: 'c', deleted: true })];
  assert.deepEqual(L.dueWords(ws, '2026-10-12').map((w) => w.ja), ['a']);
});
test('streak: counts back, today not yet studied does not break it', () => {
  const log = { '2026-10-10': { reviews: 3 }, '2026-10-11': { reviews: 1 } };
  assert.equal(L.streak(log, '2026-10-12'), 2);
  log['2026-10-12'] = { reviews: 1 };
  assert.equal(L.streak(log, '2026-10-12'), 3);
  assert.equal(L.streak({}, '2026-10-12'), 0);
});

test('check (English answers): exact, accent-insensitive, typo, alternatives, wrong', () => {
  assert.equal(L.check('appointment', 'appointment'), 'right');
  assert.equal(L.check('Appointment', 'appointment'), 'right');
  assert.equal(L.check('appointmant', 'appointment'), 'close');
  assert.equal(L.check('cafe', 'café'), 'close');
  assert.equal(L.check('to explain', 'to explain / to clarify'), 'right');
  assert.equal(L.check('wage', 'wage, salary'), 'right'); // one of several meanings is enough
  assert.equal(L.check('salery', 'wage, salary'), 'close');
  assert.equal(L.check('run', 'to run (fast, slow)'), 'wrong'); // a comma inside brackets is a note, not a second meaning
  assert.equal(L.check('to run', 'to run (fast, slow)'), 'right');
  assert.equal(L.check('house', 'appointment'), 'wrong');
  assert.equal(L.check('', 'x'), 'wrong');
  assert.equal(L.check('cat', 'cut'), 'wrong'); // short words: no typo forgiveness
});
test('checkWord: kanji, kana or romaji; the reading can be made to count as close', () => {
  const w = L.newWord({ ja: '食べる', reading: 'たべる', en: 'to eat' });
  assert.equal(L.checkWord('食べる', w), 'right'); assert.equal(L.checkWord('たべる', w), 'right'); assert.equal(L.checkWord('taberu', w), 'right'); assert.equal(L.checkWord('タベル', w), 'right');
  assert.equal(L.checkWord('たべる', w, { strictKanji: true }), 'close'); assert.equal(L.checkWord('のむ', w), 'wrong'); assert.equal(L.checkWord('', w), 'wrong');
  assert.equal(L.checkWord('arigatou', L.newWord({ ja: 'ありがとう' })), 'right');
});

test('parseVocab handles the common separators, readings and examples', () => {
  const r = L.parseVocab('食べる（たべる）= to eat | 毎日ご飯を食べます。\n飲む; のむ; to drink\nありがとう - thank you\n友達\tともだち\tfriend\n# comment\njunk');
  assert.equal(r.length, 4);
  assert.deepEqual([r[0].ja, r[0].reading, r[0].en, r[0].example, r[0].pos], ['食べる', 'たべる', 'to eat', '毎日ご飯を食べます。', 'verb']);
  assert.deepEqual([r[1].ja, r[1].reading, r[1].en], ['飲む', 'のむ', 'to drink']);
  assert.deepEqual([r[2].ja, r[2].reading, r[2].en, r[2].pos], ['ありがとう', '', 'thank you', 'other']);
  assert.deepEqual([r[3].ja, r[3].reading, r[3].en], ['友達', 'ともだち', 'friend']);
});
test('seed words: readings, classes and examples are complete', () => {
  const src = require('fs').readFileSync(__dirname + '/../renderer/content.js', 'utf8');
  const C = new Function(src + '; return { SEED_WORDS, PROVERBS, PHRASES, PH_CATS, PH_PATTERNS, DAILY_PHRASES };')();
  assert.ok(C.SEED_WORDS.length >= 100);
  for (const w of C.SEED_WORDS) {
    assert.ok(w.ja && w.en && w.example && w.exampleEn && w.exTok, w.ja);
    if (J.hasKanji(w.ja)) assert.ok(w.reading, w.ja + ' needs a reading');
    if (w.pos === 'verb') assert.ok(J.verbClass(w.vclass), w.ja + ' needs a verb class');
    if (w.pos === 'adjective') assert.ok(['i', 'ix', 'na'].includes(w.vclass), w.ja + ' needs an adjective class');
    assert.equal(J.tokens([w.example, '', w.exTok]).map((t) => t.s).join(''), w.example, w.ja + ' tokens rebuild the example');
  }
  for (const p of C.PHRASES) { assert.ok(C.PH_CATS.some((c) => c[0] === p[0]), p[1]); if (p[3]) assert.ok(p[1].includes(p[3]), p[1] + ' hides ' + p[3]); }
  for (const pt of C.PH_PATTERNS) { assert.ok(pt.ja.includes('{}') && pt.en.includes('{}')); for (const s of pt.swaps) assert.ok(s[2], s[0] + ' reading'); }
  assert.equal(new Set(C.PHRASES.map((p) => L.norm(p[1]))).size, C.PHRASES.length, 'phrases are unique');
});
test('mergeWords skips duplicates', () => {
  const have = [L.newWord({ ja: '家', reading: 'いえ', en: 'house' })];
  const r = L.mergeWords(have, [{ ja: '家', reading: 'いえ', en: 'house' }, { ja: '家', reading: 'うち', en: 'home' }, { ja: '木', reading: 'き', en: 'tree' }, { ja: '木', reading: 'き', en: 'tree' }]);
  assert.equal(r.added, 2); assert.equal(r.skipped, 2); assert.equal(r.words.length, 3); // the same kanji with another reading is another word
});
test('parseImport: JSON from Claude, bare array, plain text fallback', () => {
  const j = L.parseImport('{"words":[{"ja":"約束","reading":"やくそく","en":"promise","pos":"noun"},{"ja":"x"}],"lessons":[{"title":"Lesson 5","due":"2026-10-20"}]}');
  assert.equal(j.words.length, 1); assert.equal(j.words[0].pos, 'noun'); assert.equal(j.words[0].reading, 'やくそく'); assert.equal(j.lessons[0].title, 'Lesson 5');
  assert.equal(L.parseImport('[{"ja":"a","en":"b"}]').words.length, 1);
  assert.equal(L.parseImport('家 = house').words.length, 1);
});
test('fixState fills defaults', () => {
  const s = L.fixState({ words: [1], settings: { dailyGoal: 5 } });
  assert.equal(s.settings.dailyGoal, 5); assert.equal(s.settings.newPerDay, 10); assert.deepEqual(s.lessons, []); assert.equal(s.settings.romaji, true);
});
test('queue: due reviews plus a capped number of new words', () => {
  const ws = [];
  for (let i = 0; i < 30; i++) ws.push(L.newWord({ ja: 'n' + i, en: 'x' }));
  ws.push(L.newWord({ ja: 'r1', en: 'x', reps: 2, due: '2026-10-11', box: 2 }), L.newWord({ ja: 'r2', en: 'x', reps: 2, due: '2026-11-01', box: 2 }));
  assert.equal(L.queue(ws, '2026-10-12', 10, 0).length, 11);
  assert.equal(L.queue(ws, '2026-10-12', 10, 4).length, 7);
  assert.equal(L.queue(ws, '2026-10-12', 10, 10).length, 1);
  assert.equal(L.queue(ws, '2026-10-12', 0, 0)[0].ja, 'r1');
});

test('soundTags finds the confusion behind a misspelling (kana)', () => {
  assert.deepEqual(L.soundTags('がっこう', 'がこう'), ['small-tsu']);
  assert.ok(L.soundTags('おおきい', 'おうきい').includes('long-vowel')); assert.ok(L.soundTags('せんせい', 'せんせ').includes('long-vowel'));
  assert.ok(L.soundTags('びょういん', 'びよういん').includes('small-kana'));
  assert.ok(L.soundTags('かばん', 'かぱん').includes('voicing')); assert.ok(L.soundTags('ほんとう', 'ぼんとう').includes('voicing'));
  assert.ok(L.soundTags('わたしは', 'わたしわ').includes('particles')); assert.ok(L.soundTags('ほんを', 'ほんお').includes('particles'));
  assert.ok(L.soundTags('はなぢ', 'はなじ').includes('ji-zu'));
  assert.ok(L.soundTags('ほんや', 'ほや').includes('n-sound'));
  assert.deepEqual(L.soundTags('ねこ', 'ねこ'), []); assert.deepEqual(L.soundTags('ねこ', 'いぬ'), []);
});
test('diffWords: ok, close and missed words, kana typing against a sentence', () => {
  const tok = '私;わたし|は|毎日;まいにち|ご飯;ごはん|を|食べ;たべ;食べる|ます|。';
  const s = '私は毎日ご飯を食べます。';
  assert.equal(L.diffWords(s, 'わたしはまいにちごはんをたべます', tok).result, 'right');
  assert.equal(L.diffWords(s, 'watashihamainichigohanwotabemasu', tok).result, 'right'); // romaji is read as kana
  assert.equal(L.diffWords(s, 'watashiwamainichigohanwotabemasu', tok).result, 'close'); // わ typed for the particle は
  const d = L.diffWords(s, 'わたしはまいにちごはんをたべません', tok);
  const st = Object.fromEntries(d.words.map((w) => [w.w, w.status]));
  assert.equal(st['私'], 'ok'); assert.equal(st['毎日'], 'ok'); assert.equal(st['ます'], 'close'); assert.equal(d.result, 'close');
  assert.equal(L.diffWords(s, '私は毎日ご飯を食べます。', tok).result, 'right'); // typing the kanji works too
  assert.equal(L.diffWords(s, 'ばなな', tok).result, 'wrong');
  assert.equal(L.diffWords(s, '', tok).result, 'wrong');
});
test('letterDiff marks the letters that were not typed right', () => {
  const d = L.letterDiff('がっこう', 'がこう');
  assert.deepEqual(d.cells.map((c) => c.ok), [true, false, true, true]);
  assert.ok(L.letterDiff('ねこ', 'neko').cells.every((c) => c.ok)); // romaji typing is read as kana
  assert.ok(L.letterDiff('カメラ', 'かめら').cells.every((c) => c.ok)); // katakana = hiragana
  const e = L.letterDiff('ねこ', 'ねここ'); assert.equal(e.extra.join(''), 'こ'); assert.ok(e.cells.every((c) => c.ok));
});
test('hintText and soundWords', () => {
  assert.equal(L.hintText('たべる', 1), '○ ○ ○'); assert.equal(L.hintText('たべる。', 2), 'た ○ ○');
  const ws = [L.newWord({ ja: '学校', reading: 'がっこう', en: 's' }), L.newWord({ ja: '猫', reading: 'ねこ', en: 'c' }), L.newWord({ ja: 'きって', en: 'stamp' })];
  assert.deepEqual(L.soundWords(ws, 'small-tsu').map((w) => w.ja), ['学校', 'きって']);
});

test('extractJson pulls JSON out of a whole reply', () => {
  const reply = 'Sure! Here you go:\n```json\n{"words":[{"ja":"大家","reading":"おおや","en":"landlord"}]}\n```\nHope it helps {not json}.';
  assert.equal(L.extractJson(reply).words[0].ja, '大家');
  assert.equal(L.extractJson('Intro text {"words":[{"ja":"a","en":"b"}]} outro').words.length, 1);
  assert.equal(L.extractJson('no json here, only [brackets] and {braces}'), null);
  assert.equal(L.parseImport(reply).words[0].en, 'landlord');
});
test('estimateTokens is a rough size', () => {
  assert.equal(L.estimateTokens(''), 0); assert.equal(L.estimateTokens('x'.repeat(360)), 100); assert.ok(L.estimateTokens('日本語を勉強します') > 8); assert.ok(L.estimateTokens(L.sheetPrompt({ count: 8 })) > 200);
});

const SHEET_REPLY = 'Here you go!\n```json\n' + JSON.stringify({ worksheet: { title: 'Lesson 12 practice', items: [
  { type: 'mc', skill: 'particles', q: '私___学生です。', options: ['は', 'を'], answer: 'は', why: 'は marks the topic.', rd: 'わたしはがくせいです。' },
  { type: 'fill', skill: 'Te-form', q: '毎日、日本語を勉強___います。(する)', answer: 'して', alt: [], rd: 'まいにちにほんごをべんきょうしています。' },
  { type: 'translate', skill: 'word order', q: 'Tomorrow I have an appointment.', answer: '明日、予約があります。', alt: ['明日予約があります。'], rd: 'あしたよやくがあります。' },
  { type: 'mc', q: 'bad item, answer not in options', options: ['a', 'b'], answer: 'c' },
  { type: 'quiz', q: 'unknown type', answer: 'x' },
  { type: 'write', skill: 'vocabulary', q: 'Write two sentences about your day.', answer: '朝、ご飯を食べました。' },
] } }) + '\n```';

test('normSkill maps free text to known skills', () => {
  assert.equal(L.normSkill('Word Order'), 'word order'); assert.equal(L.normSkill('particles'), 'particles'); assert.equal(L.normSkill('は vs が (topic marker)'), 'particles');
  assert.equal(L.normSkill('Te-form'), 'te-form'); assert.equal(L.normSkill('Past tense (た-form)'), 'past tense'); assert.equal(L.normSkill('i-adjective conjugation'), 'adjectives'); assert.equal(L.normSkill('keigo'), 'politeness');
  assert.equal(L.normSkill('kanji readings'), 'reading kanji'); assert.equal(L.normSkill('hiragana'), 'kana'); assert.equal(L.normSkill('banana'), 'other'); assert.equal(L.normSkill(''), 'other');
});
test('parseSheet reads a worksheet and drops unusable items', () => {
  const r = L.parseSheet(SHEET_REPLY);
  assert.ok(r.sheet); assert.equal(r.sheet.title, 'Lesson 12 practice'); assert.equal(r.sheet.items.length, 4); assert.equal(r.sheet.skipped, 2);
  assert.deepEqual(r.sheet.items.map((i) => i.id), ['1', '2', '3', '4']); assert.equal(r.sheet.items[1].skill, 'te-form'); assert.equal(r.sheet.items[3].type, 'write'); assert.equal(r.sheet.items[0].rd, 'わたしはがくせいです。');
  assert.ok(L.parseSheet('no json').error); assert.ok(L.parseSheet('{"worksheet":{"items":[]}}').error);
});
test('autoMark: mc and fill are final, Japanese can be typed as kanji, kana or romaji', () => {
  const [mc, fill, tr, wr] = L.parseSheet(SHEET_REPLY).sheet.items;
  assert.deepEqual(L.autoMark(mc, 'は'), { verdict: 'right', final: true }); assert.equal(L.autoMark(mc, 'を').verdict, 'wrong');
  assert.equal(L.autoMark(fill, 'して').verdict, 'right'); assert.equal(L.autoMark(fill, 'shite').verdict, 'right'); assert.equal(L.autoMark(fill, 'する').verdict, 'wrong');
  assert.equal(L.autoMark({ type: 'fill', answer: '食べました', alt: [] }, '食べまひた').verdict, 'close');
  assert.equal(L.autoMark(tr, '明日予約があります').verdict, 'right'); assert.equal(L.autoMark(tr, 'あしたよやくがあります').verdict, 'right'); assert.equal(L.autoMark(tr, '予約が明日あります').verdict, 'unsure');
  assert.equal(L.autoMark(wr, '食べた。').verdict, 'unsure'); assert.equal(L.autoMark(fill, '  ').verdict, 'blank');
  assert.equal(L.autoMark({ type: 'fill', answer: 'to eat', alt: [] }, 'To eat').verdict, 'right'); // English answers still work
});
test('recordOutcome and weakSkills track accuracy per skill', () => {
  const sk = {};
  L.recordOutcome(sk, 'word order', false, { q: 'q1', yours: 'a', correct: 'b' }, '2026-10-12');
  L.recordOutcome(sk, 'word order', false, null); L.recordOutcome(sk, 'word order', true);
  L.recordOutcome(sk, 'particles', true); L.recordOutcome(sk, 'particles', true);
  L.recordOutcome(sk, 'kana', false);
  const w = L.weakSkills(sk, 3);
  assert.deepEqual(w.map((x) => x.skill), ['word order', 'kana']); assert.equal(w[0].wrong, 2); assert.equal(w[0].total, 3); assert.equal(w[0].examples[0].yours, 'a');
  for (let i = 0; i < 40; i++) L.recordOutcome(sk, 'verb forms', i % 2);
  assert.equal(sk['verb forms'].hist.length, 30);
});
test('sheetPrompt and checkPrompt carry what Claude needs', () => {
  L.setLevel('N4');
  const p = L.sheetPrompt({ count: 10, topics: ['Work & jobs', 'Health & the doctor'], grammar: ['particles', 'te-form'], words: [{ ja: '大家', reading: 'おおや', en: 'landlord' }], weak: [{ skill: 'particles', wrong: 5, total: 8, examples: [{ yours: '私を学生です', correct: '私は学生です' }] }], note: 'keep it short' });
  assert.ok(p.includes('JLPT N4') && p.includes('10 items') && p.includes('Topics to include') && p.includes('Work & jobs, Health & the doctor') && p.includes('Grammar to include') && p.includes('Particles (は, が, を, に...), て-form') && p.includes('大家（おおや） (landlord)') && p.includes('missed 5 of my last 8') && p.includes('私を学生です') && p.includes('keep it short') && p.includes('"worksheet"') && p.includes('"rd"'));
  assert.ok(!L.sheetPrompt({ count: 8 }).includes('Topics to include'));
  const sheet = Object.assign(L.parseSheet(SHEET_REPLY).sheet, { answers: { 1: 'は', 3: '予約が明日あります' }, results: { 1: { verdict: 'right' }, 3: { verdict: 'unsure' } } });
  const c = L.checkPrompt(sheet);
  assert.ok(c.includes('1. [auto: right]') && c.includes('3. [CHECK]') && c.includes('予約が明日あります') && c.includes('(left blank)') && c.includes('"summary"') && c.includes('kana or romaji'));
});
test('parseFeedback reads the marking and the summary', () => {
  const sheet = L.parseSheet(SHEET_REPLY).sheet;
  const reply = 'Nice work!\n```json\n{"results":[{"id":"3","verdict":"partly","correct":"明日、予約があります。","explain":"Verb last.","skills":["Word order"]},{"id":"99","verdict":"right"}],"summary":{"good":"Good particles.","improve":["Verb goes last"],"next":"Word order"}}\n```';
  const f = L.parseFeedback(reply, sheet);
  assert.equal(Object.keys(f.results).length, 1); assert.equal(f.results['3'].verdict, 'partly'); assert.deepEqual(f.results['3'].skills, ['word order']);
  assert.equal(f.summary.improve[0], 'Verb goes last');
  assert.ok(L.parseFeedback('hello', sheet).error);
  assert.deepEqual(L.sheetScore({ items: sheet.items, results: { 1: { verdict: 'right' }, 2: { verdict: 'close' }, 3: { verdict: 'unsure' } } }), { got: 1.75, of: 4, marked: 2 });
});
test('parseListing reads the Start / blank-line list format', () => {
  const text = '食べる（たべる） \t\n\nto eat\nStart \t飲む（のむ） \t\n\nto drink\nStart \t行く \t\n\nto go\n';
  assert.ok(L.looksLikeListing(text));
  const r = L.parseListing(text);
  assert.deepEqual(r.map((w) => [w.ja, w.reading, w.en, w.pos]), [['食べる', 'たべる', 'to eat', 'verb'], ['飲む', 'のむ', 'to drink', 'verb'], ['行く', '', 'to go', 'verb']]);
  assert.equal(r.leftover, 0);
  const viaImport = L.parseImport(text).words;
  assert.equal(viaImport.length, 3); assert.equal(viaImport[1].ja, '飲む'); assert.equal(viaImport[1].en, 'to drink');
  const r2 = L.parseListing('Start\r\n\t本 \t\r\n\r\nbook\r\nStart\t家\r\n\r\nhouse\r\nStarten');
  assert.deepEqual(r2.map((w) => [w.ja, w.en]), [['本', 'book'], ['家', 'house']]); assert.equal(r2.leftover, 1);
  assert.ok(!L.looksLikeListing('本 = book\n家 = house')); assert.equal(L.parseImport('本 = book').words[0].ja, '本');
});

test('orderParts and usedWords light up the words as they are typed (no spaces in Japanese)', () => {
  const p = L.orderParts('Put in order: 私 / は / 毎日 / ご飯 / を / 食べます');
  assert.equal(p.prefix, 'Put in order:'); assert.equal(p.words.length, 6); assert.equal(p.words[0], '私');
  assert.deepEqual(L.orderParts('私 / は / 学生'), { prefix: '', words: ['私', 'は', '学生'] });
  assert.equal(L.orderParts('Translate this sentence'), null);
  assert.deepEqual(L.usedWords(p.words, '私は毎日'), [true, true, true, false, false, false]);
  assert.deepEqual(L.usedWords(['は', 'は', '学生'], '私は学生'), [true, false, true]); // a typed tile is used once
  assert.deepEqual(L.usedWords(['毎日', '食べます'], '毎'), [false, false]); // half a tile does not count
  assert.ok(L.usedWords(p.words, '私は毎日ご飯を食べます。').every(Boolean));
  assert.deepEqual(L.usedWords(['食べます', '？'], '食べます'), [true, false]); assert.deepEqual(L.usedWords(['食べます', '？'], '食べます?'), [true, true]);
});
test('order tiles: a punctuation tile lights up when you type that mark', () => {
  assert.deepEqual(L.usedWords(['本', 'を', '。'], '本を'), [true, true, false]);
  assert.deepEqual(L.usedWords(['本', 'を', '。'], '本を。'), [true, true, true]);
  assert.deepEqual(L.usedWords(['はい', '、', '、'], 'はい、'), [true, true, false]);
});
test('coachMoment: calm after a miss, bigger cheers at streaks, halfway and last card', () => {
  const m = (o) => L.coachMoment(Object.assign({ grade: 'good', streak: 1, done: 1, total: 10, rnd: () => 0 }, o));
  assert.deepEqual(m({ grade: 'again', streak: 0 }), { kind: 'again', act: 'sway', burst: '' });
  assert.equal(m({ streak: 3 }).kind, 'streak3'); assert.equal(m({ streak: 5 }).act, 'spin'); assert.equal(m({ streak: 8 }).kind, 'streak8'); assert.equal(m({ streak: 9 }).kind, 'right'); assert.equal(m({ streak: 12 }).kind, 'streak8');
  assert.equal(m({ done: 9, total: 10 }).kind, 'last'); assert.equal(m({ done: 5, total: 10 }).kind, 'half'); assert.equal(m({ done: 2, total: 4 }).kind, 'right');
  assert.equal(m({ streak: 3, done: 9, total: 10 }).kind, 'streak3');
  const r = m({}); assert.equal(r.kind, 'right'); assert.ok(['hop', 'wiggle', 'nod', 'bounce', 'twirl', 'wave'].includes(r.act));
});
test('every coach moment has lines to say', () => {
  const src = require('fs').readFileSync(__dirname + '/../renderer/content.js', 'utf8') + require('fs').readFileSync(__dirname + '/../renderer/seed.js', 'utf8');
  const COACH = new Function(src + '; return COACH;')();
  for (const k of ['start', 'right', 'again', 'streak3', 'streak5', 'streak8', 'half', 'last', 'done']) assert.ok(COACH[k] && COACH[k].length >= 1, k);
});

// ---------- sentences, the dictionary and worksheets built from the data ----------
const SENT = [['私は毎日ご飯を食べます。', 'I eat rice every day.', '私;わたし|は|毎日;まいにち|ご飯;ごはん|を|食べ;たべ;食べる|ます|。'], ['彼は何も食べなかった。', 'He ate nothing.', '彼;かれ|は|何;なに|も|食べ;たべ;食べる|なかっ|た|。'], ['これは本です。', 'This is a book.', 'これ|は|本;ほん|です|。'], ['本を読んでいます。', 'I am reading a book.', '本;ほん|を|読ん;よん;読む|で|い;;いる|ます|。']];
test('Tatoeba sentences: found by dictionary form or spelling, shortest first', () => {
  const idx = L.buildSentenceIndex(SENT);
  assert.deepEqual(L.sentencesFor('食べる', 'verb', idx, SENT, 5, 'たべる').map((p) => p[0]), ['彼は何も食べなかった。', '私は毎日ご飯を食べます。']);
  assert.deepEqual(L.sentencesFor('本', 'noun', idx, SENT, 1, 'ほん').map((p) => p[0]), ['これは本です。']);
  assert.equal(L.sentencesFor('猫', 'noun', idx, SENT, 5).length, 0);
});
test('cloze: finds the word as the sentence uses it, with furigana tokens or as plain text', () => {
  const w = L.newWord({ ja: '食べる', reading: 'たべる', pos: 'verb', vclass: 'v1' });
  const c = L.clozeOf(SENT[0][0], w, SENT[0][2]);
  assert.equal(c.form, '食べ'); assert.equal(c.reading, 'たべ'); assert.equal(c.before, '私は毎日ご飯を'); assert.equal(c.after, 'ます。');
  const plain = L.clozeOf('毎日ご飯を食べます。', w, ''); assert.equal(plain.form, '食べ'); // no tokens: the stem is searched for as text
  assert.equal(L.clozeOf('猫がいます。', w, ''), null); assert.equal(L.clozeOf('', w, ''), null);
  assert.equal(L.clozeOf('本を読みます。', L.newWord({ ja: '本', reading: 'ほん', pos: 'noun' }), '').form, '本');
  assert.equal(L.stemOf(L.newWord({ ja: '書く', pos: 'verb', vclass: 'v5k' })), '書'); assert.equal(L.stemOf(L.newWord({ ja: '大きい', pos: 'adjective', vclass: 'i' })), '大き'); assert.equal(L.stemOf(L.newWord({ ja: '勉強する', pos: 'verb', vclass: 'vs-i' })), '勉強');
});
test('suggested words skip ones you have or already know, and respect the band', () => {
  const F = [['私', 'I', 1, 'わたし'], ['家', 'house', 50, 'いえ'], ['木', 'tree', 900, 'き'], ['犬', 'dog', 1500, 'いぬ']];
  const mine = [L.newWord({ ja: '家', reading: 'いえ', en: 'house' })];
  assert.deepEqual(L.suggestWords(F, mine, ['私'], 0, 1000).map((x) => x[0]), ['木']);
  assert.deepEqual(L.suggestWords(F, mine, [], 1000, 2000).map((x) => x[0]), ['犬']);
});

const DICT_T = [['食べる', 'v', 'たべる', 'v1,vt', 'to eat'], ['行く', 'v', 'いく', 'v5k-s,vi', 'to go'], ['大きい', 'a', 'おおきい', 'i', 'big'], ['静か', 'a', 'しずか', 'na', 'quiet'], ['勉強', 'n', 'べんきょう', 'vs', 'study'], ['本', 'n', 'ほん', '', 'book'], ['本屋', 'n', 'ほんや', '', 'bookshop'], ['ありがとう', 'i', '', '', 'thank you']];
test('dictionary lookup: kanji, kana, romaji, forms and English', () => {
  const ix = L.buildDictIndex(DICT_T), find = (q) => L.dictSearch(DICT_T, ix, q).map((r) => r.e[0] + ':' + r.how);
  assert.equal(find('食べる')[0], '食べる:word'); assert.equal(find('たべる')[0], '食べる:word'); assert.equal(find('taberu')[0], '食べる:word');
  assert.equal(find('食べた')[0], '食べる:form'); assert.equal(find('たべません')[0], '食べる:form'); assert.equal(find('ikimasu')[0], '行く:form'); assert.equal(find('行って')[0], '行く:form'); assert.equal(find('大きくない')[0], '大きい:form');
  assert.equal(find('しずかではない')[0], '静か:form'); assert.equal(find('べんきょうする')[0], '勉強:form');
  assert.deepEqual(find('本'), ['本:word', '本屋:prefix']); assert.deepEqual(find('ほん'), ['本:word', '本屋:prefix']);
  assert.deepEqual(find('to eat'), ['食べる:english']); assert.deepEqual(find('book'), ['本:english']); assert.deepEqual(find('arigatou'), ['ありがとう:word']);
  assert.deepEqual(find('x'), []); assert.deepEqual(find(''), []);
  assert.deepEqual(L.dictToWord(DICT_T[0]), { ja: '食べる', reading: 'たべる', en: 'to eat', pos: 'verb', vclass: 'v1' });
  assert.deepEqual(L.dictToWord(DICT_T[3]), { ja: '静か', reading: 'しずか', en: 'quiet', pos: 'adjective', vclass: 'na' });
  assert.equal(L.formLabel(DICT_T[0], 'たべた'), 'past (た)');
});
test('dictionary: explanations and filling in a word from the dictionary', () => {
  const ix = L.buildDictIndex(DICT_T);
  assert.match(L.dictExplain(DICT_T, ix, DICT_T[0]).note, /Ichidan.*transitive/); assert.match(L.dictExplain(DICT_T, ix, DICT_T[4]).note, /勉強する/); assert.equal(L.dictExplain(DICT_T, ix, DICT_T[5]).note, '');
  const w = L.newWord({ ja: '食べる', en: 'to eat' }); L.enrichWord(w, DICT_T, ix);
  assert.deepEqual([w.reading, w.pos, w.vclass], ['たべる', 'verb', 'v1']);
  const own = L.newWord({ ja: '行く', reading: 'いく', pos: 'verb', vclass: '' }); L.enrichWord(own, DICT_T, ix); assert.equal(own.vclass, 'v5k-s');
  assert.equal(L.verbClassName('v5k-s,vi'), 'godan verb 行く (irregular て-form: 行って)');
});
test('worksheets built from the downloaded data', () => {
  const sentences = SENT, dix = L.buildDictIndex(DICT_T), six = L.buildSentenceIndex(sentences);
  const pool = [{ ja: '食べる', reading: 'たべる', en: 'to eat', pos: 'verb', vclass: 'v1' }, { ja: '本', reading: 'ほん', en: 'book', pos: 'noun', vclass: '' }, { ja: '大きい', reading: 'おおきい', en: 'big', pos: 'adjective', vclass: 'i' }];
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const dict = DICT_T.concat([['水', 'n', 'みず', '', 'water'], ['犬', 'n', 'いぬ', '', 'dog'], ['猫', 'n', 'ねこ', '', 'cat'], ['山', 'n', 'やま', '', 'mountain'], ['海', 'n', 'うみ', '', 'sea']]);
  const sheet = L.buildLocalSheet({ pool, count: 12, dict, dix: L.buildDictIndex(dict), sentences, six, rnd });
  assert.ok(sheet && sheet.items.length >= 5);
  const by = (ty, sk) => sheet.items.filter((i) => i.type === ty && (!sk || i.skill === sk));
  const cl = sheet.items.find((i) => i.type === 'fill' && /＿/.test(i.q) && i.skill !== 'te-form'); assert.ok(cl && ['食べ', '本', '大き'].includes(cl.answer), 'cloze blanks out the word as used');
  assert.ok(cl.rd && cl.alt.length <= 1);
  const fo = sheet.items.find((i) => /^Make the/.test(i.q)); assert.ok(fo && fo.answer && L.autoMark(fo, fo.answer).verdict === 'right' && (!fo.alt[0] || L.autoMark(fo, fo.alt[0]).verdict === 'right'));
  const or = sheet.items.find((i) => i.type === 'order'); if (or) assert.ok(L.orderParts(or.q).words.length >= 3 && L.autoMark(or, or.answer).verdict === 'right' && L.autoMark(or, or.alt[0]).verdict === 'right');
  if (by('mc', 'vocabulary')[0]) assert.ok(by('mc', 'vocabulary')[0].options.includes(by('mc', 'vocabulary')[0].answer));
  assert.equal(L.buildLocalSheet({ pool: [], count: 5, dict: DICT_T, dix, sentences, six }), null);
});
test('recent and trouble words', () => {
  const ws = [L.newWord({ ja: 'a', en: 'a', reps: 3, last: '2026-10-10', box: 3 }), L.newWord({ ja: 'b', en: 'b', reps: 5, last: '2026-08-01', box: 1, lapses: 2, created: 1 }), L.newWord({ ja: 'c', en: 'c', reps: 4, last: '2026-08-01', box: 5, created: 1 })];
  assert.deepEqual(L.recentWords(ws, '2026-10-12', 7).map((w) => w.ja), ['a']);
  assert.deepEqual(L.troubleWords(ws).map((w) => w.ja), ['b']);
});
test('mistakes review: words missed in the last week, most missed first', () => {
  const ws = [L.newWord({ ja: '家', en: 'house', reps: 2 }), L.newWord({ ja: '本', en: 'book', reps: 2 }), L.newWord({ ja: '犬', en: 'dog', reps: 2 })];
  const log = [{ ja: '本', d: '2026-10-11', s: 'cards' }, { ja: '本', d: '2026-10-12', s: 'listen' }, { ja: '家', d: '2026-10-10', s: 'cards' }, { ja: '犬', d: '2026-09-01', s: 'cards' }];
  assert.deepEqual(L.missedWords(ws, log, '2026-10-12', 7).map((w) => w.ja), ['本', '家']);
});
test('progress counters: week sums, accuracy, snapshots', () => {
  const log = { '2026-10-12': { reviews: 10, cOk: 8, cMiss: 2, lOk: 5 }, '2026-10-05': { reviews: 7, cOk: 3, cMiss: 3 } };
  assert.equal(L.weekSum(log, '2026-10-12', ['reviews'], 0), 10); assert.equal(L.weekSum(log, '2026-10-12', ['reviews'], 1), 7);
  assert.equal(L.dayAccuracy(log['2026-10-12']), 13 / 15); assert.equal(L.dayAccuracy({}), null); assert.equal(L.weekAccuracy(log, '2026-10-12', 1), 0.5);
  const snap = {}; L.takeSnapshot(snap, [L.newWord({ box: 5, reps: 3 }), L.newWord({ box: 1, reps: 1 }), L.newWord({})], '2026-10-12');
  assert.deepEqual(snap['2026-10-12'], { learned: 1, started: 2, total: 3 });
});
test('reading texts: parse Claude reply or plain text, tokenize by the dictionary, find the sentence', () => {
  const reply = '```json\n{"reading":{"title":"ある一日","text":"毎日、ご飯を食べます。\\n\\n楽しいです。","kana":"まいにち、ごはんをたべます。\\n\\nたのしいです。","questions":[{"q":"何をしますか。","options":["食べる","寝る"],"answer":"食べる","why":"x"},{"q":"bad","options":["a"],"answer":"z"}]}}\n```';
  const r = L.parseReading(reply);
  assert.equal(r.reading.title, 'ある一日'); assert.equal(r.reading.questions.length, 1); assert.ok(r.reading.text.includes('楽しいです')); assert.ok(r.reading.kana.startsWith('まいにち'));
  assert.equal(L.parseReading('これは普通の日本語の文章です。').reading.text, 'これは普通の日本語の文章です。'); assert.ok(L.parseReading('はい').error);
  const known = new Set(['毎日', 'ご飯', '食べます', '楽しい', '食べる']);
  assert.deepEqual(L.tokenize('毎日、ご飯を食べます。', (s) => known.has(s)).filter((x) => x.w).map((x) => x.w), ['毎日', 'ご飯', '食べます']);
  assert.deepEqual(L.tokenize('Hello 世界!').filter((x) => x.w).map((x) => x.w), ['Hello', '世界']);
  assert.equal(L.sentenceWith('毎日、ご飯を食べます。楽しいです！', '楽しい'), '楽しいです！');
  assert.ok(L.readingPrompt({ level: 'N5', length: 'short', topic: '病院', words: [{ ja: '予約' }] }).includes('予約'));
});
test('seasons and holidays', () => {
  const d = (y, m, day) => new Date(y, m - 1, day);
  assert.equal(L.holidayOf(d(2026, 12, 20)), 'christmas'); assert.equal(L.holidayOf(d(2026, 10, 31)), 'halloween'); assert.equal(L.holidayOf(d(2026, 4, 5)), 'easter'); assert.equal(L.holidayOf(d(2026, 5, 10)), 'mothersday');
  L.setBirthday('2000-05-10'); assert.equal(L.holidayOf(d(2026, 5, 10)), 'birthday'); L.setBirthday('');
  assert.equal(L.holidayOf(d(2026, 1, 1)), 'newyear'); assert.equal(L.holidayOf(d(2026, 1, 3)), 'newyear'); assert.equal(L.holidayOf(d(2026, 2, 3)), 'setsubun'); assert.equal(L.holidayOf(d(2026, 3, 3)), 'hinamatsuri');
  assert.equal(L.holidayOf(d(2026, 3, 28)), 'hanami'); assert.equal(L.holidayOf(d(2026, 4, 8)), 'hanami'); assert.equal(L.holidayOf(d(2026, 4, 6)), 'easter'); assert.equal(L.holidayOf(d(2026, 5, 5)), 'kodomo'); assert.equal(L.holidayOf(d(2026, 7, 7)), 'tanabata');
  assert.equal(L.holidayOf(d(2026, 2, 14)), 'valentine'); assert.equal(L.holidayOf(d(2026, 8, 20)), '');
  assert.equal(L.seasonOf(d(2026, 1, 15)), 'winter'); assert.equal(L.seasonOf(d(2026, 4, 15)), 'spring'); assert.equal(L.seasonOf(d(2026, 7, 15)), 'summer'); assert.equal(L.seasonOf(d(2026, 10, 15)), 'autumn');
  assert.equal(L.lookOf(d(2026, 12, 20)), 'christmas'); assert.equal(L.lookOf(d(2026, 8, 20)), 'summer');
  assert.equal(L.easterSunday(2026).getMonth(), 3); assert.equal(L.easterSunday(2026).getDate(), 5);
});
test('levels: 99 levels shaped like RuneScape, names spread out, start from old history', () => {
  assert.equal(L.XP_TO[2], 302); assert.equal(L.levelInfo(0).level, 1); assert.equal(L.levelInfo(301).level, 1); assert.equal(L.levelInfo(302).level, 2); assert.equal(L.levelInfo(302).into, 0);
  const total = L.XP_TO[99];
  assert.ok(total > 250000 && total < 330000, 'about 290,000 XP in all');
  assert.ok(L.XP_TO[92] / total > 0.48 && L.XP_TO[92] / total < 0.58, 'level 92 is about halfway');
  for (let n = 2; n < 99; n++) assert.ok(L.levelNeed(n) >= L.levelNeed(n - 1), 'every level costs at least as much as the last');
  assert.equal(L.levelInfo(total).level, 99); assert.equal(L.levelInfo(total).max, true); assert.equal(L.levelInfo(total * 3).level, 99); assert.equal(L.levelInfo(total - 1).level, 98);
  assert.equal(L.levelTitle(1)[0], 'たね'); assert.equal(L.levelTitle(4)[0], 'たね'); assert.equal(L.levelTitle(5)[0], 'め'); assert.equal(L.levelTitle(92)[0], '師匠'); assert.equal(L.levelTitle(98)[0], 'ことばの妖精'); assert.equal(L.levelTitle(99)[0], '伝説');
  assert.equal(L.levelInfo(151).pct, 50); assert.ok(/MAX/.test(L.xpText(L.levelInfo(total))));
  assert.equal(L.xpFromHistory({ a: { reviews: 10, listen: 5, sheets: 1 }, b: { reviews: 99, xp: 40 } }, [L.newWord({ reps: 2 }), L.newWord({}), L.newWord({ deleted: true, reps: 3 })]), 40 + 20 + 15 + 40 + 1);
});
test('daily mix: steps finish by their own counts, and cards count as done when nothing is due', () => {
  const s0 = L.mixSteps({}, 10, 12); assert.deepEqual(s0.map((x) => x.done), [false, false, false]);
  const s1 = L.mixSteps({ reviews: 10, lOk: 3, lMiss: 2, sOk: 4, sMiss: 2 }, 10, 5); assert.deepEqual(s1.map((x) => x.done), [true, true, true]);
  assert.equal(L.mixSteps({}, 10, 0)[0].done, true);
});
test('weekly recap: Monday to Sunday sums, accuracy, best day and the level you started on', () => {
  const log = { '2026-10-05': { xp: 50, reviews: 10, cOk: 8, cMiss: 2 }, '2026-10-07': { xp: 120, reviews: 5, lOk: 5, lMiss: 1, sOk: 4, sMiss: 1 }, '2026-09-29': { xp: 40, reviews: 4 } };
  const r = L.weekRecap(log, 170, '2026-10-09', 0); // a Friday
  assert.equal(r.start, '2026-10-05'); assert.equal(r.end, '2026-10-11'); assert.equal(r.xp, 170); assert.equal(r.active, 2); assert.equal(r.cards, 15); assert.equal(r.best.d, '2026-10-07');
  assert.equal(Math.round(r.acc * 100), 81); assert.equal(r.prev.xp, 40); assert.equal(r.levelFrom, 1);
  const last = L.weekRecap(log, 170, '2026-10-14', 1); assert.equal(last.start, '2026-10-05'); assert.equal(last.xp, 170);
  assert.ok(L.recapLine(L.weekRecap({}, 0, '2026-10-09', 0)).includes('quiet'));
});
test('recall: typed words are matched to your words (kanji, kana or romaji), typos allowed', () => {
  const pool = [L.newWord({ ja: '約束', reading: 'やくそく' }), L.newWord({ ja: '病院', reading: 'びょういん' }), L.newWord({ ja: 'ありがとう' })];
  assert.equal(L.recallMatch('約束', pool).exact, true); assert.equal(L.recallMatch('やくそく', pool).exact, false); assert.equal(L.recallMatch('yakusoku', pool).w.ja, '約束');
  assert.equal(L.recallMatch('arigatou', pool).exact, true); const typo = L.recallMatch('ありがと', pool); assert.equal(typo.w.ja, 'ありがとう'); assert.equal(typo.exact, false);
  assert.equal(L.recallMatch('猫', pool), null); assert.equal(L.recallMatch('', pool), null);
});
test('settings: the volume starts at full and old saves get it', () => {
  assert.equal(L.defaultSettings().volume, 1);
  assert.equal(L.fixState({ settings: { rate: 0.8 } }).settings.volume, 1);
  assert.equal(L.fixState({ settings: { volume: 0.4 } }).settings.volume, 0.4);
});
test('repeat: a missed card comes back 2 or 3 cards later, further after a retype, and at most twice', () => {
  const s = { queue: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((id) => ({ id, again: false })), i: 0 };
  assert.equal(L.requeueMiss(s, s.queue[0], false, () => 0), true); assert.deepEqual(s.queue[2], { id: 1, again: true, back: 1 });
  s.i = 2; assert.equal(L.requeueMiss(s, s.queue[2], true, () => 0), true); assert.deepEqual(s.queue[7], { id: 1, again: true, back: 2 });
  s.i = 7; const n = s.queue.length; assert.equal(L.requeueMiss(s, s.queue[7], false), false); assert.equal(s.queue.length, n);
  const end = { queue: [{ id: 1 }], i: 0 }; L.requeueMiss(end, end.queue[0], true, () => 0.99); assert.equal(end.queue.length, 2); // near the end it goes last
});
test('repeat: progress counts the cards you chose, plus the redos left', () => {
  const q = [{ id: 1 }, { id: 2 }, { id: 1, again: true }, { id: 3 }, { id: 2, again: true }];
  assert.equal(L.sessionProgress({ queue: q, i: 0 }), '1 of 3 · 2 to redo');
  assert.equal(L.sessionProgress({ queue: q, i: 2 }), '🔁 Redo · 2 of 3 done · 1 to redo');
  assert.equal(L.sessionProgress({ queue: q, i: 3 }), '3 of 3 · 1 to redo');
  assert.equal(L.sessionProgress({ queue: q, i: 4 }), '🔁 Redo · 3 of 3 done');
  assert.equal(L.sessionProgress({ queue: [{ id: 1 }, { id: 2 }], i: 1 }), '2 of 2');
});

test('two cards per word: each direction keeps its own schedule', () => {
  const t = '2026-10-12', w = L.grade(L.newWord({ ja: '家', reading: 'いえ', en: 'house' }), 'good', t);
  const first = L.gradeCard(L.newWord({ ja: 'x', en: 'y' }), 'good', t, 'en-ja'); // a first card always counts Japanese → English
  assert.equal(first.reps, 1); assert.equal(first.rv, undefined);
  const b = L.gradeCard(w, 'again', '2026-10-14', 'en-ja');
  assert.equal(b.due, w.due); assert.equal(b.reps, 1); // Japanese → English untouched
  assert.equal(b.rv.reps, 1); assert.equal(b.rv.lapses, 1); assert.equal(b.rv.due, '2026-10-14');
  const c = L.gradeCard(b, 'good', '2026-10-14', 'en-ja');
  assert.equal(c.rv.reps, 2); assert.ok(c.rv.due > '2026-10-14');
  assert.equal(L.cardRec(c, 'ja-en'), c); assert.equal(L.cardRec(c, 'en-ja').reps, 2);
});

test('card queue: due cards, new words Japanese first, English → Japanese cards to start, spread through', () => {
  const t = '2026-10-12', o = { dirs: 'both', newPerDay: 2, newToday: 0, revPerDay: 1, revToday: 0 };
  const fresh = [1, 2, 3].map((i) => L.newWord({ ja: 'n' + i, en: 'x' }));
  const seenToday = L.newWord({ ja: 'today', en: 'x', reps: 1, last: t, due: '2026-10-15', box: 1, stab: 3 });
  const known = L.newWord({ ja: 'known', en: 'x', reps: 3, last: '2026-10-01', due: '2026-10-30', box: 4, stab: 20 });
  const weak = L.newWord({ ja: 'weak', en: 'x', reps: 3, last: '2026-10-01', due: '2026-10-25', box: 2, stab: 5 });
  const both = L.newWord({ ja: 'both', en: 'x', reps: 3, last: '2026-10-01', due: '2026-10-10', box: 2, rv: { reps: 2, due: '2026-10-08', box: 1 } });
  const q = L.cardQueue([...fresh, seenToday, known, weak, both], t, o);
  assert.deepEqual(q.map((c) => c.w.ja + ':' + c.dir), ['n1:ja-en', 'both:en-ja', 'n2:ja-en', 'known:en-ja']);
  assert.equal(L.cardQueue([seenToday, known, both], t, Object.assign({}, o, { dirs: 'ja-en' })).map((c) => c.w.ja + ':' + c.dir).join(), 'both:ja-en');
  assert.equal(L.cardQueue([known, both], t, Object.assign({}, o, { dirs: 'en-ja', revToday: 1 })).map((c) => c.w.ja).join(), 'both');
  assert.deepEqual(L.aheadCards([known, weak, both], t, 'both').map((c) => c.w.ja), ['weak', 'known']);
  assert.equal(L.spread(['a', 'b', 'c', 'd'], ['X', 'Y']).join(''), 'aXbcYd');
});

test('tricky words: 4+ misses on a card that is still weak', () => {
  const w = (o) => L.newWord(Object.assign({ ja: 'x', en: 'y', reps: 6 }, o));
  assert.equal(L.isTricky(w({ lapses: 4, box: 2 })), true);
  assert.equal(L.isTricky(w({ lapses: 4, box: 4 })), false);
  assert.equal(L.isTricky(w({ lapses: 0, box: 5, rv: { reps: 5, lapses: 5, box: 1 } })), true);
  assert.deepEqual(L.trickyWords([w({ ja: 'a', lapses: 4, box: 1 }), w({ ja: 'b', lapses: 6, box: 1 }), w({ ja: 'c' })]).map((x) => x.ja), ['b', 'a']);
});

test('spelling marks: the slips in a near miss, in kana even when typed in romaji', () => {
  const r = L.spellMarks('gakou', ['学校', 'がっこう']);
  assert.equal(r.answer, 'がっこう');
  assert.deepEqual(r.marks, [['が', 'ok'], ['っ', 'miss'], ['こ', 'ok'], ['う', 'ok']]);
  assert.deepEqual(r.tags, ['small-tsu']);
  assert.deepEqual(L.spellMarks('hause', ['house']).marks.map((m) => m[1]), ['ok', 'bad', 'ok', 'ok', 'ok']);
  assert.equal(L.spellMarks('たべる', ['食べる', 'たべる']), null); // nothing misspelled
  assert.equal(L.spellMarks('', ['x']), null);
});

test('sentence builder: phrase tiles, and other orders of particle phrases count when the verb stays last', () => {
  const toks = J.tokens(['私は毎日学校に行きます。', '', '私;わたし|は|毎日;まいにち|学校;がっこう|に|行き;いき;行く|ます|。']);
  const { chunks, end } = L.chunkSentence(toks), w = chunks.map((c) => c.s), roles = chunks.map((c, i) => L.jbRole(c, i === chunks.length - 1));
  assert.deepEqual(w, ['私は', '毎日', '学校に', '行きます']); assert.equal(end, '。');
  assert.deepEqual(roles, ['topic', '', 'goal', 'pred']);
  assert.deepEqual(L.jbPatterns(toks, chunks, end), ['wa-ga', 'place']);
  assert.equal(L.jbGrade(w, w.slice(), roles).res, 'right');
  const alt = L.jbGrade(w, ['毎日', '学校に', '私は', '行きます'], roles); assert.equal(alt.res, 'right'); assert.equal(alt.alt, true);
  assert.equal(L.jbGrade(w, ['私は', '学校に', '毎日', '行きます'], roles).res, 'close'); // 毎日 moved away from its phrase
  const bad = L.jbGrade(w, ['私は', '行きます', '学校に', '毎日'], roles); assert.equal(bad.res, 'wrong'); assert.deepEqual(bad.bad, [1, 3]);
  assert.equal(L.jbPrefix(w, ['私は', '毎日', '行きます']), 2);
  const t2 = J.tokens(['時間がない。', '', '時間;じかん|が|ない|。']);
  assert.deepEqual(L.chunkSentence(t2).chunks.map((c) => c.s), ['時間が', 'ない']); // ない after a particle is its own tile
  const t3 = J.tokens(['この本を読んだ。', '', 'この|本;ほん|を|読ん;よん;読む|だ|。']);
  assert.deepEqual(L.chunkSentence(t3).chunks.map((c) => c.s), ['この本を', '読んだ']);
});
