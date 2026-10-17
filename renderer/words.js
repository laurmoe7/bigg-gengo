// The Words page: tabs by kind of word, a search box, a kana strip and pages of word cards,
// so the list stays easy to move around however big it gets. Loads after app.js and shares its scope.
Object.assign(ui.words, { band: '0-1500', tab: 'all', sort: 'az', letter: '', page: 0, back: 'all', kind: 'noun' });

const WORDS_PER_PAGE = 48;
const isNoun = (w) => w.pos === 'noun';
const isVerb = (w) => w.pos === 'verb';
const isAdj = (w) => w.pos === 'adjective';
// [id, icon, name, which words belong]
const WORD_TABS = [
  ['all', '📚', 'All', () => true],
  ['noun', '🏷️', 'Nouns', isNoun],
  ['verb', '🏃', 'Verbs', isVerb],
  ['adj', '🎨', 'Adjectives', isAdj],
  ['other', '🧩', 'Other', (w) => !isNoun(w) && !isVerb(w) && !isAdj(w)],
  ['hard', '🎯', 'Needs work', (w) => w.reps > 0 && w.box < 4 && (w.box <= 1 || w.lapses >= 2)],
  ['new', '🌱', 'New', (w) => !w.reps],
  ['done', '✅', 'Learned', (w) => w.box >= 4],
];
const sortKey = (w) => J.toHira(w.reading || w.ja);
const firstLetter = (w) => J.kanaRow(sortKey(w));
const sortWords = (arr, how) => (how === 'new' ? arr.slice().sort((a, b) => b.created - a.created)
  : how === 'hard' ? arr.slice().sort((a, b) => a.box - b.box || (b.lapses || 0) - (a.lapses || 0) || sortKey(a).localeCompare(sortKey(b), 'ja'))
    : arr.slice().sort((a, b) => sortKey(a).localeCompare(sortKey(b), 'ja')));
const posPill = (w) => (w.pos === 'verb' ? '<span class="pill">' + (J.verbClass(w.vclass) === 'ichidan' ? 'る-verb' : J.verbClass(w.vclass) === 'godan' ? 'う-verb' : J.verbClass(w.vclass) ? 'irregular' : 'verb') + '</span> ' : w.pos === 'adjective' ? '<span class="pill">' + (w.vclass === 'na' ? 'な-adj' : 'い-adj') + '</span> ' : '');

const wordCard = (w) => `<div class="wcard"><div class="wtop"><div class="wt">${posPill(w)}<b class="jp">${wordHtml(w)}</b></div><button class="ghost mini" data-act="say" data-t="${esc(w.ja)}" title="Listen">🔊</button></div>
  <div class="we">${esc(w.en)}</div>${w.example ? `<div class="wex jp">${sentHtml(w.example, w.exTok)}</div>` : ''}
  <div class="wf"><span class="lvl">${[1, 2, 3, 4, 5].map((i) => `<i class="${w.box >= i ? 'on' : ''}"></i>`).join('')}</span><span><button class="ghost mini" data-act="word-edit" data-id="${w.id}" title="Edit">✎</button> <button class="ghost mini" data-act="word-del" data-id="${w.id}" title="Delete">🗑</button></span></div></div>`;

// does the search text match this word? (kanji, kana, romaji or English)
const wordMatches = (w, q) => {
  const t = q.trim().toLowerCase(); if (!t) return true;
  const hay = (w.ja + ' ' + (w.reading || '') + ' ' + J.toRomaji(w.reading || (J.isKana(w.ja) ? w.ja : '')) + ' ' + w.en).toLowerCase();
  return hay.includes(t) || (J.hasJa(t) ? J.toHira(hay).includes(J.toHira(t)) : hay.includes(J.toKana(t, { final: true })));
};

VIEWS.words = () => {
  const f = ui.words, all = liveWords(), m = L.mastery(S.words);
  const head = `<div class="top"><div><h1>Words</h1></div></div>`;
  const sec = f.tab === 'recall' ? 'recall' : f.tab === 'dict' || f.tab === 'suggest' ? 'dict' : 'mine';
  const secBar = `<div class="tabs"><button class="tab ${sec === 'mine' ? 'on' : ''}" data-act="wt-sec" data-v="mine">📚 My words <small>${all.length}</small></button><button class="tab ${sec === 'dict' ? 'on' : ''}" data-act="wt-sec" data-v="dict">📖 Dictionary</button><button class="tab ${sec === 'recall' ? 'on' : ''}" data-act="wt-sec" data-v="recall">🧠 Blank-page recall</button></div>`;
  const tabBtn = (id, label) => `<button class="${f.tab === id ? 'on' : ''}" data-act="wt-tab" data-t="${id}">${label}</button>`;
  const tabs = secBar + (sec === 'recall' ? '' : sec === 'mine'
    ? `<div class="seg">${WORD_TABS.map(([id, ic, name, fn]) => tabBtn(id, `${ic} ${name} <small>${all.filter(fn).length}</small>`)).join('')}${tabBtn('add', '➕ Add manually')}</div>`
    : `<div class="seg">${tabBtn('dict', '🔎 Look up')}${tabBtn('suggest', '💡 Suggested')}</div>`);
  if (f.tab === 'recall') return head + tabs + rcPage();
  if (f.tab === 'add') return head + tabs + addWordsTab();
  if (f.tab === 'suggest') return head + tabs + suggestTab();
  if (f.tab === 'dict') return head + tabs + dictTab();
  const def = WORD_TABS.find((t) => t[0] === f.tab) || WORD_TABS[0];
  let ws = all.filter(def[3]);
  if (f.q.trim()) ws = ws.filter((w) => wordMatches(w, f.q));
  const letters = J.KANA_ROWS.split('').filter((c) => ws.some((w) => firstLetter(w) === c)).concat(ws.some((w) => firstLetter(w) === '#') ? ['#'] : []);
  if (f.letter && !letters.includes(f.letter)) f.letter = '';
  const shown = sortWords(f.letter ? ws.filter((w) => firstLetter(w) === f.letter) : ws, f.sort);
  const pages = Math.max(1, Math.ceil(shown.length / WORDS_PER_PAGE));
  if (f.page >= pages) f.page = pages - 1;
  const pageWords = shown.slice(f.page * WORDS_PER_PAGE, (f.page + 1) * WORDS_PER_PAGE);
  const chip = (act, v, label, on) => `<button class="chip ${on ? 'on' : ''}" data-act="${act}" data-v="${esc(v)}">${esc(label)}</button>`;
  const toolbar = `<div class="row wbar"><input type="text" class="grow" id="w-search" placeholder="Search in Japanese, romaji or English..." value="${esc(f.q)}">
    <select id="w-sort"><option value="az" ${f.sort === 'az' ? 'selected' : ''}>あ–ん</option><option value="new" ${f.sort === 'new' ? 'selected' : ''}>Newest first</option><option value="hard" ${f.sort === 'hard' ? 'selected' : ''}>Hardest first</option></select></div>`;
  const strip = ws.length > 24 && letters.length > 1 ? `<div class="letters">${chip('wt-letter', '', 'All', !f.letter)}${letters.map((c) => chip('wt-letter', c, c, f.letter === c)).join('')}</div>` : '';
  const pager = pages > 1 ? `<div class="pager"><button class="ghost" data-act="wt-page" data-d="-1" ${f.page === 0 ? 'disabled' : ''}>‹ Previous</button><span class="muted">Page ${f.page + 1} of ${pages} · ${shown.length} words</span><button class="ghost" data-act="wt-page" data-d="1" ${f.page >= pages - 1 ? 'disabled' : ''}>Next ›</button></div>` : '';
  const empty = `<div class="empty">${f.q.trim() || f.letter ? 'No words match.' : f.tab === 'hard' ? 'Nothing needs extra work. 🌸' : f.tab === 'done' ? 'No words learned yet. Keep going, they will come! 🌱' : 'No words here yet.'}</div>`;
  return head + tabs + toolbar + strip + (pageWords.length ? `<div class="wgrid">${pageWords.map(wordCard).join('')}</div>` : empty) + pager;
};

// real example sentences for the word in the form (Tatoeba)
const exList = () => (ui.exFound ? (ui.exFound.length ? '<div class="muted" style="margin:10px 0 4px">Tap one to use it:</div>' + ui.exFound.map((p, i) => `<button class="exs" data-act="ex-use" data-i="${i}"><b class="jp">${J.sentenceRuby(p, esc)}</b><span class="muted">${esc(p[1])}</span></button>`).join('') : '<div class="muted" style="margin-top:10px">No sentences found for that word.</div>') : '');

// Suggested words: the most common Japanese words you do not have yet
const BANDS = [['0-500', 'Top 500'], ['0-1500', 'Top 1,500'], ['1500-3000', '1,500 – 3,000'], ['3000-6000', '3,000 – 6,000']];
const SUG_PER_PAGE = 24;
const POS_OF = { n: 'noun', v: 'verb', a: 'adjective' };
function suggestList() { const [lo, hi] = ui.words.band.split('-').map(Number); return L.suggestWords(FREQ, S.words, S.knownFreq, lo, hi); }
function suggestTab() {
  const f = ui.words;
  if (typeof FREQ === 'undefined') { loadData('freq').then(() => { if (ui.view === 'words' && f.tab === 'suggest') render(); }).catch(() => { f.sugErr = true; render(); }); return f.sugErr ? '<div class="empty">Could not load the word list.</div>' : '<div class="empty">Loading words...</div>'; }
  const list = suggestList(), pages = Math.max(1, Math.ceil(list.length / SUG_PER_PAGE));
  if (f.page >= pages) f.page = pages - 1;
  const shown = list.slice(f.page * SUG_PER_PAGE, (f.page + 1) * SUG_PER_PAGE);
  const card = (x) => `<div class="wcard"><div class="wtop"><div class="wt"><b class="jp">${jp(x[0], x[3])}</b>${x[4] ? ` <span class="muted" style="font-size:12px">${L.POS_NAMES[x[4]] || ''}</span>` : ''}</div><button class="ghost mini" data-act="say" data-t="${esc(x[0])}" title="Listen">🔊</button></div>
    <div class="we">${esc(x[1])}</div><div class="wf"><span class="muted" style="font-size:12px" title="Rank among the most common Japanese words">#${x[2]}</span><span><button class="ghost mini" data-act="sg-know" data-w="${esc(x[0])}" title="I already know this">✓ Know it</button> <button class="primary mini" data-act="sg-add" data-w="${esc(x[0])}">➕ Add</button></span></div></div>`;
  const pager = pages > 1 ? `<div class="pager"><button class="ghost" data-act="wt-page" data-d="-1" ${f.page === 0 ? 'disabled' : ''}>‹ Previous</button><span class="muted">Page ${f.page + 1} of ${pages} · ${list.length} words</span><button class="ghost" data-act="wt-page" data-d="1" ${f.page >= pages - 1 ? 'disabled' : ''}>Next ›</button></div>` : '';
  return `<p class="muted" style="margin:0 0 10px">The most common Japanese words that are not in your list yet (from film and TV subtitles). Adding one also finds a real example sentence for it. Meanings come from JMdict, so give them a quick check.</p>
    <div class="row wbar"><span class="chips2" style="margin:0">${BANDS.map(([v, n]) => `<button class="chip ${f.band === v ? 'on' : ''}" data-act="sg-band" data-v="${v}">${n}</button>`).join('')}</span>
    <span class="grow"></span><button class="primary" data-act="sg-addn" ${shown.length ? '' : 'disabled'}>➕ Add these ${shown.length}</button></div>
    ${shown.length ? `<div class="wgrid">${shown.map(card).join('')}</div>` : '<div class="empty">You have all of these. Try the next range! 🌸</div>'}${pager}`;
}
async function addSuggested(words) { // words: [japanese, ...]; adds them with real example sentences when found
  const items = words.map((ja) => FREQ.find((x) => x[0] === ja)).filter(Boolean);
  let idx = null; try { idx = await sentenceData(); } catch {}
  try { await loadData('dict'); } catch {}
  for (const [ja, en, , reading, ty] of items) {
    const w = L.newWord({ ja, reading, en, pos: POS_OF[ty] || 'other' }), ex = idx ? L.sentencesFor(ja, w.pos, idx, SENTENCES, 1, reading)[0] : null;
    if (typeof DICT !== 'undefined') L.enrichWord(w, DICT, dictIndex());
    if (ex) Object.assign(w, { example: ex[0], exampleEn: ex[1], exTok: ex[2] });
    S.words.push(w);
  }
  gainXp(Math.min(12, items.length * XP.addWord)); save(); toast(items.length === 1 ? 'Added ' + items[0][0] : 'Added ' + items.length + ' words'); render();
}

// Dictionary: Japanese to English or English to Japanese, from JMdict
let DICT_IX = null;
const haveWord = (ja, reading) => liveWords().some((x) => x.ja === ja && (!reading || !x.reading || x.reading === reading));
const dictIndex = () => (DICT_IX = DICT_IX || L.buildDictIndex(DICT));
const dictMean = (e) => L.dictExplain(DICT, dictIndex(), e); // the meaning, plus a note on how the word conjugates
let FREQ_RANK = null; // word → how common it is, so "also a form of" only names words worth knowing
const freqRank = () => { if (typeof FREQ === 'undefined') { loadData('freq').catch(() => {}); return null; } if (!FREQ_RANK) { FREQ_RANK = new Map(); FREQ.forEach((x) => { if (!FREQ_RANK.has(x[0])) FREQ_RANK.set(x[0], x[2]); }); } return FREQ_RANK; };
const formLabel = (e, q) => L.formLabel(e, q.trim()) || 'form'; // "past (た)" when q is 食べた and e is 食べる
const alsoLine = (q) => { const a = L.alsoFormOf(DICT, dictIndex(), q, freqRank()); return a.length ? 'Also the ' + a.map((x) => `${x.label} of ${x.e[0]} (${dictMean(x.e).mean.split(/[;,]/)[0]})`).join(', and the ') + '.' : ''; };
// the forms worth seeing on a dictionary card: the polite, て, negative and past forms of a verb; negative and past of an adjective
const formsLine = (e) => {
  if (e[1] === 'v') { const f = J.verbForms(e[0], String(e[3] || '').split(',')[0]); return f ? ['masu', 'te', 'nai', 'ta'].map((k) => J.VERB_FORM_NAMES[k].replace(/ \(.*\)/, '').replace('polite', 'ます') + ': ' + f[k]).join(' · ') : ''; }
  if (e[1] === 'a') { const f = J.adjForms(e[0], e[3] || 'i'); return f ? 'negative: ' + f.negative + ' · past: ' + f.past + ' · て-form: ' + f.te : ''; }
  return '';
};
function dictResults(q) {
  const res = L.dictSearch(DICT, dictIndex(), q, 30);
  if (!q.trim()) return '<div class="empty">Type a Japanese word (kanji, kana or romaji) or an English word to look it up. You can also search for a form, like <b>たべた</b> or <b>ikimasu</b>.</div>';
  if (!res.length) return '<div class="empty">Nothing found for that word.</div>';
  let alsoDone = false; const also = (e, how) => { if (how !== 'word' || alsoDone) return ''; alsoDone = true; const t = alsoLine(q.trim()); return t ? `<div class="wnote">${esc(t)}</div>` : ''; };
  return '<div class="wgrid">' + res.map(({ e, how }) => `<div class="wcard"><div class="wtop"><div class="wt"><b class="jp">${jp(e[0], e[2])}</b> <span class="muted" style="font-size:12px">${L.POS_NAMES[e[1]] || ''}</span></div><button class="ghost mini" data-act="say" data-t="${esc(e[0])}" title="Listen">🔊</button></div>
    <div class="we">${esc(dictMean(e).mean)}</div>${dictMean(e).note ? `<div class="wnote">${esc(dictMean(e).note)}</div>` : ''}${also(e, how)}${formsLine(e) ? `<div class="wex jp">${esc(formsLine(e))}</div>` : ''}
    <div class="wf"><span class="muted" style="font-size:12px">${how === 'form' ? esc(q.trim()) + ' is the ' + esc(formLabel(e, q)) : how === 'english' ? 'English match' : ''}</span>${haveWord(e[0], e[2]) ? '<span class="have">✓ In My words</span>' : `<button class="primary mini" data-act="dict-add" data-w="${esc(e[0])}" data-t="${e[1]}" data-r="${esc(e[2])}">➕ Add</button>`}</div></div>`).join('') + '</div>';
}
function dictTab() {
  if (typeof DICT === 'undefined') { loadData('dict').then(() => { if (ui.view === 'words' && ui.words.tab === 'dict') render(); }).catch(() => {}); return '<div class="empty">Loading the dictionary...</div>'; }
  return `<p class="muted" style="margin:0 0 10px">${DICT.length.toLocaleString()} Japanese entries from JMdict. Find a word, then press Add to put it in My words.</p>
    <div class="row wbar"><input type="text" class="grow" id="d-q" data-focus placeholder="Look up a Japanese or English word..." value="${esc(ui.words.dq || '')}"></div><div id="d-res">${dictResults(ui.words.dq || '')}</div>`;
}

// what kind of word a manual entry is -> the saved pos and conjugation class
const WORD_KINDS = [['noun', 'Noun'], ['ichidan', 'Verb: る-verb (ichidan)'], ['godan', 'Verb: う-verb (godan)'], ['suru', 'Verb: する / 来る'], ['i', 'い-adjective'], ['na', 'な-adjective'], ['other', 'Other (adverb, particle...)']];
const GODAN_TAGS = { う: 'v5u', く: 'v5k', ぐ: 'v5g', す: 'v5s', つ: 'v5t', ぬ: 'v5n', ぶ: 'v5b', む: 'v5m', る: 'v5r' };
function kindToWord(kind, ja) {
  if (kind === 'noun') return { pos: 'noun', vclass: '' };
  if (kind === 'ichidan') return { pos: 'verb', vclass: 'v1' };
  if (kind === 'godan') return { pos: 'verb', vclass: /(行く|^いく)$/.test(ja) ? 'v5k-s' : GODAN_TAGS[ja.slice(-1)] || 'v5r' };
  if (kind === 'suru') return { pos: 'verb', vclass: /来る$|くる$/.test(ja) ? 'vk' : 'vs-i' };
  if (kind === 'i') return { pos: 'adjective', vclass: /いい$/.test(ja) ? 'ix' : 'i' };
  if (kind === 'na') return { pos: 'adjective', vclass: 'na' };
  return { pos: 'other', vclass: '' };
}
const kindOf = (w) => (w.pos === 'noun' ? 'noun' : w.pos === 'verb' ? (J.verbClass(w.vclass) === 'ichidan' ? 'ichidan' : J.verbClass(w.vclass) === 'godan' ? 'godan' : 'suru') : w.pos === 'adjective' ? (w.vclass === 'na' ? 'na' : 'i') : 'other');
function addWordsTab() {
  const ed = ui.edit ? S.words.find((w) => w.id === ui.edit) : null, kind = ed ? kindOf(ed) : ui.words.kind;
  return `<div class="ws-grid">
  <div class="card"><h2>${ed ? 'Edit word' : 'Add a word'}</h2>
    <div class="row"><input type="text" class="grow jp" id="w-ja" data-focus data-kana placeholder="Japanese word (kanji or kana)" value="${esc(ed ? ed.ja : '')}"><input type="text" class="grow jp" id="w-rd" data-kana placeholder="Reading in kana (if it has kanji)" value="${esc(ed ? ed.reading : '')}"></div>
    <div class="row" style="margin-top:8px"><input type="text" class="grow" id="w-en" placeholder="English" value="${esc(ed ? ed.en : '')}" data-enter="word-save"><select id="w-kind">${WORD_KINDS.map(([id, name]) => `<option value="${id}" ${kind === id ? 'selected' : ''}>${name}</option>`).join('')}</select></div>
    <div class="row" style="margin-top:8px"><input type="text" class="grow jp" id="w-ex" data-kana placeholder="Example sentence (optional but great for worksheets)" value="${esc(ed ? ed.example : '')}" data-enter="word-save">
    <button class="ghost" data-act="dict-fill" title="Fill in the reading, kind and English from the dictionary">📖 Look up</button>
    <button class="ghost" data-act="ex-find" title="Look up real sentences that use this word">🔎 Find examples</button>
    <button class="primary" data-act="word-save">${ed ? 'Save' : 'Add'}</button>${ed ? '<button class="ghost" data-act="word-cancel">Cancel</button>' : ''}</div>
    <p class="muted" style="margin:8px 0 0;font-size:13px">Type romaji and it turns into kana as you go (or use your Japanese keyboard). Kanji need a Japanese keyboard, or use Look up.</p>
    <div id="ex-list">${exList()}</div></div>
  <div class="card"><h2>Add many at once</h2>
    <p class="muted" style="margin-top:0">Paste in any of these: one word per line like <code>食べる（たべる）= to eat | 毎日ご飯を食べます。</code> (also <code>;</code>, tab or <code>-</code>, and <code>食べる; たべる; to eat</code>); a list copied from a course page, where each word is followed by a blank line and its English (with or without a <code>Start</code> in front); or the JSON Claude gave you.</p>
    <textarea id="w-bulk" class="big-paste" placeholder="食べる（たべる）= to eat">${esc(ui.draftText)}</textarea>
    <div class="row" style="margin-top:8px"><button class="primary" data-act="bulk-add">Import</button></div></div></div>`;
}

Object.assign(ACT, {
  'dict-add': async (el) => {
    const e = DICT.find((x) => x[0] === el.dataset.w && x[1] === el.dataset.t && x[2] === el.dataset.r); if (!e) return;
    const o = L.dictToWord(e, dictMean(e).mean); let ex = null; try { ex = (await examplesFor(o.ja, o.pos, 1, o.reading))[0]; } catch {}
    if (haveWord(o.ja, o.reading)) return toast(o.ja + ' is already in your list');
    S.words.push(L.newWord(Object.assign(o, ex ? { example: ex[0], exampleEn: ex[1], exTok: ex[2] } : {}))); gainXp(XP.addWord); save(); toast('Added ' + o.ja + ' to My words'); render();
  },
  'dict-fill': async () => {
    const q = $('#w-ja').value.trim() || $('#w-rd').value.trim(); if (!q) return toast('Type the Japanese word first.');
    try { await loadData('dict'); } catch { return toast('Could not load the dictionary.'); }
    const r = L.dictSearch(DICT, dictIndex(), q, 1)[0]; if (!r) return toast('Not found in the dictionary.');
    const o = L.dictToWord(r.e, dictMean(r.e).mean); $('#w-ja').value = o.ja; $('#w-rd').value = o.reading; if (!$('#w-en').value) $('#w-en').value = o.en;
    const kind = o.pos === 'noun' ? 'noun' : o.pos === 'verb' ? (J.verbClass(o.vclass) === 'ichidan' ? 'ichidan' : J.verbClass(o.vclass) === 'godan' ? 'godan' : 'suru') : o.pos === 'adjective' ? (o.vclass === 'na' ? 'na' : 'i') : 'other';
    $('#w-kind').value = kind; ui.words.kind = kind; ui.lookupClass = o.vclass;
    toast(r.how === 'form' ? q + ' is a form of ' + o.ja + ' (filled in for ' + o.ja + ')' : 'Filled in');
  },
  'sg-band': (el) => { ui.words.band = el.dataset.v; ui.words.page = 0; render(); },
  'sg-add': (el) => addSuggested([el.dataset.w]),
  'sg-addn': () => addSuggested(suggestList().slice(ui.words.page * SUG_PER_PAGE, (ui.words.page + 1) * SUG_PER_PAGE).map((x) => x[0])),
  'sg-know': (el) => { S.knownFreq.push(el.dataset.w); save(); render(); },
  'ex-find': async () => {
    const ja = $('#w-ja').value.trim(); if (!ja) return toast('Type the Japanese word first.');
    const pos = kindToWord($('#w-kind').value, ja).pos;
    try { ui.exFound = await examplesFor(ja, pos, 6, $('#w-rd').value.trim()); } catch { return toast('Could not load the sentences.'); }
    const l = $('#ex-list'); if (l) l.innerHTML = exList();
  },
  'ex-use': (el) => { const p = ui.exFound && ui.exFound[+el.dataset.i]; if (!p) return; $('#w-ex').value = p[0]; ui.exEn = p; toast('Using that sentence'); },
  'wt-sec': (el) => { const f = ui.words; f.tab = el.dataset.v === 'recall' ? 'recall' : el.dataset.v === 'mine' ? (f.lastMine || 'all') : (f.lastDict || 'dict'); f.page = 0; ui.edit = null; render(); $('#main').scrollTop = 0; },
  'wt-tab': (el) => { const f = ui.words; f.tab = el.dataset.t; if (f.tab === 'dict' || f.tab === 'suggest') f.lastDict = f.tab; else f.lastMine = f.tab; f.page = 0; f.letter = ''; if (f.tab !== 'add') { ui.edit = null; f.back = f.tab; } render(); $('#main').scrollTop = 0; },
  'wt-letter': (el) => { ui.words.letter = el.dataset.v; ui.words.page = 0; render(); },
  'wt-page': (el) => { ui.words.page = Math.max(0, ui.words.page + +el.dataset.d); render(); $('#main').scrollTop = 0; },
  'word-edit': (el) => { const f = ui.words; if (f.tab !== 'add') f.back = f.tab; ui.edit = el.dataset.id; f.tab = 'add'; render(); $('#main').scrollTop = 0; },
  'word-cancel': () => { ui.edit = null; ui.words.tab = ui.words.back || 'all'; render(); },
});
document.addEventListener('input', (e) => {
  if (e.target.id === 'w-search') { ui.words.q = e.target.value; ui.words.page = 0; const pos = e.target.selectionStart; render(); const s = $('#w-search'); if (s) { s.focus(); s.setSelectionRange(pos, pos); } }
  else if (e.target.id === 'w-bulk') ui.draftText = e.target.value;
  else if (e.target.id === 'd-q') { ui.words.dq = e.target.value; const r = $('#d-res'); if (r) r.innerHTML = dictResults(ui.words.dq); }
});
document.addEventListener('change', (e) => { if (e.target.id === 'w-sort') { ui.words.sort = e.target.value; ui.words.page = 0; render(); } else if (e.target.id === 'w-kind') ui.words.kind = e.target.value; });
