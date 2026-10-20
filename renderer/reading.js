// Reading: short stories that Claude writes with your own words. Copy a prompt, paste the reply, then read it here, with furigana:
// tap any word for its meaning (a conjugated word is looked up by its dictionary form), hear each paragraph, peek at the English,
// answer a few questions and add new words. Loads after app.js and shares its scope.
const rdPrefs = () => (S.storyPrefs = Object.assign({ level: (S.settings && S.settings.jlpt) || 'N5', length: 'medium', topic: '', useWords: true, note: '' }, S.storyPrefs || {}));
const stories = () => (S.stories = S.stories || []);
const rd = (ui.rd = ui.rd || { id: '', tr: {}, tap: '', tapS: '', reply: '' });
const rdStory = () => stories().find((s) => s.id === rd.id);

// the words a story should use: tricky ones first, then a changing mix of the ones that still need work, then recent ones
function storyWords() {
  const live = liveWords().filter((w) => w.reps > 0), seen = new Set(), out = [];
  const add = (arr) => arr.forEach((w) => { if (!seen.has(w.id) && out.length < 12) { seen.add(w.id); out.push(w); } });
  add(L.trickyWords(live).slice(0, 4));
  add(L.pick(live.filter((w) => w.box < 4), 12));
  add(live.slice().sort((a, b) => (b.last || '').localeCompare(a.last || '')));
  return out;
}
const haveJa = (ja) => liveWords().some((w) => w.ja === ja || (!!w.reading && w.reading === ja));
const isWordTok = (s) => /[\p{L}\p{N}々〆ー]/u.test(s);
// a paragraph as tappable words: Claude's own split (with furigana) when it fits the text, else cut by the dictionary
function rdTokens(p) {
  const toks = p.tok ? J.tokens([p.ja, '', p.tok]) : null;
  if (toks && toks.map((t) => t.s).join('') === p.ja) return toks;
  const has = typeof DICT !== 'undefined' ? (x) => dictIndex().forms.has(J.norm(x)) : null;
  return L.tokenize(p.ja, has).map((x) => (x.w ? { s: x.w, r: '', b: x.w } : { s: x.t, r: '', b: '', plain: true }));
}

VIEWS.read = () => { const s = rdStory(); return s ? storyView(s) : readHome(); };

function readHome() {
  const p = rdPrefs(), ws = storyWords(), list = stories().slice().reverse();
  const sel = (id, cur, opts) => `<select id="${id}">${opts.map(([v, l]) => `<option value="${esc(v)}" ${cur === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  return `<div class="top"><div><h1>Reading</h1><p class="sub">Short stories with your own words</p></div></div>
  <div class="ws-grid">
    <div class="card"><h2>New story</h2>
      <div class="row"><label class="muted">Level ${sel('rd-level', p.level, Object.keys(L.STORY_LEVELS).map((k) => [k, k]))}</label>
        <label class="muted">Length ${sel('rd-length', p.length, [['short', 'Short'], ['medium', 'Medium'], ['long', 'Long']])}</label>
        <label class="muted">Topic ${sel('rd-topic', p.topic, [['', 'Anything']].concat(L.TOPICS.map((t) => [t, t])))}</label></div>
      <label class="row muted" style="margin-top:10px"><input type="checkbox" id="rd-words" ${p.useWords ? 'checked' : ''}> Use my words${ws.length ? ': <span class="jp">' + esc(ws.map((w) => w.ja).join('、')) + '</span>' : ' (none practised yet)'}</label>
      <input type="text" id="rd-note" placeholder="Anything else? (optional, e.g. a funny story about a cat)" value="${esc(p.note)}" style="width:100%;margin-top:10px">
      <div class="row" style="margin-top:10px"><button class="primary" data-act="rd-copy">📋 Copy prompt for Claude</button></div>
      <p class="muted">Paste it into Claude, then paste the whole reply here:</p>
      <textarea id="rd-reply" class="big-paste" placeholder='{"story": ...}'>${esc(rd.reply)}</textarea>
      <div class="row" style="margin-top:8px"><button class="primary" data-act="rd-make">📖 Make the story</button></div></div>
    <div class="card"><h2>Your stories</h2>${list.length ? list.map((s) => `<div class="lesson" style="margin:6px 0"><div class="lt"><span class="jp">${esc(s.title)}</span><div class="muted" style="font-weight:600;font-size:13px">${esc(s.level || '')} · ${new Date(s.created).toLocaleDateString()}${s.done ? ` · ✓ ${s.score} of ${s.questions.length} right` : ''}</div></div><button class="ghost" data-act="rd-open" data-id="${s.id}">Read</button><button class="ghost mini" data-act="rd-del" data-id="${s.id}" title="Delete">🗑</button></div>`).join('') : '<p class="muted">No stories yet. Make your first one on the left. 🌸</p>'}</div>
  </div>`;
}

function storyView(s) {
  const all = !!rd.all, mine = new Set();
  liveWords().forEach((w) => { mine.add(w.ja); if (w.reading) mine.add(w.reading); });
  const toks = (p) => rdTokens(p).map((t) => (t.plain || !isWordTok(t.s) ? J.rubyHtml(t.s, t.r, esc)
    : `<span class="rw ${mine.has(t.b) || mine.has(t.s) ? 'known' : ''} ${rd.tapS === t.s && rd.tap === t.b ? 'sel' : ''}" data-act="rd-tap" data-w="${esc(t.b)}" data-s="${esc(t.s)}">${J.rubyHtml(t.s, t.r, esc)}</span>`)).join('');
  const paras = s.paragraphs.map((p, i) => `<div class="rd-p"><button class="ghost mini" data-act="say" data-t="${esc(p.ja)}" title="Listen">🔊</button><div class="grow"><p class="rd-nl jp">${toks(p)}</p>${all || rd.tr[i] ? `<p class="muted rd-en">${esc(p.en)}</p>` : p.en ? `<button class="ghost mini" data-act="rd-tr" data-i="${i}">Show English</button>` : ''}</div></div>`).join('');
  let tap = '';
  if (rd.tap) {
    const r = typeof DICT !== 'undefined' ? L.dictSearch(DICT, dictIndex(), rd.tap, 1)[0] : null;
    const canAdd = r && !haveJa(r.e[0]);
    tap = `<div class="card rd-tapbox"><div class="row"><div class="grow">${rd.tapS && rd.tapS !== rd.tap ? `<div class="muted jp" style="font-size:13px">${esc(rd.tapS)} → ${esc(rd.tap)}</div>` : ''}${meaningHtml(rd.tap)}</div><button class="ghost mini" data-act="say" data-t="${esc(rd.tap)}" title="Listen">🔊</button>${canAdd ? `<button class="ghost mini" data-act="rd-add">＋ Add to my words</button>` : ''}<button class="ghost mini" data-act="rd-tap" data-w="" title="Close">✕</button></div></div>`;
  }
  const gl = s.glossary.length ? `<div class="card" style="margin-top:14px"><h2>New words in this story</h2>${s.glossary.map((g, i) => `<div class="dl-row"><div><b class="jp">${jp(g.ja, g.reading)}</b> <small class="muted">${esc(g.en)}</small></div><span><button class="ghost mini" data-act="say" data-t="${esc(g.ja)}" title="Listen">🔊</button> ${haveJa(g.ja) ? '<span class="muted">✓ in My words</span>' : `<button class="ghost mini" data-act="rd-gadd" data-i="${i}">＋ Add</button>`}</span></div>`).join('')}</div>` : '';
  const ans = s.answers || {};
  const qs = s.questions.length ? `<div class="card" style="margin-top:14px"><h2>Did you get it?</h2>${s.questions.map((q, i) => `<div class="rd-q"><b class="jp">${i + 1}. ${esc(q.q)}</b>${ans[i] != null && q.en ? `<div class="muted">${esc(q.en)}</div>` : ''}<div class="opts">${q.options.map((o) => `<button class="jp ${ans[i] != null ? (o === q.answer ? 'ok' : o === ans[i] ? 'no' : '') : ''}" data-act="rd-pick" data-i="${i}" data-v="${esc(o)}">${esc(o)}</button>`).join('')}</div></div>`).join('')}
    ${s.done ? `<p class="rd-done">${s.score === s.questions.length ? 'All right! You really read that. 💗' : `${s.score} of ${s.questions.length} right. Read it once more and it will click. 🌸`}</p>` : ''}</div>` : '';
  return `<div class="top"><div><h1 class="jp">${esc(s.title)}</h1><p class="sub">${esc(s.level || '')} · tap a word to see what it means · <span class="rw known">your words</span> are marked</p></div>
    <div class="row"><button class="ghost" data-act="say" data-t="${esc(s.paragraphs.map((p) => p.ja).join(''))}">🔊 Read it all</button><button class="ghost ${all ? 'on' : ''}" data-act="rd-all">${all ? 'Hide' : 'Show'} English</button><button class="ghost" data-act="rd-back">All stories</button></div></div>
    ${tap}<div class="card reader rd-text">${paras}</div>${qs}${gl}`;
}

// adds a word from the story, with the story sentence it stands in as its example
function rdAddWord(o, s, surface) {
  if (haveJa(o.ja)) return toast(o.ja + ' is already in your list');
  let ex = '';
  for (const p of s.paragraphs) { ex = L.sentenceWith(p.ja, surface || o.ja); if (ex) break; }
  S.words.push(L.newWord(Object.assign(o, { example: ex, exampleEn: '', lesson: 'Reading: ' + s.title.slice(0, 40) })));
  gainXp(XP.readAdd); save(); toast('Added ' + o.ja + ' to My words'); render();
}
Object.assign(ACT, {
  'rd-copy': () => {
    const p = rdPrefs(); p.level = readField('rd-level') || p.level; p.length = readField('rd-length') || p.length; p.topic = readField('rd-topic'); p.useWords = !!($('#rd-words') || {}).checked; p.note = readField('rd-note').trim(); save();
    copyText(L.storyPrompt({ level: p.level, length: p.length, topic: p.topic, note: p.note, words: p.useWords ? storyWords() : [] }));
  },
  'rd-make': () => {
    const text = readField('rd-reply'); rd.reply = text;
    if (!text.trim()) return toast('Paste Claude\'s reply first');
    const r = L.parseStory(text);
    if (r.error) { toast(r.error); return render(); }
    const s = Object.assign(r.story, { id: L.uid(), created: Date.now(), level: rdPrefs().level, answers: {}, done: false, score: 0 });
    stories().push(s); rd.reply = ''; rd.id = s.id; rd.tr = {}; rd.tap = ''; rd.tapS = ''; rd.all = false; save();
    if (typeof DICT === 'undefined') loadData('dict').then(() => { if (ui.view === 'read') render(); }).catch(() => {});
    render(); $('#main').scrollTop = 0;
  },
  'rd-open': (el) => { rd.id = el.dataset.id; rd.tr = {}; rd.tap = ''; rd.tapS = ''; rd.all = false; if (typeof DICT === 'undefined') loadData('dict').then(() => { if (ui.view === 'read') render(); }).catch(() => {}); render(); $('#main').scrollTop = 0; },
  'rd-back': () => { rd.id = ''; rd.tap = ''; render(); },
  'rd-del': (el) => { const s = stories().find((x) => x.id === el.dataset.id); S.stories = stories().filter((x) => x.id !== el.dataset.id); save(); if (s) toast('Deleted ' + s.title); render(); },
  'rd-tr': (el) => { rd.tr[el.dataset.i] = true; render(); },
  'rd-all': () => { rd.all = !rd.all; render(); },
  'rd-tap': (el) => {
    const k = $('#main').scrollTop;
    rd.tap = el.dataset.w || ''; rd.tapS = el.dataset.s || ''; if (rd.tap) speak(rd.tapS || rd.tap);
    if (rd.tap && typeof DICT === 'undefined') loadData('dict').then(() => { if (ui.view === 'read') render(); }).catch(() => {});
    render(); $('#main').scrollTop = k;
  },
  'rd-add': async () => {
    const s = rdStory(); if (!s || !rd.tap) return;
    try { await loadData('dict'); } catch { return toast('Could not load the dictionary.'); }
    const r = L.dictSearch(DICT, dictIndex(), rd.tap, 1)[0]; if (!r) return toast('Not found in the dictionary.');
    const k = $('#main').scrollTop; rdAddWord(L.dictToWord(r.e, dictMean(r.e).mean), s, rd.tapS); $('#main').scrollTop = k;
  },
  'rd-gadd': async (el) => {
    const s = rdStory(), g = s && s.glossary[+el.dataset.i]; if (!g) return;
    let o = { ja: g.ja, reading: g.reading, en: g.en };
    try { await loadData('dict'); const r = L.dictSearch(DICT, dictIndex(), g.ja, 1)[0]; if (r && r.e[0] === g.ja) o = Object.assign(L.dictToWord(r.e, dictMean(r.e).mean), { en: g.en }); } catch {} // the kind of word (and verb class) from the dictionary
    const k = $('#main').scrollTop; rdAddWord(o, s); $('#main').scrollTop = k;
  },
  'rd-pick': (el) => {
    const s = rdStory(); if (!s) return;
    const i = +el.dataset.i, q = s.questions[i]; s.answers = s.answers || {};
    if (!q || s.answers[i] != null) return;
    s.answers[i] = el.dataset.v; const ok = el.dataset.v === q.answer;
    chime(ok ? 'ok' : 'bad'); gainXp(ok ? XP.itemRight : XP.itemWrong);
    if (!s.done && Object.keys(s.answers).length === s.questions.length) {
      s.done = true; s.score = s.questions.filter((x, j) => s.answers[j] === x.answer).length;
      chime('goal'); gainXp(XP.sheet); if (s.score === s.questions.length) confetti();
    }
    save(); const k = $('#main').scrollTop; render(); $('#main').scrollTop = k;
  },
});
