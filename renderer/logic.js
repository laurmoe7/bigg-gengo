// Pure rules for BiggGengo (no DOM), shared by the app and the tests.
(function (root) {
  const L = {};
  const J = root.J || require('./japanese.js');

  // ---------- dates ----------
  L.ymd = (d) => { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  L.addDays = (ymd, n) => { const [y, m, d] = ymd.split('-').map(Number); return L.ymd(new Date(y, m - 1, d + n)); };
  L.daysBetween = (a, b) => { const p = (s) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); }; return Math.round((p(b) - p(a)) / 864e5); };
  L.uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  // ---------- state ----------
  L.defaultSettings = () => ({ dailyGoal: 10, newPerDay: 10, autoUpdate: true, rate: 0.9, volume: 1, voice: '', login: false, sound: true, theme: 'slate', looks: true, romaji: true, kanaOk: true, furigana: 'always', script: 'kanji', jlpt: 'N5' });
  L.emptyState = () => ({ v: 1, words: [], lessons: [], log: {}, settings: L.defaultSettings(), seeded: false });
  L.fixState = (s) => {
    const e = L.emptyState();
    s = Object.assign(e, s || {});
    s.settings = Object.assign(L.defaultSettings(), s.settings || {});
    s.words = s.words || []; s.lessons = s.lessons || []; s.log = s.log || {}; s.sheets = s.sheets || []; s.skills = s.skills || {}; s.knownFreq = s.knownFreq || []; s.missLog = s.missLog || []; s.snap = s.snap || {}; s.reads = s.reads || []; s.presets = s.presets || []; s.knownFreq = s.knownFreq || [];
    return s;
  };

  // ---------- spaced repetition ----------
  L.INTERVALS = [0, 1, 2, 4, 8, 16, 32, 64];
  L.newWord = (o) => Object.assign({ id: L.uid(), ja: '', reading: '', en: '', pos: 'other', vclass: '', example: '', exampleEn: '', exTok: '', lesson: '', box: 0, due: '', reps: 0, lapses: 0, created: Date.now() }, o);
  L.isDue = (w, today) => !w.due || w.due <= today;
  L.dueWords = (words, today) => words.filter((w) => !w.deleted && L.isDue(w, today)).sort((a, b) => a.box - b.box || (a.due || '').localeCompare(b.due || ''));
  // Today's study queue: every reviewed word that is due, plus up to newPerDay never-seen words (minus the ones started today).
  L.queue = (words, today, newPerDay, newToday) => {
    const live = words.filter((w) => !w.deleted);
    const rev = live.filter((w) => w.reps > 0 && L.isDue(w, today)).sort((a, b) => a.box - b.box || (a.due || "").localeCompare(b.due || ""));
    const fresh = live.filter((w) => !w.reps).slice(0, Math.max(0, newPerDay - (newToday || 0)));
    return rev.concat(fresh);
  };
  // FSRS (Free Spaced Repetition Scheduler, v5 default weights). Each word keeps stab (days until recall drops to 90%),
  // diff (1 easy .. 10 hard) and last (date of last review). 'box' is kept as a simple 0-7 level derived from stab, for the dots and tabs.
  const FW = [0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575, 0.1192, 1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655, 0.6621];
  const FF = 19 / 81, FC = -0.5, MAXI = 365;
  const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
  const GN = { again: 1, good: 3, easy: 4 };
  const d0 = (g) => clamp(FW[4] - Math.exp(FW[5] * (g - 1)) + 1, 1, 10);
  L.retrievability = (t, s) => Math.pow(1 + (FF * t) / s, FC);
  L.boxFromStab = (s) => (s < 1 ? 0 : Math.min(7, 1 + Math.floor(Math.log2(s))));
  // words from before FSRS (Leitner box only) get a starting stability from their old interval
  const fsrsState = (w, today) => {
    if (!w.reps) return null;
    if (w.stab) return { s: w.stab, d: w.diff || 5, last: w.last || today };
    const iv = L.INTERVALS[w.box || 0] || 0.5;
    return { s: Math.max(0.5, iv), d: 5, last: w.due && iv ? L.addDays(w.due, -iv) : today };
  };
  L.nextFsrs = (w, grade, today) => {
    const g = GN[grade], st = fsrsState(w, today);
    if (!st) return { s: FW[g - 1], d: d0(g) };
    const t = Math.max(0, L.daysBetween(st.last, today)), r = L.retrievability(t, st.s);
    const dd = st.d + (-FW[6] * (g - 3)) * ((10 - st.d) / 9);
    const d = clamp(FW[7] * d0(4) + (1 - FW[7]) * dd, 1, 10);
    let s;
    if (t < 1) s = st.s * Math.exp(FW[17] * (g - 3 + FW[18])); // reviewed again the same day
    else if (g === 1) s = Math.min(st.s, FW[11] * Math.pow(d, -FW[12]) * (Math.pow(st.s + 1, FW[13]) - 1) * Math.exp(FW[14] * (1 - r)));
    else s = st.s * (1 + Math.exp(FW[8]) * (11 - d) * Math.pow(st.s, -FW[9]) * (Math.exp(FW[10] * (1 - r)) - 1) * (g === 4 ? FW[16] : 1));
    return { s: clamp(s, 0.1, 36500), d };
  };
  const ivOf = (s) => clamp(Math.round(s), 1, MAXI);
  // grade: 'again' | 'good' | 'easy'
  L.grade = (w, grade, today) => {
    const n = Object.assign({}, w), f = L.nextFsrs(w, grade, today);
    n.reps = (w.reps || 0) + 1; n.stab = f.s; n.diff = f.d; n.last = today;
    if (grade === 'again') { n.lapses = (w.lapses || 0) + 1; n.due = today; n.box = 0; }
    else { n.due = L.addDays(today, ivOf(f.s)); n.box = Math.max(1, L.boxFromStab(f.s)); }
    return n;
  };
  // days until the next review for each answer, to show on the buttons
  L.previewIntervals = (w, today) => ({ again: 0, good: ivOf(L.nextFsrs(w, 'good', today).s), easy: ivOf(L.nextFsrs(w, 'easy', today).s) });

  // ---------- two cards per word ----------
  // Each word has two cards, each with its own schedule: Japanese → English (recognising it, the word's own fields) and
  // English → Japanese (producing it, kept in w.rv). A word's first card always counts for Japanese → English; its English → Japanese
  // card can start from the next day, a few a day, the words you know best first.
  const RV_KEYS = ['reps', 'stab', 'diff', 'last', 'due', 'box', 'lapses'];
  L.revRec = (w) => Object.assign({ reps: 0, box: 0, due: '', lapses: 0 }, w.rv || {});
  L.cardRec = (w, dir) => (dir === 'en-ja' && w.reps ? L.revRec(w) : w); // the schedule a card of this direction uses
  L.gradeCard = (w, grade, today, dir) => {
    const rec = L.cardRec(w, dir);
    if (rec === w) return L.grade(w, grade, today);
    const r = L.grade(rec, grade, today), rv = {};
    RV_KEYS.forEach((k) => { if (r[k] !== undefined) rv[k] = r[k]; });
    return Object.assign({}, w, { rv });
  };
  // Today's cards as [{ w, dir }]. o = { dirs: 'ja-en' | 'en-ja' | 'both', newPerDay, newToday, revPerDay, revToday }.
  // Due reviews (lowest level first), with new words (always Japanese first) and English → Japanese cards to start spread evenly
  // between them, so new cards are not all left for the end of a long session.
  // A word is in it once: when both its cards are due, the one that has waited longest comes (the other waits a day).
  L.cardQueue = (words, today, o) => {
    const dirs = o.dirs || 'both', fwd = dirs !== 'en-ja', back = dirs !== 'ja-en', live = words.filter((w) => !w.deleted), due = [];
    live.forEach((w) => {
      if (!w.reps) return;
      const r = L.revRec(w), f = fwd && L.isDue(w, today), b = back && r.reps > 0 && L.isDue(r, today);
      if (b && (!f || (r.due || '') <= (w.due || ''))) due.push({ w, dir: 'en-ja', rec: r });
      else if (f) due.push({ w, dir: 'ja-en', rec: w });
    });
    due.sort((x, y) => x.rec.box - y.rec.box || (x.rec.due || '').localeCompare(y.rec.due || ''));
    const fresh = live.filter((w) => !w.reps).slice(0, Math.max(0, (o.newPerDay || 0) - (o.newToday || 0))).map((w) => ({ w, dir: 'ja-en' }));
    const busy = new Set(due.map((c) => c.w.id));
    const start = !back ? [] : live.filter((w) => w.reps > 0 && !L.revRec(w).reps && (!w.last || w.last < today) && !busy.has(w.id))
      .sort((x, y) => (y.stab || 0) - (x.stab || 0)).slice(0, Math.max(0, (o.revPerDay || 0) - (o.revToday || 0))).map((w) => ({ w, dir: 'en-ja' }));
    return L.spread(due.map(({ w, dir }) => ({ w, dir })), fresh.concat(start));
  };
  // Puts the items of `extra` evenly between the items of `base`, keeping both orders: [a b c d] + [X Y] -> [a X b c Y d]
  L.spread = (base, extra) => {
    if (!extra.length || !base.length) return base.concat(extra);
    const out = [], n = base.length + extra.length, gap = n / extra.length;
    let b = 0, e = 0;
    for (let i = 0; i < n; i++) {
      const wantExtra = e < extra.length && (b >= base.length || i >= Math.floor(gap * (e + 0.5)));
      out.push(wantExtra ? extra[e++] : base[b++]);
    }
    return out;
  };
  // ---------- tricky words ----------
  // A card missed L.TRICKY times or more that is still not strong (level under 4) keeps slipping: Bigg asks for a memory trick
  // and offers extra practice. It stops being tricky once that card is strong again.
  L.TRICKY = 4;
  L.missCount = (w) => (w.lapses || 0) + (L.revRec(w).lapses || 0);
  L.isTricky = (w) => {
    if (!w || w.deleted || !w.reps) return false;
    const r = L.revRec(w);
    return ((w.lapses || 0) >= L.TRICKY && (w.box || 0) < 4) || ((r.lapses || 0) >= L.TRICKY && (r.box || 0) < 4);
  };
  L.trickyWords = (words) => words.filter(L.isTricky).sort((a, b) => L.missCount(b) - L.missCount(a));
  // Cards to review ahead of schedule (not due yet), soonest first, one per word
  L.aheadCards = (words, today, dirs) => {
    const out = [];
    words.filter((w) => !w.deleted && w.reps > 0).forEach((w) => {
      const r = L.revRec(w), f = dirs !== 'en-ja' && !L.isDue(w, today), b = dirs !== 'ja-en' && r.reps > 0 && !L.isDue(r, today);
      if (b && (!f || r.due < w.due)) out.push({ w, dir: 'en-ja', due: r.due }); else if (f) out.push({ w, dir: 'ja-en', due: w.due });
    });
    return out.sort((x, y) => (x.due || '').localeCompare(y.due || '')).map(({ w, dir }) => ({ w, dir }));
  };
  L.mastery = (words) => {
    const live = words.filter((w) => !w.deleted);
    const learned = live.filter((w) => w.box >= 4).length;
    return { total: live.length, learned, learning: live.filter((w) => w.box > 0 && w.box < 4).length, fresh: live.filter((w) => !w.reps).length };
  };

  // ---------- activity log, streak ----------
  L.bump = (log, today, key, n) => { const d = log[today] || (log[today] = {}); d[key] = (d[key] || 0) + (n == null ? 1 : n); return d; };
  L.streak = (log, today) => {
    const active = (d) => log[d] && ((log[d].reviews || 0) + (log[d].lessons || 0) + (log[d].listen || 0)) > 0;
    let day = active(today) ? today : L.addDays(today, -1); // today not studied yet doesn't break it
    let n = 0;
    while (active(day)) { n++; day = L.addDays(day, -1); }
    return n;
  };
  L.week = (log, today) => { const out = []; for (let i = 6; i >= 0; i--) { const d = L.addDays(today, -i); out.push({ d, n: ((log[d] || {}).reviews || 0) + ((log[d] || {}).listen || 0) }); } return out; };

  // ---------- answer checking ----------
  // English text is compared without accents or punctuation. Japanese (kana, kanji or romaji) goes through J.norm: katakana = hiragana, romaji is read as kana.
  L.norm = (s) => (J.hasJa(s) ? J.norm(s) : String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim());
  L.lev = (a, b) => {
    const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
    let prev = Array.from({ length: n + 1 }, (_, i) => i);
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[n];
  };
  // 'right' | 'close' (one typo or a missing accent) | 'wrong'. `answer` may hold several meanings split by / ; or a comma ("wage, salary"):
  // typing any one of them is enough. Text in (brackets) is a note and is ignored, so commas inside it do not split anything.
  L.check = (typed, answer) => {
    const t = L.norm(typed); if (!t) return 'wrong';
    const parts = String(answer).replace(/\(.*?\)/g, '').split(/[\/;,]/).map((a) => a.trim()).filter(Boolean), alts = parts.map(L.norm).filter(Boolean);
    if (alts.includes(t)) return parts.some((a) => a.toLowerCase() === typed.trim().toLowerCase()) ? 'right' : 'close';
    if (alts.some((a) => a.length > 4 && L.lev(t, a) <= 1)) return 'close';
    return 'wrong';
  };
  // A typed Japanese word (kanji, kana or romaji) against a word { ja, reading }. The reading counts as right unless opt.strictKanji (then 'close').
  L.checkWord = (typed, w, opt) => {
    const r = J.matchWord(typed, w);
    return r === 'reading' ? (opt && opt.strictKanji ? 'close' : 'right') : r;
  };
  L.stripArticle = (s) => String(s); // Japanese has no articles; kept so older calls still work

  // ---------- dictation: letter diff, sentence diff, confusable sounds ----------
  // Sounds learners mix up when writing what they hear. `rules` are [a, b] spellings that sound alike or close; `collapse` removes the difference
  // altogether; `re` finds practice words (by their reading).
  const dropLong = (s) => s.replace(/(?<=[おこそとのほもよろをごぞどぼぽょぉ])[うおー]/g, '').replace(/(?<=[えけせてねへめれげぜでべぺぇ])[いえー]/g, '')
    .replace(/(?<=[あかさたなはまやらわがざだばぱゃぁ])[あー]/g, '').replace(/(?<=[いきしちにひみりぎじぢびぴぃ])[いー]/g, '').replace(/(?<=[うくすつぬふむゆるぐずづぶぷゅぅ])[うー]/g, '');
  const VOICING = [['かきくけこ', 'がぎぐげご'], ['さしすせそ', 'ざじずぜぞ'], ['たちつてと', 'だぢづでど'], ['はひふへほ', 'ばびぶべぼ']];
  const HALF = [['はひふへほ', 'ぱぴぷぺぽ'], ['ばびぶべぼ', 'ぱぴぷぺぽ']];
  const pairRules = (sets) => sets.flatMap(([a, b]) => Array.from(a, (c, i) => [c, b[i]]));
  L.SOUNDS = {
    'long-vowel': { name: 'Long vowels', tip: 'Hold a long vowel twice as long: おばさん (aunt) vs おばあさん (grandmother), ゆき (snow) vs ゆうき (courage). In writing, o-sounds usually end in う (とうきょう), a few in お (おおきい, とおい).', re: /[おこそとのほもよろごぞどぼぽょ][うお]|[えけせてねへめれげぜでべぺ][いえ]|ー|(.)\1/, collapse: dropLong },
    'small-tsu': { name: 'Small っ (a short pause)', tip: 'A small っ doubles the next consonant with a tiny pause: きて (come) vs きって (stamp), おと (sound) vs おっと (husband).', re: /っ/, collapse: (s) => s.replace(/っ/g, '') },
    'small-kana': { name: 'Small ゃ ゅ ょ', tip: 'A small ゃ ゅ ょ blends into the kana before it, in one beat: びょういん (hospital) vs びよういん (beauty salon).', re: /[ゃゅょ]/, rules: [['ゃ', 'や'], ['ゅ', 'ゆ'], ['ょ', 'よ'], ['っ', 'つ']] },
    'voicing': { name: 'Voiced or not (か / が)', tip: 'Two dots (゛) make a voiced sound: か → が, さ → ざ, た → だ, は → ば. A small circle (゜) makes は → ぱ. Say the word out loud and feel your throat: voiced sounds buzz.', re: /[かきくけこさしすせそたちつてとはひふへほがぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽ]/, rules: [...pairRules(VOICING), ...pairRules(HALF)] },
    'particles': { name: 'は / わ, を / お, へ / え', tip: 'The particles are written は (wa), を (o) and へ (e), but they sound like わ, お and え. In every other word, write the sound you hear: わたし, おとこ, えき.', re: /[はをへ]/, rules: [['は', 'わ'], ['を', 'お'], ['へ', 'え']] },
    'ji-zu': { name: 'じ / ぢ, ず / づ', tip: 'じ and ぢ sound the same, and so do ず and づ. Almost every word uses じ and ず. ぢ and づ only appear in a few words (はなぢ, こづつみ) and when a sound is voiced inside a word (つづく, ちかぢか).', re: /[じぢずづ]/, rules: [['じ', 'ぢ'], ['ず', 'づ']] },
    'shi-chi': { name: 'し / ち / つ and sa-ta rows', tip: 'し is "shi", ち is "chi" and つ is "tsu": the odd ones out in their rows. Listen for the first sound.', re: /[しちつ]/, rules: [['し', 'ち'], ['し', 'す'], ['ち', 'つ'], ['つ', 'す']] },
    'n-sound': { name: 'ん / な row', tip: 'ん is a hum that takes a whole beat on its own: ほんや (bookshop) vs ほや, かんじ (kanji) vs かじ (fire, housework).', re: /ん/, collapse: (s) => s.replace(/ん/g, '') },
  };
  // Which known confusions explain why `typed` was written instead of `target`? (both as kana)
  L.soundTags = (target, typed) => {
    const t = L.norm(target), y = L.norm(typed), tags = [];
    if (!t || !y || t === y) return tags;
    for (const [id, s] of Object.entries(L.SOUNDS)) {
      if (s.collapse) { if (s.collapse(t) === s.collapse(y)) tags.push(id); continue; }
      let hit = false;
      for (const [a, b] of s.rules) for (const [from, to] of [[a, b], [b, a]]) {
        let i = y.indexOf(from);
        while (i >= 0 && !hit) { if (y.slice(0, i) + to + y.slice(i + from.length) === t) hit = true; i = y.indexOf(from, i + 1); }
      }
      if (hit) tags.push(id);
    }
    return tags;
  };
  // Compare what was heard with what was typed, word by word. `target` is the sentence; `tokStr` (optional) is its words from the data file
  // ("surface;reading;basic|..."). Typed kanji are compared with the sentence as written, anything else with its kana reading.
  // Words: { w, status: ok | close | missed, typed }.
  L.diffWords = (target, typed, tokStr) => {
    const toks = (tokStr ? J.tokens([target, '', tokStr]) : Array.from(String(target), (c) => ({ s: c, r: J.hasKanji(c) ? '' : J.toHira(c) })));
    const kanjiTyped = J.hasKanji(typed), canKana = toks.every((t) => t.r || !J.hasKanji(t.s));
    const segs = toks.map((t) => J.norm(kanjiTyped || !canKana ? t.s : (t.r || t.s)));
    const T = Array.from(segs.join('')), Y = Array.from(J.norm(typed)), m = T.length, n = Y.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = m - 1; i >= 0; i--) for (let j = n - 1; j >= 0; j--) dp[i][j] = T[i] === Y[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    const okT = new Array(m).fill(false), okY = new Array(n).fill(false);
    for (let i = 0, j = 0; i < m && j < n;) { if (T[i] === Y[j]) { okT[i] = true; okY[j] = true; i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++; }
    let pos = 0; const words = [];
    toks.forEach((t, k) => {
      const len = Array.from(segs[k]).length; if (!len) return;
      const got = okT.slice(pos, pos + len).filter(Boolean).length; pos += len;
      words.push({ w: t.s, status: got === len ? 'ok' : got * 2 >= len ? 'close' : 'missed', typed: '' });
    });
    const extra = Y.filter((_, k) => !okY[k]), good = okT.filter(Boolean).length, score = m ? good / m : 0;
    return { words, extra: extra.length ? [extra.join('')] : [], score, result: good === m && !extra.length ? 'right' : score >= 0.85 ? 'close' : 'wrong' };
  };
  // Per-letter marks for the target: [{ c, ok }], plus the typed letters that were not needed. Letters are compared as hiragana; romaji typing is read as kana.
  L.letterDiff = (target, typed) => {
    const strip = (c) => J.toHira(String(c).normalize('NFKC').toLowerCase()), tt = String(typed || '').trim(), tk = J.hasJa(tt) ? tt : J.toKana(tt.toLowerCase(), { final: true });
    const t = Array.from(String(target), strip), y = Array.from(tk, strip), m = t.length, n = y.length;
    const dp = Array.from({ length: m + 1 }, (_, a) => { const r = new Array(n + 1).fill(0); r[0] = a; return r; });
    for (let b = 0; b <= n; b++) dp[0][b] = b;
    for (let a = 1; a <= m; a++) for (let b = 1; b <= n; b++) dp[a][b] = Math.min(dp[a - 1][b] + 1, dp[a][b - 1] + 1, dp[a - 1][b - 1] + (t[a - 1] === y[b - 1] ? 0 : 1));
    const cells = Array.from(String(target), (c) => ({ c, ok: false })), extra = [];
    let a = m, b = n;
    while (a > 0 || b > 0) {
      if (a > 0 && b > 0 && t[a - 1] === y[b - 1] && dp[a][b] === dp[a - 1][b - 1]) { cells[a - 1].ok = true; a--; b--; }
      else if (a > 0 && b > 0 && dp[a][b] === dp[a - 1][b - 1] + 1) { a--; b--; }
      else if (a > 0 && dp[a][b] === dp[a - 1][b] + 1) a--;
      else { extra.unshift(y[b - 1]); b--; }
    }
    return { cells, extra };
  };
  // How a near miss was spelled: your letters with the wrong ones marked, and the ones you left out shown in place. answers: what would count
  // (kanji, kana or English); the closest one is used. Japanese is compared as hiragana, and romaji typing is shown as the kana it makes.
  // Returns { marks: [[letter, 'ok' | 'bad' | 'miss']], answer, tags: sound slips (L.SOUNDS ids) } or null when nothing is misspelled.
  L.spellMarks = (typed, answers) => {
    const list = (answers || []).map((x) => String(x || '').replace(/\(.*?\)/g, '').trim()).filter(Boolean), raw = String(typed || '').trim();
    if (!raw || !list.length) return null;
    const ja = list.some((x) => J.hasJa(x)), ty = ja && !J.hasJa(raw) ? J.toKana(raw.toLowerCase(), { final: true }) : raw;
    const key = ja ? (c) => J.toHira(c.normalize('NFKC')) : (c) => c.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const skip = /[\s　。、！？!?.,「」]/;
    const T = Array.from(ty).filter((c) => !skip.test(c)), t = T.map(key);
    const dist = (x) => L.lev(t.join(''), Array.from(x).filter((c) => !skip.test(c)).map(key).join(''));
    const best = list.reduce((x, y) => (dist(y) < dist(x) ? y : x)), A = Array.from(best).filter((c) => !skip.test(c)), a = A.map(key), n = t.length, m = a.length;
    const dp = Array.from({ length: n + 1 }, (_, i) => { const r = new Array(m + 1).fill(0); r[0] = i; return r; });
    for (let j = 0; j <= m; j++) dp[0][j] = j;
    for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (t[i - 1] === a[j - 1] ? 0 : 1));
    if (!dp[n][m]) return null;
    const out = []; let i = n, j = m;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && t[i - 1] === a[j - 1] && dp[i][j] === dp[i - 1][j - 1]) { out.push([T[i - 1], 'ok']); i--; j--; }
      else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) { out.push([T[i - 1], 'bad']); i--; j--; }
      else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) { out.push([T[i - 1], 'bad']); i--; }
      else { out.push([A[j - 1], 'miss']); j--; }
    }
    return { marks: out.reverse(), answer: best, tags: ja ? L.soundTags(best, ty) : [] };
  };
  // ---------- sentence builder (Grammar page) ----------
  // A real sentence cut into phrase tiles: each content word keeps the particles, endings and helper verbs that follow it,
  // so 私|は|学校|に|行き|ます becomes 私は / 学校に / 行きます. toks: from J.tokens. The last ! ? or 。 is kept apart as `end`.
  const JB_PART = new Set('は が を に で へ と も の から まで より や か ね よ な わ ぞ ぜ さ って けど けれど し ば たら たり なら ほど だけ しか など くらい ぐらい ごろ かも かな かしら かい じゃん ので のに ながら よね'.split(' '));
  const JB_AUX = new Set('ます まし ませ ましょ ん です でし だ だっ た て てる てた ちゃ じゃ ない なかっ なく なけれ たい たく たかっ い いる いた いま う よう れる られる られ れ せる させる せ させ そう らしい みたい でしょ だろ ござい とく ちゃう ちゃっ じゃっ 過ぎ すぎ 過ぎる すぎる'.split(' '));
  const JB_SUFFIX = new Set('さん ちゃん くん 君 様 たち 達 的 屋 語 人'.split(' '));
  const JB_COUNTER = new Set('時 分 年 月 日 回 歳 個 枚 本 円 つ 匹 冊 台 階 杯 週間 時間 人'.split(' '));
  const JB_PREFIX = new Set('お ご 不 未 無 非 この その あの どの こんな そんな あんな どんな'.split(' ')); // these stick to the word after them
  const JB_CASE = new Set('は が を に へ で と から まで も より'.split(' '));
  L.chunkSentence = (toks) => {
    toks = (toks || []).slice(); let end = '';
    while (toks.length && /^[。！？!?.…]+$/.test(toks[toks.length - 1].s)) end = toks.pop().s + end;
    const chunks = []; let glue = false;
    toks.forEach((t, i) => {
      const prev = toks[i - 1], cur = chunks[chunks.length - 1];
      const afterCase = prev && JB_CASE.has(prev.s) && !(cur && cur.toks.length === 1); // が|ない: ない starts its own tile after a particle
      const attach = cur && !glue && (/^[、，,]$/.test(t.s) || JB_PART.has(t.s) || (JB_AUX.has(t.s) && !afterCase) || t.b === 'する' && prev && !JB_CASE.has(prev.s) && J.hasKanji(prev.s)
        || JB_SUFFIX.has(t.s) || (JB_COUNTER.has(t.s) && /[0-9０-９一二三四五六七八九十百千万何]$/.test(prev ? prev.s : '')));
      if (attach || glue) { cur.toks.push(t); cur.s += t.s; } else chunks.push({ s: t.s, toks: [t] });
      glue = JB_PREFIX.has(t.s) && i < toks.length - 1;
    });
    chunks.forEach((c) => { c.s = c.s.replace(/[、，,]$/, ''); });
    return { chunks, end };
  };
  // The job of a tile, from the particle at its end. The last tile is the predicate (the verb, adjective or です that ends the sentence).
  L.JB_ROLES = { topic: 'topic (は)', subj: 'subject (が)', obj: 'object (を)', goal: 'where to / when (に, へ)', place: 'where / how (で)', with: 'with / and (と)', from: 'from / until (から, まで)', also: 'also (も)', mod: 'describes the next word (の, な)', pred: 'verb / end of the sentence' };
  L.jbRole = (chunk, last) => {
    if (last) return 'pred';
    const p = (chunk.toks.filter((t) => !/^[、，,]$/.test(t.s)).pop() || {}).s;
    return { は: 'topic', が: 'subj', を: 'obj', に: 'goal', へ: 'goal', で: 'place', と: 'with', から: 'from', まで: 'from', も: 'also', の: 'mod', な: 'mod' }[p] || '';
  };
  // Kinds of sentence, for the chips: ids from L.JB_PATS
  L.JB_PATS = [['all', 'Mixed'], ['wa-ga', 'は and が'], ['wo', 'Objects (を)'], ['place', 'Where and when (に へ で)'], ['question', 'Questions'], ['past', 'Past'], ['neg', 'Negative'], ['te', 'て-form']];
  L.jbPatterns = (toks, chunks, end) => {
    const roles = chunks.map((c, i) => L.jbRole(c, i === chunks.length - 1)), s = toks.map((t) => t.s), out = [];
    if (roles.includes('topic') || roles.includes('subj')) out.push('wa-ga');
    if (roles.includes('obj')) out.push('wo');
    if (roles.includes('goal') || roles.includes('place')) out.push('place');
    if (/[？?]/.test(end) || s[s.length - 1] === 'か') out.push('question');
    if (toks.some((t) => t.b === 'た' || t.b === 'だ' && t.s === 'だっ') || s.includes('まし') && s.includes('た') || /かっ$/.test(s.join('|'))) out.push('past');
    if (s.some((x, i) => (x === 'ない' || x === 'なかっ' || x === 'なく' || x === 'ん' && s[i - 1] === 'ませ') && !JB_CASE.has(s[i - 1]))) out.push('neg');
    if (s.some((x, i) => (x === 'て' || x === 'てる' || x === 'てた') && i > 0)) out.push('te');
    return out;
  };
  // Grades a built order against the real sentence (tile strings). 'right' when it is the same, or when only whole particle phrases moved
  // and the predicate is still last (Japanese lets those move: the particles show each word's job); 'close' when the predicate is last but
  // other tiles are mixed up; otherwise 'wrong'. bad: the positions that differ from the real sentence.
  L.jbGrade = (target, answer, roles) => {
    const n = target.length, bad = target.map((w, i) => (answer[i] === w ? -1 : i)).filter((i) => i >= 0);
    if (answer.length !== n) return { res: 'wrong', bad };
    if (!bad.length) return { res: 'right', bad };
    if (answer[n - 1] !== target[n - 1]) return { res: 'wrong', bad };
    // phrases: a particle tile together with the tiles before it that describe it (私の / 友達と). Words without a particle stay with the next phrase.
    const FREE = ['topic', 'subj', 'obj', 'goal', 'place', 'with', 'from', 'also'], units = []; let u = [];
    for (let i = 0; i < n - 1; i++) { u.push(target[i]); if (FREE.includes((roles || [])[i])) { units.push(u); u = []; } }
    if (u.length) return { res: 'close', bad }; // a word right before the verb (an adverb or object without a particle) has to stay there
    const used = units.map(() => false); let at = 0;
    while (at < n - 1) {
      const k = units.findIndex((x, j) => !used[j] && x.every((w, d) => answer[at + d] === w));
      if (k < 0) return { res: 'close', bad };
      used[k] = true; at += units[k].length;
    }
    return { res: 'right', bad: [], alt: true };
  };
  // How many tiles from the start are in the right place (a hint keeps these and adds the next one)
  L.jbPrefix = (target, answer) => { let k = 0; while (k < answer.length && k < target.length && answer[k] === target[k]) k++; return k; };

  // Hint text for dictation: level 1 = one blank per character, level 2 = the first character too.
  L.hintText = (target, level) => { const cs = Array.from(String(target).replace(/[。、！？!?.,，\s「」]+/g, '')); return cs.map((c, i) => (i === 0 && level >= 2 ? c : '○')).join(' '); };
  // Words to practise a sound with (looked up by their reading).
  L.soundWords = (words, id) => { const s = L.SOUNDS[id]; return s ? words.filter((w) => !w.deleted && s.re.test(J.toHira(w.reading || w.ja))) : []; };

  // Pulls the JSON out of a whole pasted reply (plain JSON, a fenced block, or JSON buried in text). null if there is none.
  L.extractJson = (text) => {
    text = String(text || '');
    try { return JSON.parse(text); } catch {}
    const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) { try { return JSON.parse(fence[1]); } catch {} }
    for (let i = 0; i < text.length; i++) {
      if (text[i] !== '{' && text[i] !== '[') continue;
      let depth = 0, inStr = false, esc = false;
      for (let j = i; j < text.length; j++) {
        const d = text[j];
        if (inStr) { if (esc) esc = false; else if (d === '\\') esc = true; else if (d === '"') inStr = false; continue; }
        if (d === '"') inStr = true;
        else if (d === '{' || d === '[') depth++;
        else if (d === '}' || d === ']') {
          depth--;
          if (depth === 0) { try { const v = JSON.parse(text.slice(i, j + 1)); if (v && (v.words || v.lessons || Array.isArray(v))) return v; } catch {} break; }
        }
      }
    }
    return null;
  };
  // ---------- practice worksheets made by Claude, done in the app, tracked by skill ----------
  // ---------- practice worksheets made by Claude, done in the app, tracked by skill ----------
  L.SKILLS = ['particles', 'verb forms', 'te-form', 'past tense', 'adjectives', 'politeness', 'negation', 'counters', 'reading kanji', 'kana', 'vocabulary', 'word order', 'questions', 'connectors', 'other'];
  L.SKILL_NAMES = { particles: 'Particles (は, が, を, に...)', 'verb forms': 'Verb forms', 'te-form': 'て-form', 'past tense': 'Past tense', adjectives: 'Adjectives (い / な)', politeness: 'Polite and plain speech', negation: 'Negation (ない, ません)', counters: 'Numbers & counters', 'reading kanji': 'Reading kanji', kana: 'Kana', vocabulary: 'Vocabulary', 'word order': 'Word order', questions: 'Questions', connectors: 'Connectors (から, けど, ので...)', other: 'Other' };
  L.normSkill = (s) => {
    const t = String(s || '').toLowerCase().trim();
    if (L.SKILLS.includes(t)) return t;
    const map = [[/particle|助詞|\bwa\b.*\bga\b|topic marker/, 'particles'], [/te.?form|て形|て-form|\bte\b/, 'te-form'], [/past|tense|perfect|ta.?form/, 'past tense'], [/adject/, 'adjectives'], [/polite|keigo|honorific|humble|formal|desu|masu|casual|plain/, 'politeness'],
      [/negat|nai\b/, 'negation'], [/counter|numeral|number/, 'counters'], [/kanji|reading|furigana|okurigana/, 'reading kanji'], [/kana|hiragana|katakana/, 'kana'], [/verb|conjug|potential|passive|causative/, 'verb forms'],
      [/word.?order|syntax|sentence structure/, 'word order'], [/vocab|word.?choice|meaning/, 'vocabulary'], [/question/, 'questions'], [/connect|conjunct|because|clause|から|けど|ので/, 'connectors']];
    for (const [re, id] of map) if (re.test(t)) return id;
    return 'other';
  };
  const ITEM_TYPES = ['mc', 'fill', 'order', 'translate', 'correct', 'write'];
  // Reads Claude's worksheet reply: { sheet } or { error }.
  L.parseSheet = (text) => {
    const j = L.extractJson(text);
    if (!j) return { error: 'I could not find a worksheet in that text. Paste the whole reply from Claude, JSON included.' };
    const ws = j.worksheet || j, raw = Array.isArray(ws) ? ws : ws.items;
    if (!Array.isArray(raw) || !raw.length) return { error: 'That JSON has no worksheet items.' };
    const items = []; let skipped = 0;
    raw.slice(0, 30).forEach((r) => {
      if (!r || typeof r !== 'object') { skipped++; return; }
      const type = String(r.type || '').toLowerCase(), q = String(r.q || r.question || '').trim(), answer = String(r.answer == null ? '' : r.answer).trim();
      if (!ITEM_TYPES.includes(type) || !q || (!answer && type !== 'write')) { skipped++; return; }
      const it = { id: String(items.length + 1), type, q, answer, alt: (Array.isArray(r.alt) ? r.alt : []).map(String).map((x) => x.trim()).filter(Boolean), why: String(r.why || r.explanation || '').trim(), tr: String(r.tr || r.translation || '').trim(), rd: String(r.rd || '').replace(/s/g, ''), skill: L.normSkill(r.skill || r.category) };
      if (type === 'mc') {
        const options = (Array.isArray(r.options) ? r.options : []).map(String);
        if (options.length < 2 || !options.includes(answer)) { skipped++; return; }
        it.options = options;
      }
      items.push(it);
    });
    if (!items.length) return { error: 'None of the items could be used. Ask Claude to follow the JSON shape exactly.' };
    return { sheet: { title: String(ws.title || 'Practice worksheet').slice(0, 80), items, skipped } };
  };
  // Marks one answer. verdict: right | close | wrong | unsure (needs Claude or a self-check) | blank. final = no further checking needed.
  L.autoMark = (item, typed) => {
    const t = String(typed || '').trim();
    if (!t) return { verdict: 'blank', final: false };
    if (item.type === 'mc') return { verdict: t === item.answer ? 'right' : 'wrong', final: true };
    if (item.type === 'write') return { verdict: 'unsure', final: false };
    const accepted = [item.answer, item.rd].concat(item.alt || []).filter(Boolean), ja = J.hasJa(item.answer), nf = ja ? J.norm : L.norm, n = nf(t); // Japanese answers can be typed in kanji, kana or romaji
    if (accepted.some((a) => nf(a) === n)) return { verdict: 'right', final: true };
    if (item.type === 'fill') return { verdict: accepted.some((a) => [...nf(a)].length > (ja ? 3 : 4) && J.lev(n, nf(a)) <= 1) ? 'close' : 'wrong', final: true };
    return { verdict: 'unsure', final: false }; // several translations or word orders can be right: let Claude judge
  };
  L.SCORE = { right: 1, close: 0.75, partly: 0.5, wrong: 0, unsure: 0, blank: 0 };
  L.sheetScore = (sheet) => {
    const rs = sheet.items.map((it) => (sheet.results && sheet.results[it.id]) || null);
    const marked = rs.filter((r) => r && r.verdict && !['unsure', 'blank'].includes(r.verdict));
    return { got: marked.reduce((a, r) => a + (L.SCORE[r.verdict] || 0), 0), of: sheet.items.length, marked: marked.length };
  };
  // Running record per skill: the last 30 outcomes (1 = right, 0 = missed) and a few recent mistakes.
  L.recordOutcome = (skills, skill, ok, example, date) => {
    const k = L.normSkill(skill), s = skills[k] || (skills[k] = { hist: [], examples: [], last: '' });
    s.hist.push(ok ? 1 : 0); if (s.hist.length > 30) s.hist.shift();
    s.last = date || s.last;
    if (!ok && example) { s.examples.unshift(example); s.examples = s.examples.slice(0, 5); }
    return s;
  };
  L.weakSkills = (skills, n) => Object.entries(skills || {}).map(([skill, s]) => {
    const total = s.hist.length, wrong = s.hist.filter((x) => !x).length;
    return { skill, total, wrong, acc: total ? (total - wrong) / total : 1, examples: s.examples, last: s.last };
  }).filter((x) => x.wrong > 0).sort((a, b) => b.wrong - a.wrong || a.acc - b.acc).slice(0, n || 3);
  const JSON_SHEET = '{"worksheet":{"title":"Short title","items":[{"type":"mc","skill":"particles","q":"私___学生です。","options":["は","を","に"],"answer":"は","rd":"わたしはがくせいです。","why":"は marks the topic of the sentence.","tr":"I am a student."},{"type":"fill","skill":"te-form","q":"毎日、日本語を勉強___います。(する)","answer":"して","alt":[],"rd":"まいにち、にほんごをべんきょうしています。","why":"する becomes して in the て-form.","tr":"I study Japanese every day."},{"type":"translate","skill":"word order","q":"Tomorrow I have an appointment.","answer":"明日、予約があります。","alt":["明日予約があります。"],"rd":"あしたよやくがあります。","why":"The verb comes last."}]}}';
  let LEVEL = 'I am learning Japanese (around JLPT N5, starting on N4)';
  L.setLevel = (n) => { LEVEL = n ? 'I am learning Japanese (around JLPT ' + n + ')' : LEVEL; };
  L.levelText = () => LEVEL;
  L.TOPICS = ['Greetings & introductions', 'Family & friends', 'Food & restaurants', 'Shopping & money', 'Travel & transport', 'Directions & places', 'Daily routine', 'School & study', 'Work & jobs', 'Health & the doctor', 'Home & neighbours', 'Weather & seasons', 'Hobbies & free time', 'Phone & technology', 'Culture & festivals'];
  L.sheetPrompt = (o) => {
    const wordList = (o.words || []).slice(0, 40).map((w) => w.ja + (w.reading ? '（' + w.reading + '）' : '') + (w.en ? ' (' + w.en + ')' : '')).join(', ');
    const lines = [`${LEVEL}. Please make me a practice worksheet of ${o.count || 12} items that I will complete inside my BiggGengo app, so reply with ONLY one JSON object in a code block and no other text.`];
    if (o.topics && o.topics.length) lines.push('Topics to include (spread them across the items): ' + o.topics.join(', ') + '.');
    if (o.grammar && o.grammar.length) lines.push('Grammar to include (at least two items for each): ' + o.grammar.map((g) => L.SKILL_NAMES[g] || g).join(', ') + '.');
    if (wordList) lines.push('Use these words from my own list where it makes sense: ' + wordList + '.');
    if (o.weak && o.weak.length) lines.push('My weak spots, so make at least half of the items practise these:\n' + o.weak.map((w) => `- ${L.SKILL_NAMES[w.skill] || w.skill}: missed ${w.wrong} of my last ${w.total}${w.examples && w.examples[0] ? `; for example I wrote "${w.examples[0].yours}" where "${w.examples[0].correct}" was right` : ''}`).join('\n'));
    if (o.note) lines.push('In my own words, what else I want: ' + o.note);
    const KIND_TXT = { mc: '"mc" (2 to 4 options)', fill: '"fill" (one gap)', order: '"order" (words or chunks of a sentence for me to put in order)', translate: '"translate" (English to Japanese)', correct: '"correct" (a sentence with one mistake for me to fix)', write: '"write" (1 to 2 sentences about a given topic)' };
    if (o.kinds && o.kinds.length) lines.push('Item types: use ONLY these, spread evenly: ' + o.kinds.map((k) => KIND_TXT[k] || k).join(', ') + '. Do not use any other type.');
    else lines.push('Item types, use a good mix: "mc" (2 to 4 options), "fill" (one gap), "order" (words or chunks of a sentence for me to put in order), "translate" (English to Japanese), "correct" (a sentence with one mistake for me to fix), "write" (1 to 2 sentences about a given topic).');
    if (o.kinds && o.kinds.length) lines.push('The example items below only show the JSON shape; follow the item types above.');
    lines.push(`Rules: keep to my level; every item must stand on its own; never show the answer in the question. Write Japanese in normal script, using only kanji a learner at my level would know. For fill, order, translate and correct give the single best answer in "answer" and every other fully correct version in "alt". For mc, "answer" must equal one of "options" exactly. Mark a gap in a question with ___. "why" is one short English sentence naming the rule. "skill" must be one of: ${L.SKILLS.join(', ')}. For "write" give a model answer in "answer". Whenever the question or the answer is Japanese, add "rd": that whole Japanese text written in hiragana only (no spaces, with the gap filled in), so the app can accept answers typed in kana or romaji and show readings. Whenever the item or its answer is a full Japanese sentence, add "tr": a natural English translation of that sentence once it is correct (for translate items leave "tr" out).`);
    lines.push('JSON shape, shown with three items:\n```json\n' + JSON_SHEET + '\n```');
    return lines.join('\n\n');
  };
  // ---------- reading: short stories that Claude writes with your words ----------
  // Each paragraph comes with its words: [surface, reading in hiragana, dictionary form], so the app can show furigana and look up
  // a conjugated word by its dictionary form. They are kept in the same "surface;reading;basic|..." form as example sentences.
  const JSON_STORY = '{"story":{"title":"にぎやかな月曜日","paragraphs":[{"ja":"月曜日に、さくらは医者に行きました。","words":[["月曜日","げつようび","月曜日"],["に","",""],["、","",""],["さくら","",""],["は","",""],["医者","いしゃ","医者"],["に","",""],["行きました","いきました","行く"],["。","",""]],"en":"On Monday, Sakura went to the doctor."}],"glossary":[{"ja":"医者","reading":"いしゃ","en":"doctor"}],"questions":[{"q":"さくらは月曜日にどこに行きましたか。","en":"Where did Sakura go on Monday?","options":["医者","学校","店"],"answer":"医者"}]}}';
  L.STORY_LEVELS = { N5: 'JLPT N5 (very simple: です/ます, short sentences, everyday words, few kanji)', N4: 'JLPT N4 (simple sentences, て-form, past and plain forms, common kanji)', N3: 'JLPT N3 (everyday Japanese with some longer sentences)' };
  L.STORY_LENGTHS = { short: 150, medium: 300, long: 500 };
  L.storyPrompt = (o) => {
    const words = (o.words || []).slice(0, 15).map((w) => w.ja + (w.reading && w.reading !== w.ja ? '（' + w.reading + '）' : '') + (w.en ? ' (' + w.en + ')' : '')).join(', ');
    const lines = [`${LEVEL}. Please write me a short Japanese story to read inside my BiggGengo app, so reply with ONLY one JSON object in a code block and no other text.`,
      `Level: ${L.STORY_LEVELS[o.level] || L.STORY_LEVELS.N5}. Length: about ${L.STORY_LENGTHS[o.length] || 300} characters, in ${o.length === 'short' ? '3 to 4' : o.length === 'long' ? '6 to 8' : '4 to 6'} short paragraphs.`];
    if (o.topic) lines.push('Topic: ' + o.topic + '.');
    if (words) lines.push('Use each of these words from my list at least once, in a natural way (other forms are fine, like past or て-forms): ' + words + '.');
    if (o.note) lines.push('In my own words, what else I want: ' + o.note);
    lines.push('Rules: a real little story with people, a problem and an ending, not a list of facts. Write in normal script with only kanji a learner at this level knows. Every paragraph has "ja", a natural English translation "en", and "words": the paragraph split into words and particles in order, each as [surface, reading in hiragana, dictionary form]; joined together the surfaces must give exactly "ja" (punctuation included). Leave the reading empty when the surface has no kanji, and the dictionary form empty when it is the same as the surface. "glossary": 6 to 12 words from the story I may not know yet (not the ones from my list), in dictionary form with "reading". "questions": 4 multiple-choice questions in simple Japanese about the story, 3 options each, "answer" equal to one of "options" exactly, and "en" the question in English.');
    lines.push('JSON shape, shown with one paragraph, one glossary word and one question:\n```json\n' + JSON_STORY + '\n```');
    return lines.join('\n\n');
  };
  // Reads Claude's story reply: { story } or { error }. A paragraph keeps its words (tok) only when they join up to its text exactly.
  L.parseStory = (text) => {
    const j = L.extractJson(text);
    if (!j) return { error: 'I could not find a story in that text. Paste the whole reply from Claude, JSON included.' };
    const st = j.story || j, str = (x) => String(x == null ? '' : x).trim();
    const paragraphs = (Array.isArray(st.paragraphs) ? st.paragraphs : []).map((p) => {
      if (typeof p === 'string') return { ja: str(p), en: '', tok: '' };
      const ja = str(p && (p.ja || p.text)), ws = (Array.isArray(p && p.words) ? p.words : []).filter(Array.isArray).map((w) => w.map((x) => String(x == null ? '' : x).replace(/[;|]/g, '')));
      const tok = ws.length && ws.map((w) => w[0]).join('') === ja ? ws.map((w) => [w[0], w[1] || '', w[2] || ''].join(';')).join('|') : '';
      return { ja, en: str(p && p.en), tok };
    }).filter((p) => p.ja);
    if (!paragraphs.length) return { error: 'That JSON has no story paragraphs.' };
    const glossary = (Array.isArray(st.glossary) ? st.glossary : []).map((g) => ({ ja: str(g && g.ja), reading: str(g && g.reading), en: str(g && g.en) })).filter((g) => g.ja && g.en).slice(0, 20);
    const questions = (Array.isArray(st.questions) ? st.questions : []).map((q) => ({ q: str(q && q.q), en: str(q && q.en), options: (Array.isArray(q && q.options) ? q.options : []).map(str).filter(Boolean), answer: str(q && q.answer) }))
      .filter((q) => q.q && q.options.length >= 2 && q.options.includes(q.answer)).slice(0, 8);
    return { story: { title: str(st.title).slice(0, 80) || 'おはなし', paragraphs, glossary, questions } };
  };
  const RESULT_SHAPE = '{"results":[{"id":"3","verdict":"partly","correct":"明日、予約があります。","rd":"あしたよやくがあります。","explain":"One short English sentence about the rule.","tr":"Tomorrow I have an appointment.","skills":["word order"]}],"summary":{"good":"What went well.","improve":["Concrete thing 1","Concrete thing 2"],"next":"What to focus on in the next worksheet."}}';
  L.checkPrompt = (sheet, o) => {
    const all = !!(o && o.explainAll);
    const rows = sheet.items.map((it) => {
      const r = (sheet.results && sheet.results[it.id]) || {}, mine = (sheet.answers && sheet.answers[it.id]) || '';
      const need = r.verdict === 'unsure' || r.verdict === 'blank' || !r.verdict;
      return `${it.id}. [${need ? 'CHECK' : 'auto: ' + r.verdict}] (${it.type}, ${it.skill}) ${it.q}${it.options ? ' Options: ' + it.options.join(' / ') : ''}\n   my answer: ${mine || '(left blank)'}\n   expected: ${it.answer || '(model answer not given)'}${it.alt && it.alt.length ? ' | also fine: ' + it.alt.join(' | ') : ''}`;
    });
    return `${LEVEL}. I did this worksheet in my BiggGengo app. Items marked CHECK still need your marking; the auto ones were already marked by the app (you can still comment on them in the summary). I may have typed Japanese in kana or romaji instead of kanji: that is fine, judge the language, not the script.\n\n` +
      (all ? `Also: for EVERY item I got wrong or only partly right, including the ones the app already marked, add a result with "id", the same "verdict" the app gave, "correct" and "explain": one or two short English sentences saying why my answer is wrong and what the rule is. Do not add results for items I got right. ` : '') +
      `For every CHECK item give: verdict (right, partly or wrong), the corrected Japanese in "correct" if it is not right (with "rd", its hiragana reading), ONE short English sentence in "explain" naming the rule, "tr" with an English translation of the correct Japanese sentence, and "skills" with the grammar areas of my mistake, each one of: ${L.SKILLS.join(', ')}. ` +
      `Be kind and encouraging. Accept any fully correct alternative, not only the expected answer. Then write a "summary": what went well, 2 to 4 concrete things I should improve, and a suggested focus for my next worksheet. Reply with ONLY this JSON in a code block:\n\`\`\`json\n${RESULT_SHAPE}\n\`\`\`\n\nWORKSHEET "${sheet.title}":\n` + rows.join('\n');
  };
  // Reads Claude's marking reply: { results: {id: {verdict, correct, explain, skills}}, summary } or { error }.
  L.parseFeedback = (text, sheet) => {
    const j = L.extractJson(text);
    if (!j || (!Array.isArray(j.results) && !j.summary)) return { error: 'I could not find the marking in that text. Paste the whole reply from Claude, JSON included.' };
    const ids = new Set(sheet.items.map((it) => it.id)), results = {};
    for (const r of j.results || []) {
      const id = String(r && r.id);
      if (!ids.has(id)) continue;
      const v = String(r.verdict || '').toLowerCase();
      results[id] = { verdict: ['right', 'partly', 'wrong'].includes(v) ? v : 'wrong', correct: String(r.correct || ''), explain: String(r.explain || ''), tr: String(r.tr || r.translation || ''), skills: (Array.isArray(r.skills) ? r.skills : []).map(L.normSkill) };
    }
    const sm = j.summary || {};
    return { results, summary: { good: String(sm.good || ''), improve: (Array.isArray(sm.improve) ? sm.improve : sm.improve ? [sm.improve] : []).map(String), next: String(sm.next || '') } };
  };

  // "Put in order: vergadering / heb / ik" -> { prefix: 'Put in order:', words: ['vergadering', 'heb', 'ik'] } (null if there is no word list)
  L.orderParts = (q) => {
    const s = String(q || ''), slash = s.indexOf('/');
    if (slash < 0) return null;
    const colon = s.lastIndexOf(':', slash);
    const words = s.slice(colon >= 0 ? colon + 1 : 0).split('/').map((x) => x.trim()).filter(Boolean);
    return words.length >= 2 ? { prefix: colon >= 0 ? s.slice(0, colon + 1).trim() : '', words } : null;
  };
  // Which of the given words (tiles) have been typed so far (each typed word counts once). Returns an array of booleans.
  // Spaces and punctuation do not matter; kana, kanji and romaji all count.
  L.usedWords = (words, typed) => {
    const pm = (x) => String(x).normalize('NFKC').replace(/。/g, '.').replace(/、/g, ',').replace(/[「」]/g, '"');
    let rest = J.norm(typed), marks = (pm(typed).match(/[.,!?"]/g) || []).join(''); // marks: the punctuation you typed
    return words.map((w) => {
      const n = J.norm(w);
      if (!n) { // a tile that is only punctuation, like "？": used once that mark has been typed
        const mark = pm(String(w).replace(/\s/g, '')), at = mark ? marks.indexOf(mark) : -1;
        if (at < 0) return false;
        marks = marks.slice(0, at) + marks.slice(at + mark.length); return true;
      }
      const i = rest.indexOf(n);
      if (i < 0) return false;
      rest = rest.slice(0, i) + '\u0000'.repeat(n.length) + rest.slice(i + n.length);
      return true;
    });
  };

  // ---------- real example sentences (Tatoeba) ----------
  // sentences: [[japanese, english, words], ...] (words: see scripts/build-data.js). The index maps every word (the form in the sentence and its dictionary form) to the sentences it is in.
  L.buildSentenceIndex = (sentences) => {
    const idx = new Map();
    sentences.forEach((p, i) => { const seen = new Set(); for (const t of J.tokens(p)) for (const k of [t.b, t.s]) if (!seen.has(k)) { seen.add(k); const a = idx.get(k); if (a) a.push(i); else idx.set(k, [i]); } });
    return idx;
  };
  // the spellings a word can be looked up by
  L.wordKeys = (ja, reading) => [...new Set([String(ja || '').trim(), String(reading || '').trim()].filter(Boolean))];
  // up to n sentences using the word, shortest first
  L.sentencesFor = (ja, pos, idx, sentences, n, reading) => {
    const hit = new Set();
    for (const k of L.wordKeys(ja, reading)) for (const i of idx.get(k) || []) hit.add(i);
    return [...hit].sort((a, b) => sentences[a][0].length - sentences[b][0].length).slice(0, n || 5).map((i) => sentences[i]);
  };
  // The part of a word that stays the same when it is conjugated: 食べる -> 食べ, 書く -> 書, 大きい -> 大き, 勉強する -> 勉強
  L.stemOf = (w) => {
    const s = String(w.ja || '').trim(); if (!s) return '';
    const cls = J.verbClass(w.vclass);
    if (w.pos === 'verb' && cls === 'ichidan') return s.replace(/る$/, '');
    if (w.pos === 'verb' && cls === 'godan' && [...s].length > 1) return s.slice(0, -1);
    if (w.pos === 'verb' && (cls === 'suru')) return s.replace(/(する|為る)$/, '') || s;
    if (w.pos === 'verb' && cls === 'kuru') return s.replace(/(来る|くる)$/, '') || s;
    if ((w.pos === 'adjective' && w.vclass !== 'na') && /い$/.test(s) && [...s].length > 1) return s.slice(0, -1);
    return s;
  };
  // Where a word sits in an example sentence: { start, end, form } (the written form there, e.g. 食べ in 食べます) or null.
  // tokStr: the sentence's words from the data file, if it has them (then conjugated forms are found exactly); otherwise the stem is searched for as text.
  L.findInExample = (example, w, tokStr) => {
    const ex = String(example || ''), keys = L.wordKeys(w.ja, w.reading); if (!ex || !keys.length) return null;
    if (tokStr) {
      const toks = J.tokens([ex, '', tokStr]);
      if (toks.map((t) => t.s).join('') === ex) {
        let pos = 0;
        for (const t of toks) { if (keys.includes(t.b) || keys.includes(t.s)) return { start: pos, end: pos + t.s.length, form: t.s, reading: t.r }; pos += t.s.length; }
      }
    }
    for (const k of [L.stemOf(w), ...keys]) { const i = k ? ex.indexOf(k) : -1; if (i >= 0 && ([...k].length > 1 || J.hasKanji(k))) return { start: i, end: i + k.length, form: k }; }
    return null;
  };
  // Cloze: the word of the card as it appears in its example sentence, so the sentence can be shown with a gap.
  // Returns { form, before, after } (the text around the gap) or null when the word is not in the sentence.
  L.clozeOf = (example, w, tokStr) => {
    const hit = L.findInExample(example, w, tokStr); if (!hit) return null;
    return { form: hit.form, reading: hit.reading || (J.hasKanji(hit.form) ? '' : J.toHira(hit.form)), before: example.slice(0, hit.start), after: example.slice(hit.end) };
  };
  // Blank-page recall: which of your words did a typed entry mean? exact is false for a typo or a reading typed instead of the kanji. Returns { w, exact } or null.
  L.recallMatch = (typed, pool) => {
    let near = null;
    for (const w of pool) { const r = J.matchWord(typed, w); if (r === 'right') return { w, exact: true }; if (r === 'reading') return { w, exact: false }; if (r === 'close' && !near) near = { w, exact: false }; }
    return near;
  };
  // Words from the frequency list (FREQ = [[word, meaning, rank, reading, type], ...]) that are not in your list yet, within a rank band.
  L.suggestWords = (freq, words, known, lo, hi) => {
    const have = new Set(); words.filter((w) => !w.deleted).forEach((w) => { have.add(w.ja); if (w.reading) have.add(w.reading); });
    const skip = new Set(known || []);
    return freq.filter((f) => f[2] > lo && f[2] <= hi && !have.has(f[0]) && !have.has(f[3]) && !skip.has(f[0]));
  };

  // ---------- dictionary (JMdict: [word, type, reading, forms, meanings]) ----------
  L.POS_NAMES = { n: 'noun', v: 'verb', a: 'adjective', d: 'adverb', p: 'particle', c: 'conjunction', r: 'pronoun', e: 'pre-noun adjective', i: 'interjection', u: 'number / counter', x: 'suffix / auxiliary', h: 'expression' };
  L.POS_KEYS = { n: 'noun', v: 'verb' }; // what the Words page calls them
  // a short description of how a word conjugates, from its class tag
  L.CLASS_NAMES = { v1: 'ichidan verb (る-verb)', 'v1-s': 'ichidan verb (る-verb)', v5u: 'godan verb (う-verb), ends in う', 'v5u-s': 'godan verb (う-verb), ends in う', v5k: 'godan verb (う-verb), ends in く', 'v5k-s': 'godan verb 行く (irregular て-form: 行って)', v5g: 'godan verb (う-verb), ends in ぐ', v5s: 'godan verb (う-verb), ends in す', v5t: 'godan verb (う-verb), ends in つ', v5n: 'godan verb (う-verb), ends in ぬ', v5b: 'godan verb (う-verb), ends in ぶ', v5m: 'godan verb (う-verb), ends in む', v5r: 'godan verb (う-verb), ends in る', 'v5r-i': 'irregular verb ある', v5aru: 'godan verb like いらっしゃる', 'vs-i': 'irregular verb する', 'vs-s': 'suru verb', vk: 'irregular verb 来る', vz: 'ずる verb', i: 'い-adjective', ix: 'い-adjective (いい / よい)', na: 'な-adjective' };
  L.verbClassName = (tag) => L.CLASS_NAMES[String(tag || '').split(',')[0]] || '';
  const FORM_KEYS = ['masu', 'mashita', 'masen', 'te', 'ta', 'nai', 'nakatta', 'tai', 'potential', 'passive', 'causative', 'volitional', 'imperative', 'ba', 'tara'];
  const ADJ_KEYS = ['polite', 'negative', 'past', 'pastNeg', 'te', 'adverb', 'ba'];
  // every form a lookup should find: [[form, label], ...]; the word itself comes first, then its reading, with no label
  L.dictFormsLabeled = (e) => {
    const out = [[e[0], ''], ...(e[2] ? [[e[2], '']] : [])], spellings = [e[0], e[2]].filter(Boolean);
    if (e[1] === 'v') {
      const tag = String(e[3] || '').split(',')[0];
      for (const sp of spellings) { const f = J.verbForms(sp, tag); if (f) for (const k of FORM_KEYS) if (f[k] && f[k] !== sp) out.push([f[k], J.VERB_FORM_NAMES[k]]); }
    } else if (e[1] === 'a') {
      for (const sp of spellings) { const f = J.adjForms(sp, e[3] || 'i'); if (f) for (const k of ADJ_KEYS) if (f[k] && f[k] !== sp) out.push([f[k], J.ADJ_FORM_NAMES[k]]); }
    } else if (e[1] === 'n' && e[3] === 'vs') {
      for (const sp of spellings) { out.push([sp + 'する', 'with する']); out.push([sp + 'します', 'with します']); out.push([sp + 'した', 'with した']); }
    }
    return out.filter((x, i) => out.findIndex((y) => y[0] === x[0]) === i);
  };
  L.dictForms = (e) => L.dictFormsLabeled(e).map((x) => x[0]);
  L.formLabel = (e, q) => { q = J.norm(q); const x = L.dictFormsLabeled(e).find((y) => J.norm(y[0]) === q); return x ? x[1] : ''; }; // 'past (た)', 'て-form'... or '' for the word itself
  // other dictionary words that this word is a form of: たべ is a form of 食べる
  // With a frequency list (rank: Map of word → rank) only fairly common words are kept.
  L.alsoFormOf = (dict, ix, q, rank, n) => {
    const qn = J.norm(q);
    return (ix.forms.get(qn) || []).map((i) => dict[i]).filter((d) => J.norm(d[0]) !== qn && J.norm(d[2]) !== qn && (!rank || (rank.get(d[0]) ?? 1e9) < 5000))
      .map((d) => ({ e: d, label: L.formLabel(d, q) })).filter((x) => x.label)
      .sort((x, y) => (rank ? (rank.get(x.e[0]) ?? 1e9) - (rank.get(y.e[0]) ?? 1e9) : 0)).slice(0, n || 2);
  };
  L.buildDictIndex = (dict) => {
    const forms = new Map(), norm = dict.map((e) => [J.norm(e[0]), J.norm(e[2] || '')]);
    dict.forEach((e, i) => { for (const f of L.dictForms(e)) { const k = J.norm(f), a = forms.get(k); if (a) { if (!a.includes(i)) a.push(i); } else forms.set(k, [i]); } });
    return { forms, norm };
  };
  // Japanese (kanji, kana or romaji) or English lookup. Results: exact words first, then other forms of a word (て-form, past...), then words starting with it, then English matches.
  L.dictSearch = (dict, ix, q, n) => {
    q = (q || '').trim(); const qn = J.norm(q), latin = /[A-Za-z]/.test(q); if (!qn && !latin) return [];
    n = n || 30; const out = [], seen = new Set(), add = (i, how) => { if (!seen.has(i) && out.length < n) { seen.add(i); out.push({ e: dict[i], how }); } };
    const rank = (i) => ('nvad'.indexOf(dict[i][1]) + 1 || 9);
    if (qn && (J.hasJa(q) || qn.length >= 2)) {
      (ix.forms.get(qn) || []).filter((i) => ix.norm[i][0] === qn || ix.norm[i][1] === qn).sort((a, b) => rank(a) - rank(b)).forEach((i) => add(i, 'word'));
      (ix.forms.get(qn) || []).sort((a, b) => rank(a) - rank(b)).forEach((i) => add(i, 'form'));
      if (qn.length >= (J.hasKanji(qn) ? 1 : 2)) for (let i = 0; i < dict.length && out.length < n; i++) if (ix.norm[i][0].startsWith(qn) || ix.norm[i][1].startsWith(qn)) add(i, 'prefix');
    }
    if (!latin) return out;
    // English: the closer the match is to the start of the meanings, and the shorter the word, the higher it ranks
    const eq = q.toLowerCase().replace(/^to\s+/, ''), hits = [];
    for (let i = 0; i < dict.length; i++) { const segs = dict[i][4].toLowerCase().split(/;\s*/); let best = 99;
      segs.forEach((sg, k) => { const parts = sg.split(/,\s*/).map((x) => x.replace(/^to\s+/, '')); const j = parts.indexOf(eq); if (j >= 0) best = Math.min(best, k * 3 + j); else if (parts.some((x) => x.split(' ').includes(eq))) best = Math.min(best, 20 + k); });
      if (best < 99) hits.push([best, dict[i][0].length, i]); }
    hits.sort((x, y) => x[0] - y[0] || x[1] - y[1]).forEach((h) => add(h[2], 'english'));
    return out;
  };
  // JMdict meanings are already plain English. This adds a note on how the word conjugates. Returns { mean, note }.
  L.dictExplain = (dict, ix, e) => {
    let note = '';
    if (e[1] === 'v') { const c = L.verbClassName(e[3]); const t = String(e[3] || '').split(',')[1]; note = (c ? c[0].toUpperCase() + c.slice(1) : '') + (t === 'vt' ? ', transitive (takes を)' : t === 'vi' ? ', intransitive' : '') + '.'; }
    else if (e[1] === 'a') note = (L.CLASS_NAMES[e[3]] || '') + '.';
    else if (e[1] === 'n' && e[3] === 'vs') note = 'Add する to make it a verb: ' + e[0] + 'する.';
    return { mean: e[4], note: note === '.' ? '' : note };
  };
  // an entry as a ready-to-add word (pass the meaning from dictExplain to use another version)
  L.dictToWord = (e, mean) => ({ ja: e[0], reading: e[2] || '', en: (mean || e[4]).split('; ').slice(0, 2).join('; '), pos: e[1] === 'n' ? 'noun' : e[1] === 'v' ? 'verb' : e[1] === 'a' ? 'adjective' : 'other', vclass: e[1] === 'v' ? String(e[3] || '').split(',')[0] : e[1] === 'a' ? e[3] : '' });
  // the dictionary entry that matches one of your words, if there is one
  L.entryFor = (dict, ix, w) => { const r = L.dictSearch(dict, ix, w.ja, 8).filter((x) => x.how === 'word'); return (r.find((x) => (w.reading ? x.e[2] === w.reading || x.e[0] === w.reading : true) && (w.pos === 'verb' ? x.e[1] === 'v' : w.pos === 'noun' ? x.e[1] === 'n' : w.pos === 'adjective' ? x.e[1] === 'a' : true)) || r[0] || {}).e || null; };
  // fills in what a word is missing (reading, kind, how it conjugates) from the dictionary
  L.enrichWord = (w, dict, ix) => {
    const e = L.entryFor(dict, ix, w); if (!e) return w;
    const d = L.dictToWord(e);
    if (!w.reading && d.reading) w.reading = d.reading;
    if ((!w.pos || w.pos === 'other') && d.pos !== 'other') w.pos = d.pos;
    if (!w.vclass && d.vclass) w.vclass = d.vclass;
    return w;
  };

  // ---------- worksheets built from the downloaded data (no Claude needed) ----------
  L.LOCAL_TYPES = [['meaning', '🎯 Meanings'], ['reading', '🔤 Readings'], ['cloze', '✏️ Fill the gap'], ['particle', '🔀 Particles'], ['forms', '🔧 Verb & adjective forms'], ['order', '🧩 Word order']];
  const shuffle = (a, rnd) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor((rnd || Math.random)() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const shortEn = (en) => String(en || '').split(/[;,]/)[0].replace(/^to\s+/, 'to ').trim();
  // words you started or reviewed in the last few days
  L.recentWords = (words, today, days) => words.filter((w) => !w.deleted && ((w.reps > 0 && w.last && L.daysBetween(w.last, today) <= days) || (w.created && L.daysBetween(L.ymd(new Date(w.created)), today) <= days)));
  // words you miss: lapses first, then the lowest levels
  L.troubleWords = (words) => words.filter((w) => !w.deleted && w.reps > 0 && ((w.lapses || 0) > 0 || (w.box || 0) <= 1)).sort((a, b) => (b.lapses || 0) - (a.lapses || 0) || (a.box || 0) - (b.box || 0));
  const PARTICLES = ['は', 'が', 'を', 'に', 'で', 'へ', 'と', 'も', 'の', 'から', 'まで'];
  const PUNCT_RE = /^[。、！？!?,.，「」『』（）()・〜…\s]+$/;
  const withReading = (w) => w.ja + (w.reading && w.reading !== w.ja ? '（' + w.reading + '）' : '');
  // o: { pool: [{ja,reading,en,pos,vclass}], types, count, dict, dix, sentences, six, rnd }. Returns a sheet in the same shape Claude's worksheets use.
  L.buildLocalSheet = (o) => {
    const rnd = o.rnd || Math.random, pool = o.pool || [], types = o.types && o.types.length ? o.types : L.LOCAL_TYPES.map((t) => t[0]), items = [], seenQ = new Set();
    if (!pool.length) return null;
    const entry = (w) => L.entryFor(o.dict, o.dix, w);
    const sens = (w, n) => L.sentencesFor(w.ja, w.pos, o.six, o.sentences, n, w.reading);
    const content = (p) => J.tokens(p).filter((t) => !PUNCT_RE.test(t.s));
    const make = {
      meaning: (w) => {
        const ans = shortEn(w.en); if (!ans) return null;
        const en0 = entry(w), ty = en0 ? en0[1] : w.pos === 'verb' ? 'v' : w.pos === 'noun' ? 'n' : w.pos === 'adjective' ? 'a' : null, opts = new Set([ans]); let tries = 0;
        while (opts.size < 4 && tries++ < 60) { const e = o.dict[Math.floor(rnd() * o.dict.length)]; const m = shortEn(e[4]); if (m && m.length < 30 && m.toLowerCase() !== ans.toLowerCase() && (!ty || e[1] === ty)) opts.add(m); }
        if (opts.size < 4) return null;
        return { type: 'mc', skill: 'vocabulary', q: 'What does "' + withReading(w) + '" mean?', options: shuffle([...opts], rnd), answer: ans, rd: w.reading || '', why: withReading(w) + ' = ' + w.en };
      },
      reading: (w) => {
        const rd = w.reading || (entry(w) || [])[2]; if (!rd || !J.hasKanji(w.ja)) return null;
        const opts = new Set([rd]); let tries = 0;
        while (opts.size < 4 && tries++ < 200) { const e = o.dict[Math.floor(rnd() * o.dict.length)]; if (e[2] && J.hasKanji(e[0]) && Math.abs([...e[2]].length - [...rd].length) <= 1 && e[2] !== rd) opts.add(e[2]); }
        if (opts.size < 4) return null;
        return { type: 'mc', skill: 'reading kanji', q: 'How do you read "' + w.ja + '"?', options: shuffle([...opts], rnd), answer: rd, why: w.ja + ' = ' + rd + ' (' + shortEn(w.en) + ')' };
      },
      cloze: (w) => {
        for (const p of shuffle(sens(w, 8), rnd)) {
          const hit = L.findInExample(p[0], w, p[2]); if (!hit || !hit.form) continue;
          const tok = J.tokens(p).find((t) => t.s === hit.form), rd = tok && tok.r && tok.r !== hit.form ? [tok.r] : [];
          return { type: 'fill', skill: w.pos === 'verb' ? 'verb forms' : 'vocabulary', q: p[0].slice(0, hit.start) + '＿＿＿' + p[0].slice(hit.end) + '  (' + w.ja + ')', answer: hit.form, alt: rd, rd: J.sentenceKana(p), why: w.ja + ' = ' + shortEn(w.en), tr: p[1], clue: p[1] };
        }
        return null;
      },
      particle: (w) => {
        for (const p of shuffle(sens(w, 10), rnd)) {
          const toks = J.tokens(p), at = []; toks.forEach((t, k) => { if (PARTICLES.includes(t.s) && k > 0 && k < toks.length - 1 && !PUNCT_RE.test(toks[k - 1].s)) at.push(k); });
          if (!at.length || content(p).length < 3) continue;
          const k = at[Math.floor(rnd() * at.length)], ans = toks[k].s, opts = shuffle([ans, ...shuffle(PARTICLES.filter((x) => x !== ans), rnd).slice(0, 3)], rnd);
          return { type: 'mc', skill: 'particles', q: toks.map((t, j) => (j === k ? '＿＿' : t.s)).join(''), options: opts, answer: ans, rd: J.sentenceKana(p), why: 'The particle here is ' + ans + '.', tr: p[1] };
        }
        return null;
      },
      forms: (w) => {
        const e = entry(w), kind = w.pos === 'verb' ? 'v' : w.pos === 'adjective' ? 'a' : e ? e[1] : '';
        if (kind === 'v') {
          const tag = w.vclass || String((e || [])[3] || '').split(',')[0], f = J.verbForms(w.ja, tag); if (!f) return null;
          const key = ['te', 'masu', 'nai', 'ta', 'potential', 'volitional'][Math.floor(rnd() * 6)], fr = w.reading && J.verbForms(w.reading, tag), skill = key === 'te' ? 'te-form' : key === 'ta' || key === 'nai' ? (key === 'ta' ? 'past tense' : 'negation') : key === 'masu' ? 'politeness' : 'verb forms';
          return { type: 'fill', skill, q: 'Make the ' + J.VERB_FORM_NAMES[key] + ':  ' + w.ja + ' → ＿＿＿', answer: f[key], alt: fr && fr[key] !== f[key] ? [fr[key]] : [], why: w.ja + ' (' + (L.verbClassName(tag) || 'verb') + ') → ' + f[key] };
        }
        if (kind === 'a') {
          const cls = w.vclass || (e && e[3]) || 'i', f = J.adjForms(w.ja, cls); if (!f) return null;
          const key = cls === 'na' ? ['negative', 'past', 'adverb', 'noun'][Math.floor(rnd() * 4)] : ['negative', 'past', 'te', 'adverb'][Math.floor(rnd() * 4)], fr = w.reading && J.adjForms(w.reading, cls);
          return { type: 'fill', skill: 'adjectives', q: 'Make the ' + J.ADJ_FORM_NAMES[key] + ':  ' + w.ja + ' → ＿＿＿', answer: f[key], alt: fr && fr[key] !== f[key] ? [fr[key]] : [], why: w.ja + ' (' + (L.CLASS_NAMES[cls] || 'adjective') + ') → ' + f[key] };
        }
        return null;
      },
      order: (w) => {
        const cand = sens(w, 12).filter((p) => { const n = content(p).length; return n >= 3 && n <= 7; });
        if (!cand.length) return null;
        const p = cand[Math.floor(rnd() * cand.length)], ws = content(p).map((t) => t.s), rd = content(p).map((t) => t.r || t.s);
        let sh = shuffle(ws, rnd), k = 0; while (sh.join('') === ws.join('') && k++ < 8) sh = shuffle(ws, rnd);
        return { type: 'order', skill: 'word order', q: 'Put in order: ' + sh.join(' / '), answer: ws.join(''), alt: [rd.join('')], rd: rd.join(''), why: '', tr: p[1] };
      },
    };
    const order = shuffle(pool, rnd);
    for (let i = 0; i < o.count * 6 && items.length < o.count; i++) {
      const w = order[i % order.length];
      for (let t = 0; t < types.length; t++) {
        const it = make[types[(i + t) % types.length]](w); if (!it || seenQ.has(it.q)) continue;
        seenQ.add(it.q); items.push(Object.assign(it, { id: String(items.length + 1), alt: it.alt || [], word: w.ja })); break;
      }
    }
    return items.length ? { title: 'Quick practice (' + items.length + ' items)', items, skipped: 0 } : null;
  };

  // ---------- mistakes review, reading texts and progress ----------
  // Words you missed in the last few days (flashcards, listening, worksheets), most missed first. log: [{ ja, d, s }]
  L.missedWords = (words, log, today, days) => {
    const cnt = new Map();
    for (const m of log || []) if (L.daysBetween(m.d, today) >= 0 && L.daysBetween(m.d, today) < (days || 7)) cnt.set(m.ja.toLowerCase(), (cnt.get(m.ja.toLowerCase()) || 0) + 1);
    return words.filter((w) => !w.deleted && cnt.has(w.ja.toLowerCase())).sort((a, b) => cnt.get(b.ja.toLowerCase()) - cnt.get(a.ja.toLowerCase()) || (a.box || 0) - (b.box || 0));
  };
  // sums a few counters over the 7 days ending today (offset 0) or the 7 days before that (offset 1)
  L.weekSum = (log, today, keys, offset) => {
    let n = 0; const end = -7 * (offset || 0);
    for (let i = 0; i < 7; i++) { const d = log[L.addDays(today, end - i)] || {}; for (const k of keys) n += d[k] || 0; }
    return n;
  };
  // right answers out of all answers recorded in a day (flashcards, listening and worksheets together); null if nothing recorded
  L.dayAccuracy = (d) => { d = d || {}; const ok = (d.cOk || 0) + (d.lOk || 0) + (d.sOk || 0), bad = (d.cMiss || 0) + (d.lMiss || 0) + (d.sMiss || 0); return ok + bad ? ok / (ok + bad) : null; };
  L.weekAccuracy = (log, today, offset) => {
    const ok = L.weekSum(log, today, ['cOk', 'lOk', 'sOk'], offset), bad = L.weekSum(log, today, ['cMiss', 'lMiss', 'sMiss'], offset);
    return ok + bad ? ok / (ok + bad) : null;
  };
  // today's snapshot of how many words you know (box 4+), started and own; one per day
  L.takeSnapshot = (snap, words, today) => { const live = words.filter((w) => !w.deleted); snap[today] = { learned: live.filter((w) => (w.box || 0) >= 4).length, started: live.filter((w) => w.reps > 0).length, total: live.length }; return snap[today]; };
  L.readingPrompt = (o) => {
    const len = { short: 'about 100 characters', medium: 'about 200 characters', long: 'about 350 characters' }[o.length] || 'about 200 characters';
    const lines = [LEVEL + '. Write me a Japanese reading text, ' + len + ', at ' + (o.level || 'my') + ' level' + (o.topic ? ' about: ' + o.topic : ' on an everyday topic') + '.'];
    if (o.words && o.words.length) lines.push('Try to use these words naturally (I am learning them): ' + o.words.slice(0, 15).map((w) => w.ja).join('、') + '.');
    if (o.note) lines.push('Also: ' + o.note);
    lines.push('Natural, real-sounding Japanese in the polite style (です / ます); use only kanji a learner at my level would know; split it into short paragraphs; no English inside the text; no word lists.');
    lines.push('Also give "kana": the same text written entirely in hiragana (and katakana for loanwords), with the same paragraph breaks.');
    lines.push('Also write 3 multiple-choice comprehension questions IN JAPANESE about the text, each with 3 options, and the correct answer must be one of the options exactly.');
    lines.push('Reply with ONLY this JSON in a code block, nothing else: {"reading":{"title":"短いタイトル","text":"First paragraph.\\n\\nSecond paragraph.","kana":"The same in hiragana.\\n\\nSecond paragraph.","questions":[{"q":"質問？","options":["A","B","C"],"answer":"B","why":"One short English sentence."}]}}');
    return lines.join('\n');
  };
  // Reads Claude's reply (or a plain pasted text). Returns { reading: { title, text, kana, questions } } or { error }.
  L.parseReading = (raw) => {
    // some replies have real line breaks inside the quoted text: turn those into \n so the JSON can be read
    const fix = (x) => String(x || '').replace(/"(?:[^"\\]|\\.)*"/g, (m) => m.split('\r').join('').split('\n').join('\\n'));
    const j = [raw, fix(raw)].map((x) => L.extractJson(x)).find((c) => c && typeof (c.reading || c).text === 'string') || null, r = j && (j.reading || j);
    if (r && typeof r.text === 'string' && r.text.trim().length >= 8) {
      const questions = (Array.isArray(r.questions) ? r.questions : []).map((q, i) => ({ id: String(i + 1), type: 'mc', skill: 'vocabulary', q: String(q.q || q.question || '').trim(), options: (q.options || []).map(String), answer: String(q.answer == null ? '' : q.answer).trim(), alt: [], why: String(q.why || '').trim() }))
        .filter((q) => q.q && q.options.length >= 2 && q.options.includes(q.answer));
      return { reading: { title: String(r.title || 'Reading text').slice(0, 80), text: r.text.trim(), kana: typeof r.kana === 'string' ? r.kana.trim() : '', questions } };
    }
    const t = String(raw || '').trim();
    if (/^\s*(```[a-z]*\s*)?[{[]/.test(t) && /"(text|reading)"/.test(t)) return { error: 'That looks like JSON but I could not read it. Ask Claude to reply with the JSON again.' };
    if (t.length < 8) return { error: 'Paste a Japanese text first (at least a sentence or two).' };
    return { reading: { title: '', text: t.replace(/^```[a-z]*\n?|```$/g, '').trim(), kana: '', questions: [] } };
  };
  // The words of a reading text as [{ w }] tokens plus plain text pieces, so the reader can make each word tappable. Japanese has no spaces, so the text is
  // cut by longest match against `has(str)` (is this a dictionary word or form?); without it, by runs of kanji, hiragana, katakana and letters.
  L.tokenize = (text, has) => {
    const out = [], runs = String(text).match(/[぀-ヿ一-鿿々〆ー]+|[A-Za-z0-9]+(?:['’-][A-Za-z]+)*|[^]/g) || [];
    let last = '';
    const push = (w) => { if (last) { out.push({ t: last }); last = ''; } out.push({ w }); };
    for (const run of runs) {
      if (!/[\p{L}\p{N}々〆ー]/u.test(run)) { last += run; continue; }
      if (!has || /^[A-Za-z0-9]/.test(run)) { push(run); continue; }
      const cs = Array.from(run); let i = 0;
      while (i < cs.length) {
        let len = Math.min(8, cs.length - i), hit = 0;
        for (; len >= 1; len--) if (has(cs.slice(i, i + len).join(''))) { hit = len; break; }
        if (!hit) hit = 1;
        const piece = cs.slice(i, i + hit).join('');
        if (hit === 1 && /^[ぁ-ゟ]$/.test(piece)) last += piece; else push(piece);
        i += hit;
      }
    }
    if (last) out.push({ t: last });
    return out;
  };
  // the sentence of a text that contains a word
  L.sentenceWith = (text, word) => (String(text).replace(/\n+/g, ' ').match(/[^。！？!?]+[。！？!?]*/g) || []).map((s) => s.trim()).find((s) => s.includes(word)) || '';


  // ---------- weekly recap ----------
  // The week (Monday to Sunday) that is `offset` weeks before the one that contains `today`: day by day XP, what you did, accuracy and how it
  // compares with the week before. xpNow is your total XP now (used to work out which level you started the week on).
  L.weekRecap = (log, xpNow, today, offset, words) => {
    const [y, m, d] = today.split('-').map(Number), dow = (new Date(y, m - 1, d).getDay() + 6) % 7; // Monday = 0
    const start = L.addDays(today, -dow - 7 * (offset || 0)), sum = (s) => {
      const days = Array.from({ length: 7 }, (_, i) => { const day = L.addDays(s, i), e = log[day] || {}; return { d: day, xp: e.xp || 0, cards: e.reviews || 0, listen: (e.lOk || 0) + (e.lMiss || 0), sheet: (e.sOk || 0) + (e.sMiss || 0), ok: (e.cOk || 0) + (e.lOk || 0) + (e.sOk || 0), bad: (e.cMiss || 0) + (e.lMiss || 0) + (e.sMiss || 0), added: e.newWords || 0 }; });
      const t = (k) => days.reduce((n, x) => n + x[k], 0), ok = t('ok'), bad = t('bad');
      return { days, xp: t('xp'), cards: t('cards'), listen: t('listen'), sheet: t('sheet'), added: t('added'), acc: ok + bad ? ok / (ok + bad) : null, active: days.filter((x) => x.xp || x.cards || x.listen || x.sheet).length };
    };
    const r = sum(start), prev = sum(L.addDays(start, -7)), end = L.addDays(start, 6);
    let after = 0; for (let day = L.addDays(end, 1); day <= today; day = L.addDays(day, 1)) after += (log[day] || {}).xp || 0; // XP earned after that week ended
    const xpEnd = Math.max(0, (xpNow || 0) - after), xpStart = Math.max(0, xpEnd - r.xp);
    const best = r.days.reduce((b, x) => (x.xp > (b ? b.xp : 0) ? x : b), null);
    return Object.assign(r, { start, end, prev, best, levelFrom: L.levelInfo(xpStart).level, levelTo: L.levelInfo(xpEnd).level, words: words || null });
  };
  // Bigg's comment on a week, sweet and specific
  L.recapLine = (r) => {
    const p = r.prev;
    if (!r.active) return 'A quiet week, and that is okay. One little session today and we are right back on track. 🌱';
    if (r.levelTo > r.levelFrom) return 'You grew a whole level this week! Look how far you have come. 🌟';
    if (r.active >= 6) return 'You practised almost every single day. I am so proud of you! 💗';
    if (p.xp > 0 && r.xp >= p.xp * 1.25) return 'More than last week, and I noticed every bit of it! ✨';
    if (r.acc != null && r.acc >= 0.85) return 'Most of your answers were right this week. Clever you! 🌸';
    if (r.active >= 4) return 'A steady week. Little by little is exactly how it works. 🌱';
    if (p.xp > r.xp && p.xp > 0) return 'A bit gentler than last week, and that is fine. Every day counts. 💗';
    return 'Every session helps my little flower grow. Let us do a bit more this week! 🌷';
  };

  // ---------- daily mix ----------
  // The three parts of today's mix from today's log entry: flashcards (your daily goal, or done when nothing is due), listening (5 answers), a worksheet (6 answers).
  L.mixSteps = (t, goal, due) => {
    t = t || {}; const g = Math.max(3, Math.min(20, goal || 10)), c = t.reviews || 0, li = (t.lOk || 0) + (t.lMiss || 0), sh = (t.sOk || 0) + (t.sMiss || 0);
    return [
      { id: 'cards', icon: '🃏', title: 'Flashcards', text: due ? g + ' cards, ' + due + ' due now' : 'nothing due right now', have: c, need: g, done: c >= g || due === 0 },
      { id: 'listen', icon: '🎧', title: 'Listening', text: '5 real sentences', have: li, need: 5, done: li >= 5 },
      { id: 'sheet', icon: '📝', title: 'Practice worksheet', text: '6 questions from your trouble words', have: sh, need: 6, done: sh >= 6 },
    ];
  };

  // ---------- seasons and holidays (from Varken board) ----------
  // winter, spring, summer or autumn (northern hemisphere, local time)
  function seasonOf(d) {
    const m = (d || new Date()).getMonth();
    return m === 11 || m < 2 ? 'winter' : m < 5 ? 'spring' : m < 8 ? 'summer' : 'autumn';
  }
  // Easter Sunday by the usual Gregorian computus.
  function easterSunday(y) {
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const n = h + l - 7 * m + 114;
    return new Date(y, Math.floor(n / 31) - 1, (n % 31) + 1);
  }
  // A holiday look for the day, or ''. Christmas 18-25 Dec, Halloween 25-31 Oct, King's Day 27 Apr (26 if that is
  // a Sunday), Mother's/Father's Day, Prinsjesdag, Sint-Maarten, Bevrijdingsdag, Sinterklaas 3-5 Dec, New Year 30 Dec-1 Jan, Valentine 12-14 Feb, St Patrick, 4 July, Carnival, birthday 10 May, Thanksgiving (US: 4th Thursday of Nov) and the day before, Easter from Good Friday to Easter Monday.
  // The n-th given weekday (0 = Sunday) of a month, as a day number.
  const nthWeekday = (y, m, weekday, n) => 1 + ((weekday - new Date(y, m, 1).getDay() + 7) % 7) + 7 * (n - 1);
  let bday = null; // { m: month 0-11, d: day } of your birthday
  L.setBirthday = (s) => { const x = /^\d{4}-(\d{2})-(\d{2})$/.exec(String(s || '')); bday = x ? { m: +x[1] - 1, d: +x[2] } : null; };
  function holidayOf(d) {
    const date = d || new Date(), y = date.getFullYear(), m = date.getMonth(), day = date.getDate();
    if (m === 11 && day >= 18 && day <= 25) return 'christmas';
    if (m === 9 && day >= 25) return 'halloween';
    if (m === 10) {
      const fourth = 1 + ((4 - new Date(y, 10, 1).getDay() + 7) % 7) + 21;
      if (day === fourth || day === fourth - 1) return 'thanksgiving';
    }
    if (bday && m === bday.m && day === bday.d) return 'birthday'; // your birthday, from Settings
    if (m === 4 && day === nthWeekday(y, 4, 0, 2)) return 'mothersday'; // 2nd Sunday of May, the same in NL and the US
    if (m === 5 && day === nthWeekday(y, 5, 0, 3)) return 'fathersday'; // 3rd Sunday of June
    if ((m === 11 && day >= 30) || (m === 0 && day <= 3)) return 'newyear'; // Japan keeps New Year for 1-3 January
    if (m === 1 && day === 3) return 'setsubun';
    if (m === 2 && day === 3) return 'hinamatsuri';
    const diff = Math.round((new Date(y, m, day) - easterSunday(y)) / 86400000);
    if (diff >= -2 && diff <= 1) return 'easter';
    if ((m === 2 && day >= 25) || (m === 3 && day <= 10)) return 'hanami'; // the cherry blossoms
    if (m === 4 && day === 5) return 'kodomo';
    if (m === 6 && day === 7) return 'tanabata';
    if (m === 1 && day >= 12 && day <= 14) return 'valentine';
    if (m === 2 && day === 17) return 'stpatrick';
    if (m === 6 && (day === 3 || day === 4)) return 'fourth';
    return '';
  }
  const lookOf = (d) => holidayOf(d) || seasonOf(d);
  L.seasonOf = seasonOf; L.holidayOf = holidayOf; L.lookOf = lookOf; L.easterSunday = easterSunday;

  // ---------- levels (XP) ----------
  // 99 levels, shaped like RuneScape: each level costs a little more than the last, and the cost doubles about every 7 levels, so the
  // last levels take most of the XP (level 92 is roughly halfway to 99). Cost of level n -> n+1 = 2 x (150 + 0.75 x 2^(n/7)); the x2 slows levelling down.
  L.MAX_LEVEL = 99;
  L.XP_TO = (() => { const t = [0, 0]; for (let n = 1; n < 99; n++) t[n + 1] = t[n] + 2 * Math.round(150 + 0.75 * Math.pow(2, n / 7)); return t; })(); // XP_TO[n] = total XP to reach level n
  // Japanese names spread over the 99 levels: [first level, Japanese name, English hint]
  L.LEVEL_NAMES = [[1, 'たね', 'little seed'], [5, 'め', 'sprout'], [10, 'ふたば', 'seedling'], [16, 'わかば', 'young leaves'], [22, 'つぼみ', 'bud'], [29, 'はな', 'flower'], [36, 'さくら', 'cherry blossom'], [43, 'もり', 'little forest'],
    [50, 'ことばの友', 'friend of words'], [57, 'おしゃべり', 'chatterbox'], [64, 'ことば名人', 'word expert'], [71, '日本語の勇者', 'Japanese hero'], [78, 'さむらい', 'samurai'], [85, '先生', 'sensei'], [92, '師匠', 'grand master'],
    [96, 'ことばの妖精', 'word fairy'], [99, '伝説', 'legend']];
  L.levelNeed = (level) => (level >= L.MAX_LEVEL ? 0 : L.XP_TO[level + 1] - L.XP_TO[level]); // XP to get from this level to the next
  L.levelTitle = (level) => { let n = L.LEVEL_NAMES[0]; for (const x of L.LEVEL_NAMES) if (level >= x[0]) n = x; return [n[1], n[2]]; };
  L.levelInfo = (xp) => {
    xp = Math.max(0, Math.floor(xp || 0)); let level = 1;
    while (level < L.MAX_LEVEL && xp >= L.XP_TO[level + 1]) level++;
    const max = level >= L.MAX_LEVEL, into = xp - L.XP_TO[level], need = L.levelNeed(level);
    return { level, into, need, pct: max ? 100 : Math.round((into / need) * 100), total: xp, title: L.levelTitle(level), max };
  };
  L.xpText = (info) => (info.max ? 'MAX LEVEL · ' + info.total.toLocaleString() + ' XP' : info.into.toLocaleString() + ' / ' + info.need.toLocaleString() + ' XP');
  // starting XP for someone who already practised: a bit for every card, listening answer and worksheet so far, plus every word you have
  L.xpFromHistory = (log, words) => {
    let xp = 0; // days since levels began count their real XP; older days get a small allowance for what you did
    for (const d of Object.values(log || {})) xp += d.xp != null ? d.xp : (d.reviews || 0) * 4 + (d.listen || 0) * 4 + (d.sheets || 0) * 15;
    return Math.round(xp + (words || []).filter((w) => !w.deleted && w.reps > 0).length); // a little for every word you have started
  };

  // How Bigg reacts after a flashcard is graded. grade: 'again' | 'good' | 'easy'; streak = right answers in a row (this one included);
  // done = cards graded so far; total = cards in the session now. Returns { kind (a COACH list), act (an animation), burst (emoji to float up) }.
  L.coachMoment = ({ grade, streak, done, total, rnd }) => {
    rnd = rnd || Math.random;
    const pick = (a) => a[Math.floor(rnd() * a.length)];
    if (grade === 'again') return { kind: 'again', act: 'sway', burst: '' };
    if (streak === 3) return { kind: 'streak3', act: 'cheer', burst: '⭐' };
    if (streak === 5) return { kind: 'streak5', act: 'spin', burst: '🔥' };
    if (streak >= 8 && streak % 4 === 0) return { kind: 'streak8', act: 'cheer', burst: '🎉' };
    if (total - done === 1) return { kind: 'last', act: 'hop', burst: '' };
    if (total >= 6 && done === Math.floor(total / 2)) return { kind: 'half', act: 'wiggle', burst: '✨' };
    return { kind: 'right', act: pick(['hop', 'wiggle', 'nod', 'bounce', 'twirl', 'wave']), burst: rnd() < 0.35 ? '💗' : '' };
  };

  // Repeat: a missed card comes back a few cards later, at most twice in a session, so one hard word cannot take over.
  // After you retyped it, it waits longer (5 to 8 cards), so seeing it again tests your memory and not what you just typed.
  // s = { queue, i } with i still on the missed card q. Returns false when the card has come back enough (it waits for the next session).
  L.MAX_COMEBACKS = 2;
  L.requeueMiss = (s, q, retyped, rnd) => {
    rnd = rnd || Math.random; const back = q.back || 0;
    if (back >= L.MAX_COMEBACKS) return false;
    const gap = retyped ? 5 + Math.floor(rnd() * 4) : 2 + Math.floor(rnd() * 2);
    s.queue.splice(Math.min(s.queue.length, s.i + gap), 0, Object.assign({}, q, { again: true, back: back + 1 }));
    return true;
  };
  // Where a session is, counted against the cards you chose (each once), plus the redos still waiting: "14 of 20 · 3 to redo".
  L.sessionProgress = ({ queue, i }) => {
    const total = queue.filter((q) => !q.again).length, done = queue.slice(0, i).filter((q) => !q.again).length, cur = queue[i];
    const redo = queue.slice(i).filter((q) => q.again).length - (cur && cur.again ? 1 : 0), more = redo ? ` · ${redo} to redo` : '';
    return cur && cur.again ? `🔁 Redo · ${done} of ${total} done${more}` : `${Math.min(done + 1, total)} of ${total}${more}`;
  };

  // Rough size of a prompt in Claude tokens (about 3.6 characters each for English, about one per Japanese character). An estimate, not a count.
  L.estimateTokens = (text) => { const t = String(text || ''), ja = (t.match(/[぀-ヿ一-鿿]/g) || []).length; return Math.ceil(ja * 1.1 + (t.length - ja) / 3.6); };

  // ---------- random helpers ----------
  L.shuffle = (arr, rnd) => { rnd = rnd || Math.random; const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  L.pick = (arr, n, rnd) => L.shuffle(arr, rnd).slice(0, n);

  // ---------- import / paste parsing ----------
  // One word per line: "食べる（たべる）= to eat", "食べる = to eat | 毎日ごはんを食べます。", "たべる; to eat", "食べる<TAB>たべる<TAB>to eat", "食べる - たべる - to eat"
  const guessKind = (en) => (/^to\s/i.test(String(en).trim()) ? 'verb' : 'other');
  const kanaOnly = (s) => !!s && J.isKana(String(s).replace(/\s/g, ''));
  const readingIn = (s) => { const m = String(s).trim().match(/^(.+?)\s*[（(【\[［](.+?)[）)】\]］]$/); return m && kanaOnly(m[2]) ? [m[1].trim(), m[2].replace(/\s/g, '')] : [String(s).trim(), '']; };
  L.parseVocab = (text) => {
    const out = [];
    for (let line of String(text || '').split(/\r?\n/)) {
      line = line.trim(); if (!line || line.startsWith('#')) continue;
      let example = '';
      const bar = line.split('|'); if (bar.length > 1) { line = bar[0].trim(); example = bar.slice(1).join('|').trim(); }
      const parts = line.split(/\t|\s=\s|=|;|；|\s[-–—]\s/).map((s) => s.trim()).filter(Boolean);
      if (parts.length < 2) continue;
      let [ja, reading] = readingIn(parts[0]), en;
      if (parts.length >= 3 && kanaOnly(parts[1]) && !reading) { reading = parts[1].replace(/\s/g, ''); en = parts.slice(2).join('; '); } else en = parts.slice(1).join('; ');
      out.push(L.newWord({ ja, reading, en, pos: guessKind(en), example }));
    }
    return out;
  };
  // Merge incoming words: skip ones we already have (same word and reading); returns { words, added, skipped }.
  const wordKey = (w) => String(w.ja || '').trim() + '|' + String(w.reading || '').trim();
  L.mergeWords = (have, incoming) => {
    const seen = new Set(have.filter((w) => !w.deleted).map(wordKey)), seenJa = new Set(have.filter((w) => !w.deleted && !w.reading).map((w) => w.ja));
    const words = have.slice(); let added = 0, skipped = 0;
    for (const w of incoming) {
      if (!w.ja || seen.has(wordKey(w)) || (!w.reading && seenJa.has(w.ja))) { skipped++; continue; }
      seen.add(wordKey(w)); words.push(L.newWord(w)); added++;
    }
    return { words, added, skipped };
  };
  // JSON the user got from Claude: { words: [{ja,reading,en,pos,example}], lessons: [{title,due,notes}] } (or just an array of words)
  // A list copied from a course page: each word on its own line (often after "Start" and a tab), then its English on the next line:
  //   食べる <tab> / to eat / 飲む <tab> / to drink ...
  L.looksLikeListing = (text) => /^\s*Start[ \t]+\S/mi.test(text) || /^\s*Start\s*$/mi.test(text) || /\t[ \t]*\r?\n[ \t]*\r?\n[ \t]*\S/.test(text);
  L.parseListing = (text) => {
    const lines = String(text || '').replace(/\r/g, '').replace(/ /g, ' ').split('\n')
      .map((s) => s.replace(/^\s*Start(?:[ \t]+|$)/i, '').trim()).filter(Boolean); // drop the "Start" prefix, tabs and blank lines
    const out = [];
    for (let i = 0; i + 1 < lines.length; i += 2) {
      const [ja, reading] = readingIn(lines[i]), en = lines[i + 1];
      out.push(L.newWord({ ja, reading, en, pos: guessKind(en) }));
    }
    out.leftover = lines.length % 2; // a last line without a partner
    return out;
  };
  const POS_IN = { noun: 'noun', n: 'noun', verb: 'verb', v: 'verb', adjective: 'adjective', adj: 'adjective', a: 'adjective' };
  L.parseImport = (text) => {
    let j = L.extractJson(text);
    if (!j) return { words: L.looksLikeListing(text) ? L.parseListing(text) : L.parseVocab(text), lessons: [] };
    if (Array.isArray(j)) j = { words: j };
    const words = (j.words || []).filter((w) => w && w.ja && w.en).map((w) => ({ ja: String(w.ja), reading: String(w.reading || w.kana || '').replace(/\s/g, ''), en: String(w.en), pos: POS_IN[String(w.pos || '').toLowerCase()] || guessKind(w.en), vclass: String(w.vclass || ''), example: w.example || '', exampleEn: w.exampleEn || '', lesson: w.lesson || '' }));
    const lessons = (j.lessons || []).filter((l) => l && l.title).map((l) => ({ title: String(l.title), due: l.due || '', notes: l.notes || '', status: l.status || 'todo' }));
    return { words, lessons };
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = L; else root.L = L;
})(typeof window !== 'undefined' ? window : globalThis);
