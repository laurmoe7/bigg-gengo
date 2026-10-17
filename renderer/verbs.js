// Conjugation trainer (a tab on the Grammar page): make the て-form, the negative, the past... of verbs and adjectives.
// Words come from the starter list and from the verbs and adjectives in your own word list. The ones you miss come back more often.
// Loads after app.js and shares its scope.

const VT_POOLS = [['mine', 'My verbs and adjectives'], ['starter', 'The starter list'], ['all', 'Everything']];
const VT_FOCUS = [['mixed', 'A mix'], ['te', 'て-form'], ['ta', 'Past (た)'], ['nai', 'Negative (ない)'], ['masu', 'Polite (ます)'], ['potential', 'Can do'], ['volitional', "Let's"], ['adj', 'Adjectives only']];
const vtState = (ui.vt = ui.vt || { screen: 'start', pool: 'all', focus: 'mixed', n: 10, items: [], i: 0, res: null, typed: '', right: 0 });
const vtStats = () => (S.verbs = S.verbs || {});
const vtWord = (w) => ({ ja: w.ja, reading: w.reading || '', en: w.en, pos: w.pos, vclass: w.vclass || '' });
// a word can be drilled when we know how it conjugates (verbs by class, adjectives by i / na)
const vtOk = (w) => (w.pos === 'verb' && J.verbClass(w.vclass)) || (w.pos === 'adjective' && ['i', 'ix', 'na'].includes(w.vclass));
function vtPool(pool) {
  const mine = liveWords().filter(vtOk).map(vtWord), starter = SEED_WORDS.filter(vtOk).map(vtWord), seen = new Set(), out = [];
  for (const w of pool === 'mine' ? mine : pool === 'starter' ? starter : mine.concat(starter)) if (!seen.has(w.ja)) { seen.add(w.ja); out.push(w); }
  return out;
}
const VERB_KEYS = ['te', 'ta', 'nai', 'masu', 'potential', 'volitional'], ADJ_KEYS2 = ['negative', 'past', 'te', 'adverb'];
// one question per word: the ones you miss most are picked first
function vtBuild(words, focus, n) {
  const st = vtStats(), score = (w) => ((st[w.ja] || {}).bad || 0) * 2 - ((st[w.ja] || {}).ok || 0) + Math.random() * 2.5;
  let pool = words; if (focus === 'adj') pool = words.filter((w) => w.pos === 'adjective'); else if (focus !== 'mixed') pool = words.filter((w) => w.pos === 'verb');
  return L.shuffle(pool.slice().sort((a, b) => score(b) - score(a)).slice(0, n)).map((w) => ({ w, key: w.pos === 'adjective' ? ADJ_KEYS2[Math.floor(Math.random() * ADJ_KEYS2.length)] : focus === 'mixed' || focus === 'adj' ? VERB_KEYS[Math.floor(Math.random() * VERB_KEYS.length)] : focus }));
}
const vtFormsOf = (w, sp) => (w.pos === 'adjective' ? J.adjForms(sp, w.vclass) : J.verbForms(sp, w.vclass));
// the accepted answers: the form in the word's own spelling and in kana (kana, kanji and romaji typing all work)
function vtAnswers(it) { const w = it.w, a = [vtFormsOf(w, w.ja)[it.key]]; if (w.reading) a.push(vtFormsOf(w, w.reading)[it.key]); return a.filter(Boolean); }
const vtKeyName = (it) => (it.w.pos === 'adjective' ? J.ADJ_FORM_NAMES : J.VERB_FORM_NAMES)[it.key];
function vtView() {
  const s = vtState;
  if (s.screen === 'q') {
    const it = s.items[s.i], w = it.w, done = !!s.res, ans = vtAnswers(it);
    const rule = w.pos === 'verb' ? J.formRule(it.key, w.ja, w.vclass) : '';
    return `<div class="card vt-card"><div class="muted" style="font-weight:800;margin-bottom:6px">Question ${s.i + 1} of ${s.items.length}</div><div class="bar" style="margin-bottom:14px"><i style="width:${Math.round((s.i / s.items.length) * 100)}%"></i></div>
        <div class="vt-label">Make the ${esc(vtKeyName(it))}</div><div class="vt-verb jp">${jp(w.ja, w.reading)}</div><div class="muted" style="margin:-2px 0 10px">${esc(w.en)} · ${esc(L.CLASS_NAMES[w.pos === 'adjective' ? w.vclass : String(w.vclass).split(',')[0]] || '')}</div>
        <input type="text" class="big-in jp" id="vt-in" data-focus data-kana data-enter="vt-submit" autocomplete="off" spellcheck="false" placeholder="Type it (kana, kanji or romaji)..." value="${esc(s.typed)}" ${done ? 'disabled' : ''}>
        ${done ? `<div class="verdict ${s.res}"><div class="v-head"><b class="v-title">${s.res === 'right' ? '✓ Right!' : '✗ Not quite'}</b></div>${s.res === 'wrong' ? `<div class="v-row"><span class="v-label">Answer</span><div class="v-text ans jp">${esc(ans[0])}${ans[1] && ans[1] !== ans[0] ? ' <span class="muted">(' + esc(ans[1]) + ')</span>' : ''}</div></div>` : ''}${rule ? `<p class="muted vt-note">${esc(rule)}</p>` : ''}</div>` : ''}
        <div class="row" style="margin-top:14px">${done ? `<button class="primary" data-act="vt-next">${s.i + 1 >= s.items.length ? 'See my results' : 'Next'} ➜</button><span class="muted">or press Enter</span>` : '<button class="primary" data-act="vt-submit">Check</button><button class="ghost" data-act="vt-skip">I don\'t know</button>'}</div></div>`;
  }
  if (s.screen === 'done') {
    const missed = s.items.filter((x) => x.bad);
    return `<div class="card vt-card"><h2 style="text-align:center;margin-top:0">Round finished</h2><div class="vt-score">${s.right} <small>/ ${s.items.length}</small></div><p class="muted" style="text-align:center;margin:0 0 12px">${s.right === s.items.length ? 'Perfect! 🌟' : 'Words you missed will come back more often. 🌱'}</p>
      ${missed.length ? `<h3 class="dl-h">To practise</h3>${missed.map((x) => `<div class="dl-row"><div><b class="jp">${jp(x.w.ja, x.w.reading)}</b> → <b class="jp">${esc(vtAnswers(x)[0])}</b><small class="muted">${esc(vtKeyName(x))} · ${esc(x.w.en)}</small></div></div>`).join('')}` : ''}
      <div class="row" style="margin-top:14px"><button class="primary" data-act="vt-again">Practise again</button>${missed.length ? '<button class="ghost" data-act="vt-missed">Only the ones I missed</button>' : ''}<button class="ghost" data-act="vt-menu">Change what I practise</button></div></div>`;
  }
  const chip = (act, id, name, cur) => `<button class="chip ${cur === id ? 'on' : ''}" data-act="${act}" data-v="${id}">${cur === id ? '✓ ' : ''}${esc(name)}</button>`;
  const n = vtPool(s.pool).length;
  return `<div class="card" style="max-width:760px"><h2>Which words?</h2><div class="chips2">${VT_POOLS.map(([id, nm]) => chip('vt-pool', id, nm, s.pool)).join('')}</div>
      <h2 style="margin-top:16px">What do you want to practise?</h2><div class="chips2">${VT_FOCUS.map(([id, nm]) => chip('vt-focus', id, nm, s.focus)).join('')}</div>
      <div class="row" style="margin-top:16px"><label class="muted">Questions <select id="vt-n">${[5, 10, 15, 20].map((k) => `<option ${s.n === k ? 'selected' : ''}>${k}</option>`).join('')}</select></label><button class="primary" data-act="vt-go">▶ Start</button><span class="muted">${n} words to draw from</span></div>
      <p class="muted" style="margin:10px 0 0;font-size:13px">Words you get wrong come back more often. Every right answer gives a little XP. Verbs and adjectives you add on the Words page join in once the app knows how they conjugate (the dictionary Look up button fills that in).</p></div>`;
}
function vtStartRound(words) {
  const s = vtState; if (!words.length) return toast('No verbs or adjectives found for that choice yet. Try another one.');
  s.items = vtBuild(words, s.focus, s.n); if (!s.items.length) return toast('Nothing to ask for that choice. Try a mix.');
  s.i = 0; s.res = null; s.typed = ''; s.right = 0; s.screen = 'q'; render();
}
function vtAnswer(typed) {
  const s = vtState, it = s.items[s.i]; if (s.res) return;
  const t = J.norm(typed), ok = !!t && vtAnswers(it).some((a) => J.norm(a) === t), st = (vtStats()[it.w.ja] = vtStats()[it.w.ja] || { ok: 0, bad: 0 });
  s.typed = typed; s.res = ok ? 'right' : 'wrong'; it.bad = !ok; if (ok) { s.right++; st.ok++; gainXp(6); chime('ok'); } else { st.bad++; gainXp(1); chime('bad'); }
  save(); render();
}

// ---------- the Grammar page: cheat sheets and conjugation practice ----------
ui.grTab = ui.grTab || 'sheets';
VIEWS.grammar = () => {
  const tabs = `<div class="tabs">${[['sheets', '🧠 Cheat sheets'], ['verbs', '🔧 Conjugation practice']].map(([id, n]) => `<button class="tab ${ui.grTab === id ? 'on' : ''}" data-act="gr-tab" data-v="${id}">${n}</button>`).join('')}</div>`;
  const head = '<div class="top"><div><h1>Grammar</h1></div></div>' + tabs;
  return head + (ui.grTab === 'verbs' ? vtView() : `<div class="grid g2 gram">${GRAMMAR.map((g) => `<div class="card"><h3>${g.t}</h3>${g.b.map((p) => `<p>${p}</p>`).join('')}</div>`).join('')}</div>`);
};
Object.assign(ACT, {
  'gr-tab': (el) => { ui.grTab = el.dataset.v; render(); },
  'vt-pool': (el) => { vtState.pool = el.dataset.v; render(); },
  'vt-focus': (el) => { vtState.focus = el.dataset.v; render(); },
  'vt-go': () => { vtState.n = +readField('vt-n') || vtState.n; vtStartRound(vtPool(vtState.pool)); },
  'vt-submit': () => vtAnswer(readField('vt-in')),
  'vt-skip': () => vtAnswer(''),
  'vt-next': () => { const s = vtState; if (!s.res) return; if (s.i + 1 >= s.items.length) { s.screen = 'done'; gainXp(15); chime('goal'); if (s.right === s.items.length) confetti(); } else { s.i++; s.res = null; s.typed = ''; } render(); },
  'vt-again': () => vtStartRound(vtPool(vtState.pool)),
  'vt-missed': () => vtStartRound(vtState.items.filter((x) => x.bad).map((x) => x.w)),
  'vt-menu': () => { vtState.screen = 'start'; render(); },
});
document.addEventListener('keydown', (e) => { // Enter goes on to the next question
  if (e.key !== 'Enter' || ui.view !== 'grammar' || ui.grTab !== 'verbs' || vtState.screen !== 'q' || !vtState.res) return;
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) && !e.target.disabled) return;
  e.preventDefault(); ACT['vt-next']();
});
