// UI polish: themed dropdown menus, button ripples and counting numbers. Loads last and shares the global scope.

// ---------- themed dropdowns ----------
// Every <select> is shown as a styled button with a styled list. The real <select> stays in the page (hidden), so the code that reads
// its value, and the 'change' events it listens for, keep working exactly as before.
let ddOpen = null; // { wrap, sel, list, items, at }
function ddLabel(sel) { const o = sel.options[sel.selectedIndex]; return o ? o.textContent : ''; }
function closeDd(refocus) {
  if (!ddOpen) return;
  const { wrap, list } = ddOpen; ddOpen = null;
  wrap.classList.remove('open'); list.classList.remove('show');
  setTimeout(() => list.remove(), 140);
  if (refocus) { const b = wrap.querySelector('.dd-btn'); if (b) b.focus(); }
}
function pickDd(sel, wrap, value) {
  sel.value = value; wrap.querySelector('.dd-label').textContent = ddLabel(sel);
  sel.dispatchEvent(new Event('input', { bubbles: true })); sel.dispatchEvent(new Event('change', { bubbles: true }));
}
function openDd(wrap, sel) {
  if (sel.disabled) return;
  if (ddOpen) { const same = ddOpen.wrap === wrap; closeDd(); if (same) return; }
  const list = document.createElement('div'); list.className = 'dd-list'; list.setAttribute('role', 'listbox');
  const items = [];
  const addOpt = (o, parent) => {
    const it = document.createElement('div'); it.className = 'dd-item' + (o.selected ? ' sel' : '') + (o.disabled ? ' off' : ''); it.setAttribute('role', 'option');
    it.dataset.v = o.value; it.title = o.textContent; it.innerHTML = '<span class="dd-check">✓</span><span class="dd-txt">' + esc(o.textContent) + '</span>';
    it.addEventListener('mousedown', (e) => e.preventDefault());
    it.addEventListener('click', () => { if (o.disabled) return; pickDd(sel, wrap, o.value); closeDd(true); });
    it.addEventListener('mousemove', () => hlDd(items.indexOf(it)));
    parent.appendChild(it); items.push(it);
  };
  [...sel.children].forEach((ch) => {
    if (ch.tagName === 'OPTGROUP') { const g = document.createElement('div'); g.className = 'dd-group'; g.textContent = ch.label; list.appendChild(g); [...ch.children].forEach((o) => addOpt(o, list)); } else addOpt(ch, list);
  });
  document.body.appendChild(list);
  const b = wrap.getBoundingClientRect(), vh = window.innerHeight;
  list.style.minWidth = b.width + 'px'; list.style.width = 'max-content'; list.style.maxWidth = (window.innerWidth - 16) + 'px'; // at least as wide as the button, and wider when the items need it
  const lw = Math.max(b.width, list.offsetWidth);
  list.style.left = Math.max(8, Math.min(b.left, window.innerWidth - lw - 8)) + 'px';
  const h = Math.min(list.scrollHeight, 340), below = vh - b.bottom - 14;
  if (below >= h || below >= 180) { list.style.top = b.bottom + 6 + 'px'; list.style.maxHeight = Math.min(340, below) + 'px'; list.classList.add('down'); }
  else { list.style.maxHeight = Math.min(340, b.top - 14) + 'px'; list.style.top = Math.max(8, b.top - Math.min(h, b.top - 14) - 6) + 'px'; list.classList.add('up'); }
  requestAnimationFrame(() => list.classList.add('show'));
  wrap.classList.add('open');
  ddOpen = { wrap, sel, list, items, at: Math.max(0, sel.selectedIndex >= 0 ? items.findIndex((x) => x.classList.contains('sel')) : 0) };
  hlDd(ddOpen.at, true);
}
function hlDd(i, scroll) {
  if (!ddOpen || i < 0 || i >= ddOpen.items.length) return;
  ddOpen.at = i; ddOpen.items.forEach((x, k) => x.classList.toggle('hl', k === i));
  if (scroll) ddOpen.items[i].scrollIntoView({ block: 'nearest' });
}
function enhanceSelects() {
  document.querySelectorAll('select:not([data-dd])').forEach((sel) => {
    sel.dataset.dd = '1';
    const cs = getComputedStyle(sel), wrap = document.createElement('span');
    wrap.className = 'dd-wrap' + (sel.style.width === '100%' ? ' full' : '');
    if (cs.maxWidth && cs.maxWidth !== 'none') wrap.style.maxWidth = cs.maxWidth;
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'dd-btn'; btn.setAttribute('aria-haspopup', 'listbox');
    if (sel.disabled) btn.disabled = true;
    const sizers = [...sel.options].map((o) => '<span class="dd-sizer" aria-hidden="true">' + esc(o.textContent) + '</span>').join(''); // every option sits in the same grid cell, so the widest one sets the width
    btn.innerHTML = '<span class="dd-lw"><span class="dd-label"></span>' + sizers + '</span><svg class="dd-caret" viewBox="0 0 12 8" aria-hidden="true"><path d="M1.5 1.5 6 6l4.5-4.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    btn.querySelector('.dd-label').textContent = ddLabel(sel);
    btn.addEventListener('click', (e) => { e.preventDefault(); openDd(wrap, sel); });
    btn.addEventListener('keydown', (e) => {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); e.stopPropagation(); if (!ddOpen) openDd(wrap, sel); else if (e.key === 'ArrowDown') hlDd(ddOpen.at + 1, true); else if (e.key === 'ArrowUp') hlDd(ddOpen.at - 1, true); else { const it = ddOpen.items[ddOpen.at]; if (it) it.click(); } }
      else if (e.key === 'Escape' && ddOpen) { e.preventDefault(); e.stopPropagation(); closeDd(true); }
      else if (e.key === 'Tab') closeDd();
    });
    sel.parentNode.insertBefore(wrap, sel); wrap.appendChild(btn); wrap.appendChild(sel); sel.style.display = 'none';
  });
}
document.addEventListener('mousedown', (e) => { if (ddOpen && !e.target.closest('.dd-list') && !e.target.closest('.dd-wrap')) closeDd(); });
window.addEventListener('blur', () => closeDd()); window.addEventListener('resize', () => closeDd());
// the page scrolling closes an open list, but scrolling the list itself (to reach the later months, say) must not
document.addEventListener('scroll', (e) => { if (ddOpen && e.target && e.target.nodeType === 1 && ddOpen.list.contains(e.target)) return; closeDd(); }, true);
let ddQueued = false;
new MutationObserver(() => { if (ddQueued) return; ddQueued = true; requestAnimationFrame(() => { ddQueued = false; enhanceSelects(); }); }).observe(document.body, { childList: true, subtree: true });
enhanceSelects();

// ---------- ripple on buttons ----------
document.addEventListener('pointerdown', (e) => {
  const b = e.target.closest && e.target.closest('.primary, .ghost, .tab, .chip, .seg button, .theme');
  if (!b || b.disabled) return;
  const r = b.getBoundingClientRect(), s = Math.max(r.width, r.height) * 2, dot = document.createElement('span');
  dot.className = 'ripple'; dot.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX - r.left - s / 2}px;top:${e.clientY - r.top - s / 2}px`;
  b.appendChild(dot); setTimeout(() => dot.remove(), 650);
});

// ---------- numbers count up when a page opens ----------
function countUp(el) {
  if (el.children.length) return;
  const m = el.textContent.match(/^(\D*)(\d[\d,]*)(.*)$/); if (!m) return;
  const end = parseInt(m[2].replace(/,/g, ''), 10); if (!end || end > 100000) return;
  const t0 = performance.now(), dur = 650;
  const tick = (t) => { const k = Math.min(1, (t - t0) / dur), v = Math.round(end * (1 - Math.pow(1 - k, 3))); el.textContent = m[1] + v.toLocaleString() + m[3]; if (k < 1) requestAnimationFrame(tick); else el.textContent = m[1] + m[2] + m[3]; };
  requestAnimationFrame(tick);
}
if (typeof render === 'function') {
  const baseRender = render;
  render = function () {
    const before = ui.rendered; baseRender.apply(this, arguments);
    if (before !== ui.view && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) document.querySelectorAll('#main .stat > b').forEach(countUp);
  };
}

// ---------- grammar terms explain themselves on hover ----------
const GLOSS = {
  'particle': 'A small word after a noun or phrase that shows its job: は (topic), が (subject), を (object), に (target or time), で (place of action), の (of).',
  'topic marker': 'は (read "wa") marks what the sentence is about: 私は学生です = "As for me, I am a student".',
  'subject marker': 'が marks who or what does something, often new information: 誰が来ましたか。',
  'object marker': 'を (read "o") marks the thing the action is done to: 水を飲みます。',
  'direct object': 'The thing the action happens to: in 水を飲みます, the direct object is 水 (water).',
  'subject': 'Who or what does the action or is described.',
  'topic': 'What the sentence is about. In Japanese it is marked with は.',
  'dictionary form': 'The basic form of a verb or い-adjective, as in the dictionary: 食べる, 行く, 大きい. Also called plain present or the る/う-form.',
  'plain form': 'The casual, dictionary-based form of verbs and adjectives: 食べる, 食べない, 食べた. Used with friends, in writing and inside longer sentences.',
  'polite form': 'The ます / です style used with strangers, at work and in shops: 食べます, 大きいです.',
  'masu-form': 'The polite verb form: the stem plus ます (食べます, 書きます).',
  'te-form': 'A verb form that joins things together: 食べて. It is used for requests (〜てください), ongoing actions (〜ています) and permission (〜てもいい).',
  'ta-form': 'The plain past tense: 食べた, 書いた, 行った.',
  'nai-form': 'The plain negative: 食べない, 書かない.',
  'potential form': 'The form that says "can do": 食べられる, 書ける.',
  'passive': 'The form for "being done to": 食べられる, 書かれる.',
  'causative': 'The form for "making or letting someone do": 食べさせる, 書かせる.',
  'volitional': 'The "let us" / "I will" form: 食べよう, 書こう.',
  'conditional': 'An "if" form: 〜たら, 〜ば, 〜と.',
  'ichidan': 'A verb group (also る-verbs) whose dictionary form ends in -iru or -eru and just drops る to conjugate: 食べる → 食べます.',
  'godan': 'A verb group (also う-verbs) whose last kana changes along the rows: 書く → 書きます, 書かない, 書いて.',
  'irregular verb': 'Only two: する (to do) and 来る (to come).',
  'transitive': 'A verb that takes a direct object (を): 開ける = to open (something).',
  'intransitive': 'A verb with no direct object: 開く = to open (by itself).',
  'i-adjective': 'An adjective ending in い that conjugates itself: 大きい, 大きくない, 大きかった.',
  'na-adjective': 'An adjective that needs な before a noun: 静かな町. It conjugates through だ / です like a noun.',
  'adjective': 'A word that describes a noun: 大きい, 静か, 新しい.',
  'adverb': 'A word that tells how, when or how much: とても, よく, ゆっくり.',
  'noun': 'A word for a person, place or thing: 本, 学校, 友達.',
  'verb': 'A word for an action or state: 食べる, 行く, ある.',
  'conjunction': 'A word that joins sentences or parts of sentences: そして, でも, から, けど.',
  'counter': 'A word you add to a number to count things: 人 (people), 本 (long things), 枚 (flat things), つ (general things).',
  'honorific': 'Respectful language for the other person and what belongs to them: お名前, いらっしゃる.',
  'keigo': 'Honorific and humble speech used with customers and superiors.',
  'humble': 'Modest language for yourself and your own actions: 申します, いただく.',
  'kanji': 'Characters borrowed from Chinese. Each has a meaning and one or more readings.',
  'hiragana': 'The curvy kana used for Japanese words and endings: あいうえお.',
  'katakana': 'The angular kana used for foreign words and names: アイウエオ, コーヒー.',
  'furigana': 'Small kana printed above kanji to show how they are read.',
  'okurigana': 'The kana after a kanji that finish a word, like べる in 食べる.',
  'reading': 'How a kanji or word is pronounced, written in kana.',
  'stem': 'The part of a verb left when the ending is taken off, like 食べ in 食べます, or 書き in 書きます.',
  'sentence-ending particle': 'A small word at the end of a sentence that adds tone: か (question), ね (right?), よ (I tell you).',
  'word order': 'Japanese puts the verb last, and particles after the words they mark.',
  'negation': 'Making a sentence negative: ない (plain) or ません (polite).',
  'past tense': 'What already happened: 食べた / 食べました.',
  'present tense': 'What happens now or regularly (and often the future): 食べる / 食べます.',
  'imperative': 'The command form: 食べろ, 来い. Rude; use 〜てください to ask politely.',
  'clause': 'A group of words with its own verb.',
  'suffix': 'A little piece added to the end of a word: -さん, -ちゃん, -たち.',
  'prefix': 'A little piece added to the front of a word: お-, ご-.',
  'vowel': 'a, i, u, e, o: あ い う え お.',
  'consonant': 'Any sound that is not a vowel, like k, s, t, n.',
  'long vowel': 'A vowel held twice as long: おばさん (aunt) vs おばあさん (grandmother). Written with an extra kana, or ー in katakana.',
  'double consonant': 'A small っ before a consonant makes it last twice as long: きて vs きって.',
  'voiced': 'Sounds made with the throat buzzing, marked with two dots (゛): か → が.',
};
const GLOSS_RE = new RegExp('\\b(' + Object.keys(GLOSS).filter((k) => /^[a-z -]+$/.test(k)).sort((a, b) => b.length - a.length).join('|') + ')(s|es)?\\b', 'gi');
function glossify(root) {
  if (S.settings.gloss === false) return;
  document.querySelectorAll('.v-why > span:last-child, .gram p, .upd p, .upd li, .gloss').forEach((el) => {
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), nodes = []; while (w.nextNode()) nodes.push(w.currentNode);
    nodes.forEach((n) => {
      if (n.parentNode.closest && n.parentNode.closest('.hw, .gl')) return;
      const txt = n.nodeValue; GLOSS_RE.lastIndex = 0; if (!GLOSS_RE.test(txt)) return;
      GLOSS_RE.lastIndex = 0; const frag = document.createDocumentFragment(); let last = 0, m;
      while ((m = GLOSS_RE.exec(txt))) {
        frag.appendChild(document.createTextNode(txt.slice(last, m.index)));
        const s = document.createElement('span'); s.className = 'hw gl'; s.dataset.tip = GLOSS[m[1].toLowerCase()]; s.textContent = m[0]; frag.appendChild(s); last = m.index + m[0].length;
      }
      frag.appendChild(document.createTextNode(txt.slice(last))); n.parentNode.replaceChild(frag, n);
    });
  });
}
if (typeof render === 'function') {
  const glossRender = render;
  render = function () { glossRender.apply(this, arguments); try { glossify(); } catch (e) {} };
}

// ---------- hover bubbles: the word being explained is underlined ----------
// (a real element instead of a CSS ::after, so part of the text can be styled)
const hwTip = document.createElement('div'); hwTip.id = 'hwtip'; document.body.appendChild(hwTip);
function hwTipHtml(el) {
  const tip = el.dataset.tip || '';
  if (!el.dataset.wt) return esc(tip);
  return tip.split('  |  ').map((seg) => { const m = seg.match(/^((?:de|het) )?([^:]+): ([\s\S]*)$/); return m ? esc(m[1] || '') + '<u>' + esc(m[2]) + '</u>: ' + esc(m[3]) : esc(seg); }).join('<span class="sep">|</span>');
}
document.addEventListener('mouseover', (e) => {
  const el = e.target.closest && e.target.closest('.hw[data-tip]'); if (!el) return;
  hwTip.innerHTML = hwTipHtml(el); hwTip.classList.add('show');
  const r = el.getBoundingClientRect(), w = hwTip.offsetWidth, h = hwTip.offsetHeight;
  hwTip.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + 'px';
  hwTip.style.top = (r.top - h - 10 < 8 ? r.bottom + 10 : r.top - h - 10) + 'px';
});
document.addEventListener('mouseout', (e) => { const el = e.target.closest && e.target.closest('.hw[data-tip]'); if (el && !(e.relatedTarget && el.contains(e.relatedTarget))) hwTip.classList.remove('show'); });
document.addEventListener('mousedown', () => hwTip.classList.remove('show'));

// ---------- rest while you are away: the endless animations pause when the window is in the background ----------
const idleCheck = () => document.body.classList.toggle('idle', document.hidden || !document.hasFocus());
window.addEventListener('blur', () => document.body.classList.add('idle'));
window.addEventListener('focus', idleCheck);
document.addEventListener('visibilitychange', idleCheck);

// if the saved data finished loading before the last scripts ran, the first draw may have been too early: draw the page again now
if (typeof S !== 'undefined' && S && S.settings) { render(); if (typeof checkEarned === 'function') checkEarned(); }

// ---------- mini Bigg in the corner oinks when you click him ----------
function oink() {
  if ((S && S.settings && S.settings.sound === false) || vol() <= 0) return;
  try {
    actx = actx || new AudioContext(); const ctx = actx, t = ctx.currentTime, p = 0.9 + Math.random() * 0.22; // a slightly different pitch each time
    const v = vol(), burst = (start, f0, f1, dur, vol, band) => {
      const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(f0 * p, t + start); o.frequency.exponentialRampToValueAtTime(f1 * p, t + start + dur);
      f.type = 'bandpass'; f.frequency.value = band; f.Q.value = 2.2;
      g.gain.setValueAtTime(0.0001, t + start); g.gain.exponentialRampToValueAtTime(vol * v, t + start + 0.025); g.gain.exponentialRampToValueAtTime(0.0001, t + start + dur);
      o.connect(f).connect(g).connect(ctx.destination); o.start(t + start); o.stop(t + start + dur + 0.03);
    };
    burst(0, 200, 115, 0.2, 0.5, 650);    // "oi": a low grunt
    burst(0.17, 310, 600, 0.17, 0.36, 1500); // "nk": the little squeal at the end
  } catch {}
}
document.addEventListener('click', (e) => {
  const pig = e.target.closest && e.target.closest('.logo .pig-logo'); if (!pig) return;
  oink(); pig.classList.remove('squish'); void pig.getBoundingClientRect(); pig.classList.add('squish');
});
