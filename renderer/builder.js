// Sentence builder (a tab on the Grammar page): a real Japanese sentence cut into phrase tiles (学校に, 行きます), which you put back in order
// from the English. The first tile is given. Phrases with a particle may move around (the particle shows their job), but the verb comes last.
// Sentences come from the sentence bank, preferring ones with your own words. Cutting and grading: L.chunkSentence, L.jbGrade (logic.js).

const SB_LINES = {
  right: ['Perfect! Every phrase in its place. 🌸', 'Yes! That is exactly it! 💗', 'すごい! Bigg is impressed. ✨'],
  close: ['The verb is at the end, well done! Some other phrases moved.', 'So close! The end is right, a few phrases are in a different spot.'],
  wrong: ['Not quite. In Japanese the verb comes last:', 'Almost! Here is how it really goes:'],
};
// what each particle does, said after you check
const SB_WHY = {
  topic: 'は marks the topic: what the sentence is about. It usually comes first.',
  subj: 'が marks the subject: who or what does it, or the thing that is liked, wanted or there.',
  obj: 'を marks the object: the thing the action is done to.',
  goal: 'に / へ mark where something goes, or when it happens.',
  place: 'で marks where the action happens, or what it is done with.',
  with: 'と means "with" or "and".',
  from: 'から / まで mean "from" and "until".',
  also: 'も means "also" or "too", in place of は or が.',
  mod: 'の / な join this to the word after it, which it describes.',
  pred: 'The verb, adjective or です comes last. Everything else stands before it.',
};
const sb = (ui.sb = ui.sb || { pat: 'all', cur: null, ans: [], bank: [], res: null, bad: [], hint: 0, retry: false, n: 0, good: 0, recent: [], pools: null, loading: false });
const sbStats = () => (S.sb = S.sb || {});

async function sbInit() { // cuts every sentence in the bank once, and keeps the ones that make a good puzzle (3 to 6 tiles)
  if (sb.pools || sb.loading) return; sb.loading = true;
  try { await loadData('sentences'); } catch { sb.loading = false; return; }
  const pools = Object.fromEntries(L.JB_PATS.map(([id]) => [id, []]));
  SENTENCES.forEach((s, i) => {
    if ([...s[0]].length > 26) return;
    const toks = J.tokens(s), { chunks, end } = L.chunkSentence(toks);
    if (chunks.length < 3 || chunks.length > 6 || toks.map((t) => t.s).join('') !== s[0]) return;
    pools.all.push(i); L.jbPatterns(toks, chunks, end).forEach((p) => pools[p] && pools[p].push(i));
  });
  sb.pools = pools; sb.loading = false;
  if (ui.view === 'grammar' && ui.grTab === 'build') { sbNext(); render(); }
}
function sbMine() { const set = new Set(); liveWords().forEach((w) => { set.add(w.ja); if (w.reading) set.add(w.reading); }); return set; }

function sbNext() {
  const pool = (sb.pools && sb.pools[sb.pat]) || [];
  sb.res = null; sb.bad = []; sb.hint = 0; sb.retry = false;
  if (!pool.length) { sb.cur = null; return; }
  const mine = sbMine(); let best = null, bestScore = -Infinity;
  for (const i of L.pick(pool, Math.min(pool.length, 40))) { // the best of a few random ones: with your words, not seen lately
    const s = SENTENCES[i], toks = J.tokens(s), seen = sb.recent.indexOf(i);
    const score = toks.filter((t) => mine.has(t.b) || mine.has(t.s)).length + Math.random() - (seen >= 0 ? 100 - seen : 0);
    if (score > bestScore) { const { chunks, end } = L.chunkSentence(toks); best = { i, ja: s[0], en: s[1], chunks, end, roles: chunks.map((c, k) => L.jbRole(c, k === chunks.length - 1)) }; bestScore = score; }
  }
  sb.cur = best; if (!best) return;
  sb.recent = [best.i, ...sb.recent].slice(0, 30);
  sb.ans = [0]; sb.bank = L.shuffle(best.chunks.map((_, k) => k).slice(1));
  if (sb.bank.every((k, j) => k === j + 1)) sb.bank.reverse(); // never hand it over already in order
}
const sbWords = (idx) => idx.map((k) => sb.cur.chunks[k].s);
const sbTileHtml = (ch) => jpJoin(ch.toks.filter((t) => !/^[、，,]$/.test(t.s)).map((t) => [jpTok(t.s, t.r), t.s]));

function sbView() {
  if (!sb.pools) { sbInit(); return `<div class="card"><p class="muted" style="margin:0">Finding sentences for you... 🔍</p></div>`; }
  if (!sb.cur) sbNext();
  const stats = sbStats();
  const chips = L.JB_PATS.map(([id, name]) => { const s = stats[id]; return `<button class="chip ${sb.pat === id ? 'on' : ''}" data-act="sb-pat" data-v="${id}">${sb.pat === id ? '✓ ' : ''}${esc(name)}${s && s.n ? ` <small>${s.ok}/${s.n}</small>` : ''}</button>`; }).join('');
  const c = sb.cur;
  if (!c) return `<div class="chips2" style="margin-bottom:12px">${chips}</div><div class="card"><p class="muted" style="margin:0">No sentences found for that kind yet. Try another one.</p></div>`;
  const done = !!sb.res, full = !sb.bank.length;
  const tile = (k, pos, where) => {
    const role = done && !sb.bad.includes(pos) && c.roles[k]; // after checking, the phrases in the right place get their particle's colour
    const cls = where !== 'ans' ? '' : role ? 'role rl-' + role : pos === 0 ? 'pinned' : done ? (sb.bad.includes(pos) ? 'bad' : 'ok') : '';
    const act = done || (where === 'ans' && pos === 0) ? '' : `data-act="sb-${where === 'ans' ? 'out' : 'in'}" data-v="${pos}"`;
    return `<button class="sb-tile jp ${cls}" ${act} ${act ? '' : 'tabindex="-1"'}>${sbTileHtml(c.chunks[k])}</button>`;
  };
  const line = `<div class="sb-line ${done ? 'sb-' + sb.res : ''}">${sb.ans.map((k, p) => tile(k, p, 'ans')).join('')}${full ? `<span class="sb-end">${esc(c.end || '。')}</span>` : '<span class="sb-gap"></span>'}</div>`;
  const bank = done ? '' : `<div class="sb-bank">${sb.bank.map((k, p) => tile(k, p, 'bank')).join('') || '<span class="muted">All phrases placed. Check it!</span>'}</div>`;
  let foot;
  if (!done) foot = `<div class="row" style="margin-top:14px"><button class="primary" data-act="sb-check" ${full ? 'data-focus' : 'disabled'}>Check</button><button class="ghost" data-act="sb-hint">💡 Hint</button><button class="ghost" data-act="sb-reset">↺ Start over</button><button class="ghost" data-act="sb-skip">Skip</button></div>`;
  else {
    const seen = new Set(), why = c.chunks.map((ch, k) => [ch, c.roles[k]]).filter(([, r]) => r && !seen.has(r) && seen.add(r));
    foot = `<div class="sb-result"><b>${esc(sb.say || '')}</b>${sb.hint && sb.res === 'right' ? ' <span class="muted">(with a hint)</span>' : ''}
      ${sb.res === 'right' && !sb.alt ? '' : `<div class="sb-real jp">${c.chunks.map((ch, k) => `<span class="${c.roles[k] ? 'rl-' + c.roles[k] : ''}">${sbTileHtml(ch)}</span>`).join(script() === 'romaji' ? ' ' : '')}${esc(c.end)}</div>`}
      <div class="row" style="margin:6px 0 2px"><button class="ghost mini" data-act="say" data-t="${esc(c.ja)}" title="Hear it">🔊</button></div>
      <ul class="sb-why">${why.map(([ch, r]) => `<li><span class="sb-chip jp rl-${r}">${sbTileHtml(ch)}</span> <b>${esc(L.JB_ROLES[r])}</b>: ${esc(SB_WHY[r])}</li>`).join('')}</ul>
      <div class="row" style="margin-top:14px"><button class="primary" data-act="sb-next" data-focus>Next sentence ➜</button>${sb.res === 'right' ? '' : '<button class="ghost" data-act="sb-retry">↺ Try it again</button>'}</div></div>`;
  }
  return `<div class="chips2" style="margin-bottom:12px">${chips}</div>
    <div class="card sb-card"><div class="sb-head"><span class="muted">Put the phrases in the right order. The first one is given.</span>${sb.n ? `<span class="pill ${sb.good === sb.n ? 'mint' : 'sky'}">${sb.good} / ${sb.n} right</span>` : ''}</div>
      <div class="sb-en">${esc(c.en || '')}</div>${line}${bank}${foot}</div>`;
}

function sbCheck() {
  const c = sb.cur; if (!c || sb.res || sb.bank.length) return;
  const g = L.jbGrade(c.chunks.map((x) => x.s), sbWords(sb.ans), c.roles);
  sb.res = g.res; sb.bad = g.bad; sb.alt = !!g.alt;
  sb.say = g.alt ? 'Right! The sentence says it in another order, but yours is good Japanese too: the particles show each phrase\'s job, so they can move. 🌸' : rnd(SB_LINES[g.res]);
  if (!sb.retry) { // only the first try counts
    sb.n++; if (g.res === 'right') sb.good++;
    const s = sbStats(), add = (id) => { const x = (s[id] = s[id] || { ok: 0, n: 0 }); x.n++; if (g.res === 'right') x.ok++; };
    add('all'); L.jbPatterns(J.tokens(SENTENCES[c.i]), c.chunks, c.end).forEach(add);
    gainXp(g.res === 'right' ? (sb.hint ? 8 : XP.itemRight) : g.res === 'close' ? XP.itemClose : XP.itemWrong); save();
  }
  chime(g.res === 'wrong' ? 'bad' : 'ok');
  render();
}
Object.assign(ACT, {
  'sb-pat': (el) => { sb.pat = el.dataset.v; sbNext(); render(); },
  'sb-in': (el) => { if (sb.res) return; sb.ans.push(sb.bank.splice(+el.dataset.v, 1)[0]); render(); },
  'sb-out': (el) => { const p = +el.dataset.v; if (sb.res || p === 0) return; sb.bank.push(sb.ans.splice(p, 1)[0]); render(); },
  'sb-reset': () => { if (sb.res) return; sb.bank.push(...sb.ans.splice(1)); render(); },
  'sb-hint': () => { // keep the phrases that are right so far, put the rest back and add the next one
    const c = sb.cur; if (!c || sb.res) return;
    const keep = Math.max(1, L.jbPrefix(c.chunks.map((x) => x.s), sbWords(sb.ans))); sb.bank.push(...sb.ans.splice(keep));
    const want = c.chunks[keep] && c.chunks[keep].s, j = sb.bank.findIndex((k) => c.chunks[k].s === want);
    if (j >= 0) sb.ans.push(sb.bank.splice(j, 1)[0]);
    sb.hint++; render();
  },
  'sb-check': sbCheck,
  'sb-skip': () => { sbNext(); render(); },
  'sb-next': () => { sbNext(); render(); },
  'sb-retry': () => { sb.bank = L.shuffle(sb.ans.splice(1)); sb.res = null; sb.bad = []; sb.retry = true; render(); },
});
