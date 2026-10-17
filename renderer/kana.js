// The Kana page: charts of hiragana and katakana you can tap to hear, and spaced-repetition practice (read it, pick it, hear it).
// Progress per kana lives in S.kana[id] with the same fields as a word (reps, stab, diff, due, box...). Loads after app.js and shares its scope.

// [id, name, rows]; each row is a string of hiragana separated by spaces. Katakana is made from it.
const KANA_SETS = [
  ['basic', 'Basic 46', ['あ い う え お', 'か き く け こ', 'さ し す せ そ', 'た ち つ て と', 'な に ぬ ね の', 'は ひ ふ へ ほ', 'ま み む め も', 'や ゆ よ', 'ら り る れ ろ', 'わ を ん']],
  ['dakuten', 'With ゛ ゜', ['が ぎ ぐ げ ご', 'ざ じ ず ぜ ぞ', 'だ ぢ づ で ど', 'ば び ぶ べ ぼ', 'ぱ ぴ ぷ ぺ ぽ']],
  ['yoon', 'Combined (ゃ ゅ ょ)', ['きゃ きゅ きょ', 'ぎゃ ぎゅ ぎょ', 'しゃ しゅ しょ', 'じゃ じゅ じょ', 'ちゃ ちゅ ちょ', 'にゃ にゅ にょ', 'ひゃ ひゅ ひょ', 'びゃ びゅ びょ', 'ぴゃ ぴゅ ぴょ', 'みゃ みゅ みょ', 'りゃ りゅ りょ']],
];
const KANA_EXTRA = ['ふぁ ふぃ ふぇ ふぉ', 'てぃ でぃ とぅ どぅ', 'うぃ うぇ うぉ', 'しぇ ちぇ じぇ', 'ゔぁ ゔぃ ゔ ゔぇ ゔぉ']; // sounds katakana adds for foreign words
const kanaPrefs = () => (S.kanaPrefs = Object.assign({ script: 'h', mode: 'read', sets: ['h:basic'], n: 20 }, S.kanaPrefs || {}));
const kanaState = (ui.kana = ui.kana || { tab: 'chart', script: 'h', sess: null });
// every kana as { id: 'h:か', ch: 'か', hira: 'か', set: 'h:basic', script: 'h' }, in chart order
function kanaAll() {
  const out = [];
  for (const sc of ['h', 'k']) {
    const sets = KANA_SETS.map(([id, name, rows]) => [id, name, rows]).concat(sc === 'k' ? [['extra', 'Foreign sounds', KANA_EXTRA]] : []);
    for (const [sid, , rows] of sets) for (const row of rows) for (const h of row.split(' ')) out.push({ id: sc + ':' + (sc === 'k' ? J.toKata(h) : h), ch: sc === 'k' ? J.toKata(h) : h, hira: h, set: sc + ':' + sid, script: sc });
  }
  return out;
}
const kanaSetList = () => ['h', 'k'].flatMap((sc) => KANA_SETS.map(([id, name]) => [sc + ':' + id, (sc === 'h' ? 'Hiragana · ' : 'Katakana · ') + name]).concat(sc === 'k' ? [['k:extra', 'Katakana · Foreign sounds']] : []));
const kanaRec = (k) => (S.kana && S.kana[k.id]) || {};
const kanaRomaji = (k) => J.toRomaji(k.hira);
const kanaLevel = (k) => { const r = kanaRec(k); return !r.reps ? 'new' : r.box >= 4 ? 'known' : 'learning'; };

function kanaChart() {
  const sc = kanaState.script, all = kanaAll().filter((k) => k.script === sc), p = kanaPrefs();
  const known = all.filter((k) => kanaLevel(k) === 'known').length, started = all.filter((k) => kanaLevel(k) !== 'new').length;
  const sets = (sc === 'h' ? KANA_SETS : KANA_SETS.concat([['extra', 'Foreign sounds', KANA_EXTRA]]));
  const cell = (k) => `<button class="kcell k-${kanaLevel(k)}" data-act="kana-say" data-v="${esc(k.ch)}" title="${esc(kanaRomaji(k))}"><b class="jp">${esc(k.ch)}</b><small>${esc(kanaRomaji(k))}</small></button>`;
  const body = sets.map(([sid, name, rows]) => {
    const key = sc + ':' + sid, on = p.sets.includes(key);
    return `<div class="card kset"><div class="row" style="justify-content:space-between;margin-bottom:8px"><h2 style="margin:0">${esc(name)}</h2><label class="row" style="gap:6px"><input type="checkbox" data-act="kana-set" data-v="${key}" ${on ? 'checked' : ''}> practise this set</label></div>
      ${rows.map((row) => `<div class="krow">${row.split(' ').map((h) => cell(all.find((k) => k.hira === h))).join('')}</div>`).join('')}</div>`;
  }).join('');
  return `<div class="seg" style="margin-bottom:12px"><button class="${sc === 'h' ? 'on' : ''}" data-act="kana-script" data-v="h">ひらがな Hiragana</button><button class="${sc === 'k' ? 'on' : ''}" data-act="kana-script" data-v="k">カタカナ Katakana</button></div>
    <p class="muted" style="margin:0 0 12px">${sc === 'h' ? 'Hiragana writes native Japanese words and endings.' : 'Katakana writes foreign words, names and sounds.'} Tap a kana to hear it. <b>${known}</b> of ${all.length} known · ${started} started.</p>${body}`;
}

// ---------- practice ----------
function kanaPool() {
  const p = kanaPrefs(), items = kanaAll().filter((k) => p.sets.includes(k.set));
  return items;
}
function kanaStart(kind) {
  const p = kanaPrefs(), items = kanaPool(), td = today(); if (!items.length) return toast('Tick at least one set to practise first.');
  let pool;
  if (kind === 'mix') pool = L.pick(items, p.n);
  else { const due = items.filter((k) => kanaRec(k).reps > 0 && L.isDue(kanaRec(k), td)), fresh = items.filter((k) => !kanaRec(k).reps); pool = L.shuffle(due).concat(fresh.slice(0, 5)).slice(0, p.n); if (!pool.length) return toast('Nothing is due. Try a random mix!'); }
  kanaState.sess = { queue: pool.map((k) => k.id), i: 0, good: 0, n: 0, res: null, typed: '', picked: '', opts: null, label: kind === 'mix' ? 'random mix' : 'due now', streak: 0, coach: { kind: 'start', act: 'in', line: rnd(COACH.start), played: false } };
  kanaPrep(); render(); kanaSay();
}
const kanaCur = () => { const s = kanaState.sess; if (!s || s.i >= s.queue.length) return null; return kanaAll().find((k) => k.id === s.queue[s.i]); };
function kanaPrep() {
  const s = kanaState.sess, k = kanaCur(); if (!k) return;
  s.res = null; s.typed = ''; s.picked = '';
  if (kanaPrefs().mode !== 'read') { // wrong answers that look or sound alike make the best choices
    const pool = kanaAll().filter((x) => x.script === k.script && x.id !== k.id && ([...x.hira].length === [...k.hira].length)); s.opts = L.shuffle([k.id, ...L.pick(pool, 3).map((x) => x.id)]);
  }
}
function kanaSay() { const k = kanaCur(); if (k && (kanaPrefs().mode === 'listen' || kanaPrefs().mode === 'read')) speak(k.hira); }
function kanaAnswer(ok) {
  const s = kanaState.sess, k = kanaCur(); if (!k || s.res) return;
  s.res = ok ? 'right' : 'wrong'; s.n++; if (ok) s.good++; s.streak = ok ? s.streak + 1 : 0;
  S.kana = S.kana || {}; S.kana[k.id] = L.grade(kanaRec(k), ok ? 'good' : 'again', today());
  gainXp(ok ? 6 : 2); count('reviews'); chime(ok ? 'ok' : 'bad'); if (!ok) noteMiss(k.ch, 'kana');
  const mo = L.coachMoment({ grade: ok ? 'good' : 'again', streak: s.streak, done: s.n, total: s.queue.length });
  s.coach = { kind: mo.kind, act: mo.act, line: ok ? rnd(COACH[mo.kind]) : rnd(PIG.wrong), played: false, burst: mo.burst };
  save(); render(); if (s.coach.burst) burstBits(s.coach.burst);
}
function kanaView() {
  const s = kanaState.sess, p = kanaPrefs();
  if (kanaState.tab === 'practice' && s) {
    const k = kanaCur();
    if (!k) return `<div class="top"><h1>おわり! 🎉</h1></div><div class="fc-wrap"><div class="card" style="text-align:center;padding:30px">${pigSvg('happy', 'pig-md act-cheer', { stage: pigStage(), card: true })}<h2>${s.good} of ${s.n} right</h2><p class="muted">${s.good === s.n ? 'Perfect! 🌟' : 'The ones you missed will be back soon. 🌸'}</p>
      <div class="row" style="justify-content:center"><button class="primary" data-act="kana-end">Back to the kana</button></div></div></div>`;
    const co = s.coach, act = co.played ? '' : 'act-' + co.act; co.played = true;
    const coach = `<div class="coach">${pigSvg('happy', act, { stage: pigStage(), card: true })}<div class="cbub"><span>${esc(co.line || '')}</span></div></div>`;
    const mode = p.mode, ro = kanaRomaji(k), done = !!s.res;
    let front, input;
    if (mode === 'read') {
      front = `<div class="fc-big jp" style="font-size:84px">${esc(k.ch)}</div><button class="speak" data-act="kana-say" data-v="${esc(k.ch)}" title="Listen">🔊</button>`;
      input = `<input type="text" class="big-in" id="kana-in" data-enter="kana-check" data-focus autocomplete="off" spellcheck="false" placeholder="Type the romaji (ka, shi, tsu...)" ${done ? 'disabled' : ''} value="${esc(s.typed)}"><div class="row" style="justify-content:center;margin-top:10px">${done ? '' : '<button class="primary" data-act="kana-check">Check</button><button class="ghost" data-act="kana-skip">I don\'t know</button>'}</div>`;
    } else {
      front = mode === 'listen' ? `<button class="speak big" data-act="kana-say" data-v="${esc(k.ch)}" title="Play again">🔊</button><div class="muted">Which kana did you hear?</div>` : `<div class="fc-big" style="font-size:64px">${esc(ro)}</div><div class="muted">Which kana is this?</div>`;
      input = `<div class="opts" style="grid-template-columns:repeat(4,1fr)">${s.opts.map((id) => { const o = kanaAll().find((x) => x.id === id); return `<button class="jp ${done ? (id === k.id ? 'ok' : id === s.picked ? 'no' : '') : ''}" style="font-size:34px" data-act="kana-pick" data-v="${esc(id)}" ${done ? 'disabled' : ''}>${esc(o.ch)}</button>`; }).join('')}</div>${done ? '' : '<div class="row" style="justify-content:center;margin-top:8px"><button class="ghost" data-act="kana-skip">🤷 I don\'t know</button></div>'}`;
    }
    const verdict = done ? `<div class="card rcard" style="text-align:center"><div style="font-size:48px" class="jp">${esc(k.ch)}</div><div class="muted" style="font-size:18px">${esc(ro)}</div>${s.res === 'wrong' && s.typed ? `<div class="muted">You typed: ${esc(s.typed)}</div>` : ''}<div class="row" style="justify-content:center;margin-top:10px"><button class="ghost" data-act="kana-say" data-v="${esc(k.ch)}">🔊 Again</button><button class="primary" data-act="kana-next" data-focus>Next →</button></div></div>` : '';
    return `<div class="top"><div><h1>Kana</h1><p class="sub">${s.i + 1} of ${s.queue.length} · ${esc(s.label)}</p></div><button class="ghost" data-act="kana-end">End</button></div>
      <div class="fc-wrap">${coach}<div class="bar"><i style="width:${(s.i / s.queue.length) * 100}%"></i></div><div class="card kq" style="text-align:center;padding:24px">${front}</div>${input}${verdict}</div>`;
  }
  const modeBtn = (m, label) => `<button class="ghost ${p.mode === m ? 'on' : ''}" data-act="kana-mode" data-v="${m}">${label}</button>`;
  const items = kanaPool(), td = today(), due = items.filter((k) => kanaRec(k).reps > 0 && L.isDue(kanaRec(k), td)).length, fresh = items.filter((k) => !kanaRec(k).reps).length;
  const setChips = kanaSetList().map(([id, name]) => `<button class="chip ${p.sets.includes(id) ? 'on' : ''}" data-act="kana-set" data-v="${id}">${p.sets.includes(id) ? '✓ ' : ''}${esc(name)}</button>`).join('');
  return `<div class="top"><div><h1>Kana</h1><p class="sub">あいうえお · アイウエオ</p></div></div>
    <div class="tabs"><button class="tab ${kanaState.tab === 'chart' ? 'on' : ''}" data-act="kana-tab" data-v="chart">📖 Charts</button><button class="tab ${kanaState.tab === 'practice' ? 'on' : ''}" data-act="kana-tab" data-v="practice">🃏 Practise</button></div>` +
    (kanaState.tab === 'chart' ? kanaChart() : `<div class="fopts compact"><div class="og"><span class="muted">How</span>${modeBtn('read', '👀 Read it (type romaji)')}${modeBtn('pick', '🔤 Pick the kana')}${modeBtn('listen', '🎧 Hear it, pick it')}</div>
      <div class="og"><span class="muted">What</span><div class="chips2" style="margin:0">${setChips}</div></div></div>
      <div class="card" style="text-align:center;padding:30px">${pigSvg(due || fresh ? 'happy' : 'sleep', 'pig-md', { stage: pigStage(), card: true })}<p>${due ? `<b>${due}</b> kana are due` : 'No kana are due'}${fresh ? ` · <b>${fresh}</b> new` : ''}. ${items.length} kana selected.</p>
        <div class="row" style="justify-content:center"><button class="primary" data-act="kana-go" ${due || fresh ? '' : 'disabled'}>Start</button><button class="ghost" data-act="kana-mix" ${items.length ? '' : 'disabled'}>🎲 Random mix</button><label class="muted">Kana <select id="kana-n">${[10, 20, 30, 46].map((n) => `<option ${p.n === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label></div></div>`);
}
VIEWS.kana = kanaView;
Object.assign(ACT, {
  'kana-tab': (el) => { kanaState.tab = el.dataset.v; kanaState.sess = null; render(); },
  'kana-script': (el) => { kanaState.script = el.dataset.v; render(); },
  'kana-say': (el) => speak(el.dataset.v),
  'kana-set': (el) => { const p = kanaPrefs(), id = el.dataset.v, i = p.sets.indexOf(id); if (i < 0) p.sets.push(id); else p.sets.splice(i, 1); save(); render(); },
  'kana-mode': (el) => { kanaPrefs().mode = el.dataset.v; save(); render(); },
  'kana-go': () => kanaStart('due'), 'kana-mix': () => kanaStart('mix'),
  'kana-check': () => { const k = kanaCur(), v = ($('#kana-in') || {}).value || ''; if (!k || !v.trim()) return toast('Type the romaji first, or press "I don\'t know".'); const s = kanaState.sess; s.typed = v.trim(); kanaAnswer(J.norm(v) === J.toHira(k.hira)); },
  'kana-pick': (el) => { const s = kanaState.sess, k = kanaCur(); if (!k || s.res) return; s.picked = el.dataset.v; kanaAnswer(el.dataset.v === k.id); },
  'kana-skip': () => { const s = kanaState.sess; if (!s || s.res) return; s.typed = ''; s.picked = ''; kanaAnswer(false); },
  'kana-next': () => { const s = kanaState.sess; s.i++; if (!kanaCur()) { chime('goal'); gainXp(XP.session); if (s.good === s.n) confetti(); } else kanaPrep(); render(); if (kanaCur()) kanaSay(); },
  'kana-end': () => { kanaState.sess = null; render(); },
});
document.addEventListener('change', (e) => {
  if (e.target.id === 'kana-n') { kanaPrefs().n = +e.target.value; save(); }
  if (e.target.matches && e.target.matches('input[type=checkbox][data-act="kana-set"]')) ACT['kana-set'](e.target);
});
document.addEventListener('keydown', (e) => {
  if (ui.view !== 'kana' || !kanaState.sess) return;
  if (e.key === 'Enter' && kanaState.sess.res && !/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) { e.preventDefault(); ACT['kana-next'](); }
  else if (e.key === 'Enter' && e.target.id === 'kana-in') { e.preventDefault(); ACT['kana-check'](); }
  else if (!/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) && /^[1-4]$/.test(e.key) && kanaPrefs().mode !== 'read' && !kanaState.sess.res) { const id = kanaState.sess.opts[+e.key - 1]; if (id) ACT['kana-pick']({ dataset: { v: id } }); }
});
