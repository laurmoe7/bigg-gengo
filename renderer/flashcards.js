// Flashcard keyboard shortcuts. The keys can be changed in Settings (S.settings.keys); Enter always works too.
const HOTKEY_DEFS = [['flip', 'Show the answer', ' '], ['again', 'Rate: Again', '1'], ['good', 'Rate: Good', '2'], ['easy', 'Rate: Easy', '3'], ['speak', 'Hear the word', 'p'], ['hint', 'Show a hint (typing mode)', 'h'], ['skip', "I don't know / skip", '5']];
const hotkeys = () => Object.assign(Object.fromEntries(HOTKEY_DEFS.map((d) => [d[0], d[2]])), (S && S.settings && S.settings.keys) || {});
const keyOf = (e) => e.key.toLowerCase();
const keyLabel = (k) => ({ ' ': 'Space', arrowleft: '←', arrowright: '→', arrowup: '↑', arrowdown: '↓' })[k] || (k.length === 1 ? k.toUpperCase() : k.charAt(0).toUpperCase() + k.slice(1));
// Flashcards: three ways to practise (flip, type and grade yourself, or type the Japanese word and only succeed when it is right),
// with Bigg as a coach: he holds a flashcard, drops in at the top when you start and reacts as you go.
// Loads after app.js and shares its scope.
const cardPrefs = () => {
  const p = (S.cardPrefs = Object.assign({ mode: 'flip', dir: 'both', auto: false, retype: false, repeat: false, more: 20, group: '' }, S.cardPrefs || {}));
  if (p.mode === 'typing') { p.mode = 'type'; p.strict = true; }
  if (p.strict) { p.retype = true; } // the old Strict switch became Retype (type the word after a miss), which works in every mode
  delete p.strict;
  if (p.dir === 'mixed') p.dir = 'both'; // Mixed (a random side) became Both (each word's two cards, each on its own schedule)
  return p;
};
// Space can check the typed answer when it is an English one-word answer (Space is used to convert kana on a Japanese keyboard, so it never checks Japanese)
const spaceChecks = (cur) => {
  const p = cardPrefs(); if (!cur) return false;
  if (p.mode !== 'type' || cur.q.dir === 'en-ja') return false;
  return !/\s/.test(cur.w.en || ' ');
};
const spaceKbd = (cur) => (spaceChecks(cur) ? '<kbd class="kbd">Space</kbd>' : '');
// the English for a card's example sentence: the one saved on the word, else the matching pair from the sentence bank
const exEnOf = (w) => w.exampleEn || (w.example && typeof SENTENCES !== 'undefined' && Array.isArray(SENTENCES) ? (SENTENCES.find((x) => x[0] === w.example) || [])[1] || '' : '');
const clozeFor = (w) => (w.example ? L.clozeOf(w.example, w, w.exTok) : null); // the word as it stands in its example sentence, or null
const wordLabel = (w) => w.ja;

// ---------- the group of words to practise ----------
// Like the Group list of the phrases: all your words, one of the Words page tabs (nouns, verbs, adjectives, needs work...) or one lesson.
const cardGroupFn = () => {
  const g = cardPrefs().group || '';
  if (g.startsWith('lesson:')) { const l = g.slice(7); return (w) => w.lesson === l; }
  const t = typeof WORD_TABS !== 'undefined' && WORD_TABS.find((x) => x[0] === g);
  return t ? t[3] : () => true;
};
const cardPool = () => S.words.filter((w) => !w.deleted && cardGroupFn()(w));
// which cards' schedules the queue follows: fill the blank is always English → Japanese
const cardDirs = () => (cardPrefs().mode === 'cloze' ? 'en-ja' : cardPrefs().dir);
const cardQueueOpts = () => ({ dirs: cardDirs(), newPerDay: S.settings.newPerDay, newToday: todayStats().newWords, revPerDay: S.settings.newPerDay, revToday: todayStats().newRev });
const cardDue = () => L.cardQueue(cardPool(), today(), cardQueueOpts()); // today's cards [{ w, dir }], from the chosen group
function cardGroupSel() {
  const g = cardPrefs().group || '', live = liveWords(), lessons = {};
  live.forEach((w) => { if (w.lesson) lessons[w.lesson] = (lessons[w.lesson] || 0) + 1; });
  const tabs = typeof WORD_TABS !== 'undefined' ? WORD_TABS.filter((t) => t[0] !== 'all') : [];
  return `<select id="fc-group"><option value="">📚 All words (${live.length})</option>${tabs.map((t) => `<option value="${t[0]}" ${g === t[0] ? 'selected' : ''}>${t[1]} ${esc(t[2])} (${live.filter(t[3]).length})</option>`).join('')}${Object.keys(lessons).length ? `<optgroup label="Lessons">${Object.keys(lessons).sort().map((l) => `<option value="lesson:${esc(l)}" ${g === 'lesson:' + l ? 'selected' : ''}>${esc(l)} (${lessons[l]})</option>`).join('')}</optgroup>` : ''}</select>`;
}

// ---------- starting a session ----------
function launchCards(pool, label) {
  const p = cardPrefs();
  if (!pool.length) return toast('Add some words first!');
  let note = '';
  if (p.mode === 'cloze') { loadData('sentences'); // only words whose example sentence contains the word can be a fill-the-blank card
    const all = pool.length; pool = pool.filter((x) => clozeFor(x.w || x));
    if (!pool.length) return toast('Fill the blank needs words with an example sentence that uses the word. Try Find examples on the Words page.');
    if (pool.length < all) note = ` (${all - pool.length} without a usable example skipped)`;
  }
  // pool: cards { w, dir } from the queue, or plain words (a new word shows Japanese first; Both picks a side)
  const dirFor = (x) => (p.mode === 'cloze' ? 'en-ja' : x.dir ? x.dir : !x.reps ? 'ja-en' : p.dir === 'both' ? rnd(['ja-en', 'en-ja']) : p.dir);
  ui.cards = {
    queue: pool.map((x) => { const w = x.w || x; return { id: w.id, dir: dirFor(x), again: false, cz: p.mode === 'cloze' ? clozeFor(w) : null }; }), i: 0, flipped: false, res: null, typed: '', n: 0, good: 0, label: (label || '') + note,
    streak: 0, phase: 'ask', hint: 0, last: null, coach: { kind: 'start', act: 'in', line: rnd(COACH.start), played: false },
  };
  if (p.auto) autoSpeak();
  render();
}
function startCards() { // today's cards: everything due, plus the day's new words
  const pool = cardDue();
  if (!pool.length) return toast('Nothing is due. Use "Do more cards" below!');
  launchCards(pool.slice(0, 300), '');
}
// Do more than the daily amount: new words, earlier words ahead of schedule, or a random mix.
function startMore(kind) {
  const n = cardPrefs().more || 20, live = cardPool();
  let pool, label;
  if (kind === 'new') { pool = live.filter((w) => !w.reps).slice(0, n); label = 'new words'; if (!pool.length) return toast('No unseen words left. Add more on the Words page!'); }
  else if (kind === 'review') { pool = L.aheadCards(live, today(), cardDirs()).slice(0, n); label = 'review ahead'; if (!pool.length) return toast('Nothing else to review yet.'); }
  else { pool = L.pick(live, n); label = 'random mix'; }
  launchCards(pool, label);
}
function curCard() { const c = ui.cards; if (!c || c.i >= c.queue.length) return null; const q = c.queue[c.i]; return { q, w: S.words.find((x) => x.id === q.id) }; }
function autoSpeak() { const c = curCard(); if (c && c.q.dir === 'ja-en' && cardPrefs().auto) speak(c.w.ja); }

// The ratings a card can get. In the typing modes the app has checked the answer: wrong is Again, a slip is Again or Good,
// right is Good or Easy. Flip mode, where you judge yourself, has all three.
const cardGrades = () => { const r = ui.cards && ui.cards.res; return !r ? ['again', 'good', 'easy'] : r === 'wrong' ? ['again'] : r === 'close' ? ['again', 'good'] : ['good', 'easy']; };
// Below a flipped card: your memory trick for the word, or, for a tricky word without one, a box to write one
function trickHtml(w) {
  if (w.trick) return `<div class="trick">💡 <b>Memory trick:</b> ${esc(w.trick)}</div>`;
  if (!L.isTricky(w)) return '';
  return `<div class="trick ask"><div>🧠 <b>This one keeps slipping</b> (missed ${L.missCount(w)}×). A memory trick helps: a picture, a sound-alike, a silly sentence.</div>
    <div class="row" style="margin-top:6px"><input type="text" class="grow" id="fc-trick" autocomplete="off" placeholder="e.g. 木 (ki) looks like a tree" data-enter="trick-save" data-id="${w.id}"><button class="ghost" data-act="trick-save" data-id="${w.id}">Save</button></div></div>`;
}
// ---------- checking what you typed ----------
// the "Close!" note under the answer: your letters with the slips marked, and the sound mix-up by name when it is a known one
function spellNote(typed, answers, fallback) {
  const r = L.spellMarks(typed, answers);
  if (!r) return `<div class="warn">${fallback || 'Close! Check the spelling.'}</div>`;
  const tags = r.tags.map((id) => L.SOUNDS[id].name).join(', ');
  return `<div class="warn">Close! Look at the marked ${J.hasJa(r.answer) ? 'kana' : 'letters'}${tags ? ' (' + esc(tags) + ')' : ''}:<div class="spell jp">${r.marks.map(([c, k]) => `<span class="sp-${k}">${esc(c)}</span>`).join('')}</div></div>`;
}
// Old "type answer" mode (you grade yourself afterwards): right | close | wrong
const bestCheck = (typed, w, dir) => {
  if (dir === 'ja-en') return L.check(typed, w.en);
  return L.checkWord(typed, w, { strictKanji: S.settings.kanaOk === false });
};
// Retype: the word has to be typed right after a miss (kana, kanji or romaji all count)
const typedMatches = (typed, w, form) => { const t = J.norm(typed); if (!t) return false; if (form) return [form.form, form.reading].filter(Boolean).some((x) => J.norm(x) === t); return ['right', 'reading'].includes(J.matchWord(typed, w)); };

// ---------- the screens ----------
const moreCards = () => { // "Do more cards", before and after a session
  const live = cardPool(), fresh = live.filter((w) => !w.reps).length, ahead = L.aheadCards(live, today(), cardDirs()).length;
  return `<div class="more"><div class="muted" style="margin-bottom:8px">Want to do more?</div>
    <div class="row" style="justify-content:center"><label class="muted">Cards <select id="fc-n">${[10, 20, 30, 50, 100].map((n) => `<option ${(cardPrefs().more || 20) === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <button class="ghost" data-act="cards-more" data-k="new" ${fresh ? '' : 'disabled'}>🌱 New words <span class="muted">${fresh}</span></button>
      <button class="ghost" data-act="cards-more" data-k="review" ${ahead ? '' : 'disabled'}>🔁 Review ahead <span class="muted">${ahead}</span></button>
      <button class="ghost" data-act="cards-more" data-k="random" ${live.length ? '' : 'disabled'}>🎲 Random mix</button></div></div>`;
};
// the keyboard shortcuts, shown on the flashcards page (change them in Settings)
// While the typing box has focus a letter key would type itself, so letters need Ctrl there (Ctrl+H); digits and other keys work directly. Esc always skips.
const typingKbd = (id) => { const k = hotkeys()[id]; return `<kbd class="kbd">${/^\p{L}$/u.test(k) ? 'Ctrl+' : ''}${esc(keyLabel(k))}</kbd>`; };
const skipKey = () => `<small class="btn-key">${typingKbd('skip')}</small>`; // the key shown under the "I don't know" / Skip button
const kbdIn = (id) => `<kbd class="kbd">${esc(keyLabel(hotkeys()[id]))}</kbd>`; // a key label drawn on the button it triggers
const speakBtn = (t) => `<span class="speakw"><button class="speak" data-act="say" data-t="${esc(t)}" title="Listen">🔊</button>${kbdIn('speak')}</span>`;
const modeChip = (m, label) => `<button class="ghost ${cardPrefs().mode === m ? 'on' : ''}" data-act="cpref" data-k="mode" data-v="${m}">${label}</button>`;
const dirChip = (d, label) => `<button class="ghost ${cardPrefs().dir === d ? 'on' : ''}" data-act="cpref" data-k="dir" data-v="${d}">${label}</button>`;

VIEWS.cards = () => {
  const p = cardPrefs(), c = ui.cards, due = cardDue().length;
  const MODE_INFO = { flip: 'See the card, flip it, then rate how well you knew it.', type: 'Type your answer (English, or Japanese in kana, kanji or romaji); the app checks it. Wrong is Again, and right lets you pick Good or Easy.', cloze: 'Fill the missing word in its example sentence, in the form the sentence needs. Only words with an example sentence.' };
  const DIR_INFO = { 'ja-en': 'Only the Japanese → English cards.', 'en-ja': 'Only the English → Japanese cards (new words still show Japanese first).', both: 'Each word has two cards, Japanese → English and English → Japanese, and each comes back on its own schedule. The English → Japanese card starts the day after you first see a word.' };
  const dirBtn = (d, label) => dirChip(d, label);
  const sw = (on, k, label, off, tip) => `<button class="switch ${on ? 'on' : ''}" role="switch" aria-checked="${on}" data-act="cpref" data-k="${k}" data-v="${on ? '' : '1'}" ${off ? 'disabled' : ''} title="${tip}"><i></i>${label}</button>`;
  const prefs = `<div class="fopts compact">
    <div class="og"><span class="muted">Mode</span>${modeChip('flip', 'Flip')}${modeChip('type', '⌨️ Type')}${modeChip('cloze', '✏️ Fill the blank')}<span class="sep"></span>${sw(p.retype, 'retype', '✍️ Retype', false, 'When you get a card wrong, you have to type the right word before moving on')}${sw(p.repeat, 'repeat', '🔁 Repeat', false, 'A card you get wrong comes back a few cards later, up to 2 times')}</div>
    <div class="og"><span class="muted">Direction</span>${dirBtn('ja-en', 'JA → EN')}${dirBtn('en-ja', 'EN → JA')}${dirBtn('both', 'Both')}<span class="sep"></span>${sw(p.auto, 'auto', '🔊 Auto-speak', false, 'Say each word out loud when it appears')}</div>
    <div class="og"><span class="muted">Group</span>${cardGroupSel()}</div>
    <div class="og hint muted">${MODE_INFO[p.mode] || MODE_INFO.flip} ${p.mode === 'cloze' ? 'Fill the blank follows the English → Japanese schedule.' : DIR_INFO[p.dir] || ''}</div></div>`;
  if (!c) {
    return `<div class="top"><div><h1>Flashcards</h1></div></div><div class="fc-wrap">${prefs}
      <div class="card" style="text-align:center;padding:30px">${pigSvg(due ? 'happy' : 'sleep', 'pig-md', { stage: pigStage(), card: true })}
      <p>${due ? `<b>${due}</b> cards are ready. I will be right here to cheer you on!` : 'Nothing is due right now. Nice!'}</p>
      ${due ? '<div class="row" style="justify-content:center"><button class="primary" data-act="cards-start">Start</button></div>' : ''}
      ${moreCards()}</div></div>`;
  }
  const cur = curCard();
  if (!cur) {
    const line = (c.coach && c.coach.kind === 'done' && c.coach.line) || rnd(COACH.done);
    return `<div class="top"><h1>おわり! 🎉</h1></div><div class="fc-wrap"><div class="card" style="text-align:center;padding:30px">${pigSvg('happy', 'pig-md act-cheer', { stage: pigStage(), card: true })}
      <h2>${c.n} cards reviewed</h2><p class="muted">${c.good} remembered first time (${c.n ? Math.round((c.good / c.n) * 100) : 0}%). ${esc(line)}</p>
      <div class="row" style="justify-content:center"><button class="primary" data-act="cards-done">Back to today</button></div>
      ${moreCards()}</div></div>`;
  }
  const { q, w } = cur, cz = p.mode === 'cloze' && q.cz, jaFront = q.dir === 'ja-en', type = p.mode === 'type' || !!cz;
  // the coach: Bigg holds a flashcard at the top; his animation plays once, right after something happened
  const co = c.coach || {}, act = co.played ? '' : 'act-' + co.act;
  co.played = true;
  const coach = `<div class="coach">${pigSvg('happy', act, { stage: pigStage(), card: true })}<div class="cbub"><span>${esc(co.line || '')}</span>${c.last ? `<small class="lastw">${c.last.ok ? '✓' : '→'} <span class="jp">${wordHtml(c.last.w)}</span> = ${esc(c.last.w.en)}</small>` : ''}</div></div>`;
  const czGap = cz ? `${esc(cz.before)}<span class="vt-gap">＿＿＿</span>${esc(cz.after)}` : '';
  const czBack = cz ? sentHtml(w.example, w.exTok, { start: cz.before.length, end: cz.before.length + cz.form.length }) : '';
  const frontHtml = cz ? `<div class="ph-big">${czGap}</div><div class="muted">the word means: <b>${esc(w.en)}</b></div><div class="fc-hint" id="fc-hint">${c.hint ? esc(L.hintText(cz.reading || cz.form, c.hint)) : ''}</div>`
    : jaFront
    ? `${posPill(w) ? `<div class="muted" style="margin-bottom:4px">${posPill(w)}</div>` : ''}<div class="fc-big jp">${noRomaji(() => wordHtml(w))}</div>${speakBtn(wordLabel(w))}`
    : `<div class="fc-big">${esc(w.en)}</div><div class="muted">${posPill(w) ? posPill(w) + ' ' : ''}in Japanese</div>`;
  const ans = jaFront ? esc(w.en) + (/romaji/i.test(script()) ? `<div class="fc-ex jp">${wordHtml(w)}</div>` : '') : `<span class="jp">${wordHtml(w)}</span>`;
  const czBase = cz && c.res === 'close' && [w.ja, w.reading].filter(Boolean).some((x) => J.norm(x) === J.norm(c.typed)) && ![cz.form, cz.reading].some((x) => x && J.norm(x) === J.norm(c.typed));
  const backHtml = cz ? `<div class="ph-big jp ${c.res ? 'ans ' + c.res : ''}">${czBack}</div>${speakBtn(w.example)}<div class="fc-ex"><span class="jp">${wordHtml(w)}</span> = ${esc(w.en)}</div>${czBase ? `<div class="warn">Right word, but this sentence needs <b>${esc(cz.form)}</b>.</div>` : c.res === 'close' ? spellNote(c.typed, [cz.form, cz.reading]) : c.res === 'wrong' ? (c.typed || !exEnOf(w) ? `<div class="warn">${c.typed ? 'You typed: ' + esc(c.typed) : 'That is okay, here it is!'}</div>` : '') : ''}${exEnOf(w) ? `<div class="${c.res === 'wrong' && !c.typed ? 'warn' : 'cz-en'}">${esc(exEnOf(w))}</div>` : ''}`
    : `<div class="fc-big ${c.res ? 'ans ' + c.res : ''}">${ans}</div>${!jaFront ? speakBtn(wordLabel(w)) : ''}${w.example ? `<div class="fc-ex"><span class="jp">${sentHtml(w.example, w.exTok, L.findInExample(w.example, w, w.exTok))}</span>${exEnOf(w) ? '<br>' + esc(exEnOf(w)) : ''}</div>` : ''}${c.res === 'close' ? spellNote(c.typed, jaFront ? String(w.en).split(/[;,/]/) : [w.ja, w.reading], 'Right reading! This card wants it in kanji: ' + esc(w.ja)) : c.res === 'wrong' ? `<div class="warn">You typed: ${esc(c.typed)}</div>` : ''}`;
  const sug = c.res === 'wrong' ? 'again' : 'good';
  const iv = L.previewIntervals(L.cardRec(w, q.dir), today());
  const hk = hotkeys(), gs = cardGrades(), gBtn = (g, label, small) => (gs.includes(g) ? `<button class="g-${g} ${sug === g ? 'on' : ''}" data-act="grade" data-g="${g}"><span class="gl"><kbd class="kbd" title="Press this key">${keyLabel(hk[g])}</kbd>${label}</span><small>${small}</small></button>` : '');
  const gradeBtns = `<div class="grades">${gBtn('again', 'Again', 'today')}${gBtn('good', 'Good', iv.good + 'd')}${gBtn('easy', 'Easy', iv.easy + 'd')}</div>${c.res === 'wrong' && c.typed ? '<div class="row" style="justify-content:center;margin-top:6px"><button class="ghost mini" data-act="grade" data-g="good" title="Your answer was right too (another meaning or spelling): count it as Good">✓ I was right</button></div>' : ''}<div class="muted keyhint">⌨ Keyboard: press ${gs.map((g) => keyLabel(hk[g])).join(gs.length > 2 ? ', ' : ' or ')} to rate, ${keyLabel(hk.speak)} to hear it</div>`;
  let controls;
  const trick = c.flipped || c.phase === 'miss' ? trickHtml(w) : '';
  const want = cz ? cz.form : w.reading || w.ja;
  if (c.phase === 'miss') {
    controls = trick + `<p class="muted" style="text-align:center;margin:4px 0 8px">Type it once to move on 🌱</p><input type="text" class="big-in jp" id="copy" data-focus data-kana autocomplete="off" spellcheck="false" placeholder="${esc(want)}"><div class="row" style="justify-content:center;margin-top:10px"><button class="primary" data-act="copy-ok">Continue</button><button class="ghost keyed" data-act="copy-skip">Skip${skipKey()}</button>${c.typed ? '<button class="ghost" data-act="grade" data-g="good" title="Your answer was right too (another meaning or spelling): count it as Good">✓ I was right</button>' : ''}</div>`;
  } else {
    controls = c.flipped ? trick + gradeBtns : type
      ? `<input type="text" class="big-in ${jaFront ? '' : 'jp'}" id="typed" data-focus ${jaFront ? '' : 'data-kana'} autocomplete="off" spellcheck="false" placeholder="${cz ? 'Type the missing word... (Enter)' : jaFront ? 'Type the English... (Enter)' : 'Type the Japanese: kana, kanji or romaji... (Enter)'}"><div class="row" style="justify-content:center;margin-top:10px">${spaceKbd(cur)}<button class="primary" data-act="check">Check</button>${cz ? `<button class="ghost keyed" data-act="fc-hint">💡 Hint<small class="btn-key">${typingKbd('hint')}</small></button>` : ''}<button class="ghost keyed" data-act="skip">I don't know${skipKey()}</button></div>`
      : `<div class="row" style="justify-content:center"><button class="primary keyed" data-act="flip">Show answer<small class="btn-key">${kbdIn('flip')}</small></button></div>`;
  }
  const selfFlip = !type && !c.flipped;
  return `<div class="top"><div><h1>Flashcards</h1><p class="sub">${L.sessionProgress(c)}${c.label ? ' · ' + c.label : ''}</p></div><button class="ghost" data-act="cards-done">End session</button></div>
    <div class="fc-wrap">${coach}<div class="bar"><i style="width:${(c.i / c.queue.length) * 100}%"></i></div>
    <div class="fc ${c.flipped ? 'flip' : ''} ${c.flipped && c.res ? 'r-' + c.res : ''}${false ? '' : ''}" ${selfFlip ? 'data-act="flip"' : ''}><div class="fc-in"><div class="fc-face">${frontHtml}${selfFlip ? '<div class="muted">click or press Space to flip</div>' : ''}</div><div class="fc-face back">${backHtml}</div></div></div>
    ${controls}</div>`;
};

// ---------- going through the cards ----------
function burstBits(emoji) { // little emoji float up from Bigg
  const host = $('.coach'); if (!host || !emoji) return;
  for (let i = 0; i < 6; i++) {
    const b = document.createElement('span');
    b.className = 'burst-bit'; b.textContent = emoji;
    b.style.left = 8 + Math.random() * 90 + 'px'; b.style.setProperty('--dx', (Math.random() * 60 - 30) + 'px'); b.style.animationDelay = i * 70 + 'ms';
    host.appendChild(b); setTimeout(() => b.remove(), 1700);
  }
}
function gradeCard(g, retyped) {
  const c = ui.cards, cur = curCard(); if (!cur) return;
  if (g === 'again' && cardPrefs().retype && !retyped) { c.flipped = true; c.phase = 'miss'; speak(wordLabel(cur.w)); render(); return; } // Retype: type the right word before it counts
  if (g !== 'again' && c.res === 'wrong') c.res = 'right'; // "I was right": it counts as a right answer
  if (!cur.w.reps) L.bump(S.log, today(), 'newWords');
  else if (cur.q.dir === 'en-ja' && !L.revRec(cur.w).reps) L.bump(S.log, today(), 'newRev'); // a word's English → Japanese card starting
  const upd = L.gradeCard(cur.w, g, today(), cur.q.dir); S.words[S.words.indexOf(cur.w)] = upd;
  c.n++; if (g !== 'again' && !cur.q.again) c.good++;
  if (cardPrefs().repeat) { if (g === 'again' || c.res === 'wrong') L.requeueMiss(c, cur.q, retyped); } // Repeat: only a miss comes back, a few cards later and at most twice
  else if (g === 'again' && !cur.q.again) c.queue.push(Object.assign({}, cur.q, { again: true, back: 1 }));
  chime(g === 'again' ? 'bad' : 'ok');
  gainXp(g === 'again' ? XP.cardAgain : g === 'easy' ? XP.cardEasy : XP.cardGood);
  bumpDay(g === 'again' ? 'cMiss' : 'cOk'); if (g === 'again') noteMiss(cur.w.ja, 'cards');
  c.last = { ok: g !== 'again', w: cur.w };
  c.i++; if (c.queue[c.i] && c.last && c.queue[c.i].id === c.last.w.id) c.last = null; // the same card straight away: do not show its answer at the top
  c.flipped = false; c.res = null; c.typed = ''; c.phase = 'ask'; c.hint = 0;
  c.streak = g === 'again' ? 0 : c.streak + 1;
  const mo = L.coachMoment({ grade: g, streak: c.streak, done: c.i, total: c.queue.length });
  c.coach = { kind: mo.kind, act: mo.act, line: rnd(COACH[mo.kind]), played: false, burst: mo.burst };
  count('reviews'); autoSpeak();
  if (!curCard()) { c.coach = { kind: 'done', act: 'cheer', line: rnd(COACH.done), played: true }; chime('goal'); confetti(); gainXp(XP.session); }
  render();
  if (c.coach.burst) burstBits(c.coach.burst);
}
function clozeCheck(typed, cz, w) { // right | close (a typo, or the dictionary form instead of the form the sentence needs) | wrong
  const t = J.norm(typed); if (!t) return 'wrong';
  if ([cz.form, cz.reading].some((x) => x && J.norm(x) === t)) return 'right';
  if ([w.ja, w.reading].some((x) => x && J.norm(x) === t)) return 'close';
  return [cz.form, cz.reading].some((x) => x && [...J.norm(x)].length > 3 && J.lev(t, J.norm(x)) <= 1) ? 'close' : 'wrong';
}
function checkTyped() {
  const c = ui.cards, cur = curCard(); if (!cur) return;
  const typed = ($('#typed') || {}).value || '';
  if (c.phase === 'miss') return;
  if (c.flipped) return;
  const cz = cardPrefs().mode === 'cloze' && cur.q.cz;
  c.typed = typed; c.res = cz ? clozeCheck(typed, cz, cur.w) : bestCheck(c.typed, cur.w, cur.q.dir); c.flipped = true;
  chime(c.res === 'wrong' ? 'bad' : 'ok'); if (c.res === 'right' && cur.q.dir === 'en-ja') speak(cz ? cur.w.example : cur.w.ja);
  if (c.res === 'wrong' && cardPrefs().retype) { c.phase = 'miss'; speak(wordLabel(cur.w)); }
  render();
}
function copyContinue(force) { // after a miss with Retype on: type the right word once, then it comes back later
  const c = ui.cards, cur = curCard(); if (!cur || c.phase !== 'miss') return;
  const cz = cardPrefs().mode === 'cloze' && cur.q.cz;
  if (!force && !typedMatches(($('#copy') || {}).value || '', cur.w, cz || null)) {
    const el = $('#copy'); if (el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
    return toast('Not quite: look at the answer and try again 🌸');
  }
  c.last = { ok: false, w: cur.w };
  gradeCard('again', true);
}

Object.assign(ACT, {
  flip: () => { ui.cards.flipped = true; render(); },
  'cards-start': () => startCards(), 'cards-more': (el) => startMore(el.dataset.k), 'cards-done': () => { ui.cards = null; go('home'); },
  cpref: (el) => { const p = cardPrefs(); p[el.dataset.k] = ['auto', 'retype', 'repeat'].includes(el.dataset.k) ? !!el.dataset.v : el.dataset.v; save(); render(); },
  grade: (el) => gradeCard(el.dataset.g), check: checkTyped,
  skip: () => {
    const c = ui.cards, cur = curCard(); if (!cur) return;
    c.res = 'wrong'; c.typed = ''; c.flipped = true;
    if (cardPrefs().retype) { c.phase = 'miss'; speak(wordLabel(cur.w)); }
    render();
  },
  'fc-hint': () => { const c = ui.cards, cur = curCard(); if (!cur) return; c.hint = Math.min(2, (c.hint || 0) + 1); const h = $('#fc-hint'); if (h) h.textContent = L.hintText(cardPrefs().mode === 'cloze' && cur.q.cz ? cur.q.cz.reading || cur.q.cz.form : cur.w.reading || cur.w.ja, c.hint); const t = $('#typed'); if (t) t.focus(); },
  'trick-save': (el) => {
    const w = S.words.find((x) => x.id === ((el && el.dataset.id) || ($('#fc-trick') || {}).dataset.id)), v = (($('#fc-trick') || {}).value || '').trim();
    if (!w) return; if (!v) return toast('Write a trick first.');
    w.trick = v; save(); toast('Saved your memory trick 💡'); render();
  },
  'copy-ok': () => copyContinue(false), 'copy-skip': () => copyContinue(true),
});
document.addEventListener('change', (e) => { if (e.target.id === 'fc-n') { cardPrefs().more = +e.target.value; save(); } });

// ---------- little helpers that make Bigg lively wherever he coaches (flashcards, listening, worksheets) ----------
const ACTS = ['in', 'hop', 'wiggle', 'nod', 'sway', 'spin', 'cheer', 'bounce', 'twirl', 'wave'];
// change what Bigg says and does without redrawing the page (for typing, where a redraw would be annoying)
function coachSay(line, act, burst) {
  const host = document.querySelector('.coach'); if (!host) return;
  const sp = host.querySelector('.cbub > span'); if (sp && line) sp.textContent = line;
  const pig = host.querySelector('svg.pig'); if (pig && act) { ACTS.forEach((x) => pig.classList.remove('act-' + x)); void pig.getBoundingClientRect(); pig.classList.add('act-' + act); }
  if (burst) burstBits(burst);
}
// when an animation ends he goes back to his gentle idle bob
document.addEventListener('animationend', (e) => { const t = e.target; if (t && t.matches && t.matches('.coach svg.pig')) ACTS.forEach((x) => t.classList.remove('act-' + x)); });
// poke him and he giggles
const POKES = ['Hehe, that tickles! 💗', 'Boop! 🌸', 'I am here, keep going! ✨', 'Hi hi! 🌱', 'You are doing so well! 💗', 'Wheee! 🎈'];
document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('.coach:not(.ws-coach) svg.pig')) coachSay(rnd(POKES), rnd(['bounce', 'twirl', 'wave', 'wiggle', 'hop']), rnd(['💗', '✨', '🌸', ''])); });
// safety net: whatever the animation events do, he settles back to his idle bob soon after a move starts
new MutationObserver(() => {
  const pig = document.querySelector('.coach svg.pig');
  if (pig && ACTS.some((x) => pig.classList.contains('act-' + x)) && !pig.dataset.settle) {
    pig.dataset.settle = '1';
    setTimeout(() => { ACTS.forEach((x) => pig.classList.remove('act-' + x)); delete pig.dataset.settle; }, 1400);
  }
}).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
