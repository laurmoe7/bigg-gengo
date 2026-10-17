// Japanese helpers (no DOM): kana, romaji typing, furigana, verb and adjective forms. Shared by the app and the tests.
(function (root) {
  const J = {};

  // ---------- kana and character kinds ----------
  J.toHira = (s) => String(s || '').replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60)); // katakana -> hiragana (ー stays)
  J.toKata = (s) => String(s || '').replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));
  J.hasKanji = (s) => /[一-鿿々〆]/.test(String(s || ''));
  J.isKana = (s) => /^[぀-ヿー・]+$/.test(String(s || ''));
  J.hasJa = (s) => /[぀-ヿ一-鿿々]/.test(String(s || ''));
  J.isLatin = (s) => /^[A-Za-z0-9'’\-\s.,!?āīūēō]+$/.test(String(s || '')) && /[A-Za-z]/.test(String(s || ''));

  // ---------- romaji -> hiragana (typing) ----------
  // Hepburn plus the usual Kunrei spellings (si, ti, tu, hu, zi, sya...). "nn" or "n'" is ん; a doubled consonant makes っ; "-" is the long mark ー.
  const R = {};
  const add = (k, v) => { R[k] = v; };
  'a あ,i い,u う,e え,o お'.split(',').forEach((p) => { const [r, k] = p.split(' '); add(r, k); });
  const rows = {
    k: 'かきくけこ', s: 'さしすせそ', t: 'たちつてと', n: 'なにぬねの', h: 'はひふへほ', m: 'まみむめも', r: 'らりるれろ', g: 'がぎぐげご', z: 'ざじずぜぞ', d: 'だぢづでど', b: 'ばびぶべぼ', p: 'ぱぴぷぺぽ',
  };
  for (const [c, ks] of Object.entries(rows)) 'aiueo'.split('').forEach((v, i) => add(c + v, ks[i]));
  add('ya', 'や'); add('yu', 'ゆ'); add('yo', 'よ'); add('wa', 'わ'); add('wo', 'を'); add('wi', 'うぃ'); add('we', 'うぇ');
  add('shi', 'し'); add('chi', 'ち'); add('tsu', 'つ'); add('fu', 'ふ'); add('ji', 'じ'); add('si', 'し'); add('ti', 'ち'); add('tu', 'つ'); add('hu', 'ふ'); add('zi', 'じ');
  add('di', 'ぢ'); add('du', 'づ'); add("n'", 'ん'); add('xn', 'ん');
  const small = { a: 'ぁ', i: 'ぃ', u: 'ぅ', e: 'ぇ', o: 'ぉ' };
  for (const [v, k] of Object.entries(small)) { add('xt' + 'u'.repeat(0) + v, k); add('x' + v, k); add('l' + v, k); }
  add('xya', 'ゃ'); add('xyu', 'ゅ'); add('xyo', 'ょ'); add('lya', 'ゃ'); add('lyu', 'ゅ'); add('lyo', 'ょ'); add('xtu', 'っ'); add('xtsu', 'っ'); add('ltu', 'っ'); add('ltsu', 'っ');
  // contracted sounds: kya kyu kyo ...
  const yoon = { k: 'き', g: 'ぎ', n: 'に', h: 'ひ', m: 'み', r: 'り', b: 'び', p: 'ぴ' };
  for (const [c, k] of Object.entries(yoon)) { add(c + 'ya', k + 'ゃ'); add(c + 'yu', k + 'ゅ'); add(c + 'yo', k + 'ょ'); add(c + 'ye', k + 'ぇ'); }
  const yoon2 = { sh: 'し', ch: 'ち', j: 'じ', sy: 'し', ty: 'ち', zy: 'じ', dy: 'ぢ', cy: 'ち' };
  for (const [c, k] of Object.entries(yoon2)) { add(c + 'a', k + 'ゃ'); add(c + 'u', k + 'ゅ'); add(c + 'o', k + 'ょ'); add(c + 'e', k + 'ぇ'); }
  add('jya', 'じゃ'); add('jyu', 'じゅ'); add('jyo', 'じょ'); add('cha', 'ちゃ'); add('chu', 'ちゅ'); add('cho', 'ちょ'); add('che', 'ちぇ'); add('she', 'しぇ'); add('je', 'じぇ');
  add('tsa', 'つぁ'); add('tsi', 'つぃ'); add('tse', 'つぇ'); add('tso', 'つぉ'); add('fa', 'ふぁ'); add('fi', 'ふぃ'); add('fe', 'ふぇ'); add('fo', 'ふぉ'); add('fyu', 'ふゅ');
  add('thi', 'てぃ'); add('dhi', 'でぃ'); add('thu', 'てゅ'); add('dhu', 'でゅ'); add('twu', 'とぅ'); add('dwu', 'どぅ'); add('va', 'ゔぁ'); add('vi', 'ゔぃ'); add('vu', 'ゔ'); add('ve', 'ゔぇ'); add('vo', 'ゔぉ');
  add('wha', 'うぁ'); add('whi', 'うぃ'); add('whe', 'うぇ'); add('who', 'うぉ'); add('kwa', 'くぁ'); add('gwa', 'ぐぁ');
  add('-', 'ー');
  const PUNCT = { '.': '。', ',': '、', '?': '？', '!': '！', '~': '〜', '[': '「', ']': '」' };
  const MACRON = { ā: 'aa', ī: 'ii', ū: 'uu', ē: 'ee', ō: 'ou', Ā: 'aa', Ī: 'ii', Ū: 'uu', Ē: 'ee', Ō: 'ou' };
  const MAXR = 4;
  // Converts as much of `s` as is complete. opt.final: a trailing n becomes ん; otherwise a trailing "n" or half-typed syllable stays as typed (live typing).
  J.toKana = (s, opt) => {
    s = String(s || '').replace(/[āīūēōĀĪŪĒŌ]/g, (c) => MACRON[c]).normalize('NFKC');
    const fin = !!(opt && opt.final); let out = '', i = 0;
    while (i < s.length) {
      const ch = s[i], low = ch.toLowerCase();
      if (!/[a-z'\-]/.test(low)) { out += PUNCT[ch] || ch; i++; continue; }
      if (low === 'n' && (s[i + 1] || '').toLowerCase() === 'n') { // "nn" is ん, but in "konnichi" the second n starts に
        out += 'ん'; i += /[aiueoy]/.test((s[i + 2] || '').toLowerCase()) ? 1 : 2; continue;
      }
      let hit = '';
      for (let len = Math.min(MAXR, s.length - i); len >= 1 && !hit; len--) { const k = s.slice(i, i + len).toLowerCase(); if (R[k] != null) { hit = k; } }
      if (hit) { out += R[hit]; i += hit.length; continue; }
      const nx = (s[i + 1] || '').toLowerCase();
      if (low === 'n' && nx && !/[aiueoy]/.test(nx) && /[a-z]/.test(nx)) { out += 'ん'; i++; continue; } // n before a consonant: ん (nk -> んk)
      if (low === nx && /[bcdfghjklmpqrstvwxyz]/.test(low)) { out += 'っ'; i++; continue; } // kk -> っk
      if (low === 'n' && i === s.length - 1 && fin) { out += 'ん'; i++; continue; }
      out += ch; i++; // not complete yet (or not romaji): keep it as typed
    }
    return out;
  };
  J.romajiToKana = (s) => J.toKana(s, { final: true });

  // ---------- hiragana -> romaji (Hepburn), for the optional romaji line ----------
  const H2R = {};
  Object.entries(R).forEach(([r, k]) => { if (/^[a-z]/.test(r) && !/^(si|ti|tu|hu|zi|di|du|xn|nn|jya|jyu|jyo|sy|ty|zy|dy|cy|x|l|wi|we)/.test(r) && H2R[k] == null) H2R[k] = r; });
  Object.assign(H2R, { 'ぢ': 'ji', 'づ': 'zu', 'を': 'o', 'ん': 'n', 'ー': '-', 'じゃ': 'ja', 'じゅ': 'ju', 'じょ': 'jo', 'ぢゃ': 'ja', 'ぢゅ': 'ju', 'ぢょ': 'jo' });
  J.toRomaji = (s) => {
    s = J.toHira(String(s || '')); let out = '', i = 0, dbl = false;
    while (i < s.length) {
      const two = s.slice(i, i + 2), one = s[i];
      if (one === 'っ') { dbl = true; i++; continue; }
      let r = null, n = 0;
      if (H2R[two] != null && /[ゃゅょぁぃぅぇぉ]/.test(two[1])) { r = H2R[two]; n = 2; } else if (H2R[one] != null) { r = H2R[one]; n = 1; }
      if (r == null) { out += one; i++; dbl = false; continue; }
      if (dbl && /^[a-z]/.test(r)) r = (r.startsWith('ch') ? 't' : r[0]) + r;
      if (r === 'n' && /[aiueoy]/.test((H2R[s.slice(i + 1, i + 2)] || '')[0] || '')) r = "n'";
      out += r; i += n; dbl = false;
    }
    return out.replace(/-/g, '');
  };

  // ---------- normalising for comparison ----------
  // Same sound-spelling whatever script: NFKC, hiragana, no spaces or punctuation, lower case. Latin letters are read as romaji.
  J.norm = (s, opt) => {
    let t = String(s || '').normalize('NFKC').trim();
    if (/[A-Za-z]/.test(t) && !J.hasJa(t.replace(/[A-Za-z0-9'\-\s.,!?]/g, ''))) t = J.toKana(t.toLowerCase(), { final: true }); // pure romaji -> kana
    t = J.toHira(t).replace(/[\s　。、，．,.!?！？「」『』（）()・〜~…"“”'‘’:：;；]+/g, '');
    return (opt && opt.keepLong) ? t : t;
  };
  // Is this typed text (kana, kanji or romaji) the word? target: { ja, reading } . Returns 'right' | 'reading' (right sound, kanji not typed) | 'close' | 'wrong'.
  J.matchWord = (typed, w) => {
    const t = J.norm(typed); if (!t) return 'wrong';
    const ja = J.norm(w.ja), rd = J.norm(w.reading || '');
    if (t === ja) return 'right';
    if (rd && t === rd) return J.hasKanji(w.ja) && !J.hasKanji(typed) ? 'reading' : 'right';
    const lev = J.lev;
    for (const a of [ja, rd]) if (a && [...a].length >= 4 && lev(t, a) <= 1) return 'close';
    return 'wrong';
  };
  J.lev = (a, b) => {
    a = [...a]; b = [...b]; const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
    let prev = Array.from({ length: n + 1 }, (_, i) => i);
    for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; }
    return prev[n];
  };

  // ---------- furigana ----------
  // Splits a word and its reading into [text, reading|''] pieces so kana stay plain and only the kanji get the small reading above:
  // 食べる / たべる -> [['食','た'],['べる','']]
  J.ruby = (word, reading) => {
    word = String(word || ''); reading = J.toHira(String(reading || ''));
    if (!reading || !J.hasKanji(word) || J.toHira(word) === reading) return [[word, '']];
    const w = [...word], r = [...reading];
    let a = 0; while (a < w.length && a < r.length && !J.hasKanji(w[a]) && J.toHira(w[a]) === r[a]) a++; // leading kana
    let b = 0; while (b < w.length - a && b < r.length - a && !J.hasKanji(w[w.length - 1 - b]) && J.toHira(w[w.length - 1 - b]) === r[r.length - 1 - b]) b++; // trailing kana (okurigana)
    const mid = w.slice(a, w.length - b).join(''), midR = r.slice(a, r.length - b).join('');
    const out = []; if (a) out.push([w.slice(0, a).join(''), '']);
    if (mid) out.push(J.hasKanji(mid) && midR ? [mid, midR] : [mid, '']);
    if (b) out.push([w.slice(w.length - b).join(''), '']);
    return out;
  };
  J.rubyHtml = (word, reading, esc) => {
    esc = esc || ((x) => String(x).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])));
    return J.ruby(word, reading).map(([t, r]) => (r ? '<ruby>' + esc(t) + '<rt>' + esc(r) + '</rt></ruby>' : esc(t))).join('');
  };

  // ---------- sentences from the data file ----------
  // A sentence is [japanese, english, words]; words = "surface;reading;basic|..." (see scripts/build-data.js).
  J.tokens = (s) => String((s && s[2]) || '').split('|').filter(Boolean).map((t) => { const [sf, rd, bf] = t.split(';'); return { s: sf, r: rd || (J.hasKanji(sf) ? '' : J.toHira(sf)), b: bf || sf }; });
  J.sentenceKana = (s) => J.tokens(s).map((t) => t.r || t.s).join('');
  J.sentenceRuby = (s, esc) => J.tokens(s).map((t) => J.rubyHtml(t.s, t.r, esc)).join('');

  // ---------- verbs and adjectives ----------
  // cls: JMdict class: v1 / v1-s ichidan, v5k v5g v5s v5t v5n v5b v5m v5r (v5k-s = 行く, v5r-i = ある, v5aru), v5u (v5u-s), vs-i (する), vs-s, vk (来る), vz (ずる)
  const GODAN = { う: ['い', 'わ', 'え', 'お', 'っ'], く: ['き', 'か', 'け', 'こ', 'い'], ぐ: ['ぎ', 'が', 'げ', 'ご', 'い'], す: ['し', 'さ', 'せ', 'そ', 'し'], つ: ['ち', 'た', 'て', 'と', 'っ'], ぬ: ['に', 'な', 'ね', 'の', 'ん'], ぶ: ['び', 'ば', 'べ', 'ぼ', 'ん'], む: ['み', 'ま', 'め', 'も', 'ん'], る: ['り', 'ら', 'れ', 'ろ', 'っ'] };
  J.verbClass = (tag) => { tag = String(tag || ''); return /^v1/.test(tag) ? 'ichidan' : /^v5/.test(tag) ? 'godan' : /^vs/.test(tag) ? 'suru' : /^vk/.test(tag) ? 'kuru' : /^vz/.test(tag) ? 'zuru' : ''; };
  const teTa = (last, ta) => ({ う: 'っ', つ: 'っ', る: 'っ', く: 'い', ぐ: 'い', ぬ: 'ん', ぶ: 'ん', む: 'ん', す: 'し' }[last] + (ta ? ({ う: 'た', つ: 'た', る: 'た', く: 'た', ぐ: 'だ', ぬ: 'だ', ぶ: 'だ', む: 'だ', す: 'た' }[last]) : ({ う: 'て', つ: 'て', る: 'て', く: 'て', ぐ: 'で', ぬ: 'で', ぶ: 'で', む: 'で', す: 'て' }[last])));
  // Forms of a verb as written in `word` (kanji or kana). Returns null when the class is not known. Every value is a string in the same spelling as `word`.
  J.verbForms = (word, tag) => {
    const cls = J.verbClass(tag), w = String(word || ''); if (!cls || !w) return null;
    const f = {}; let stem, base, a, i, e, o, te, ta;
    if (cls === 'ichidan') { stem = w.slice(0, -1); a = stem; i = stem; e = stem; o = stem; te = stem + 'て'; ta = stem + 'た'; f.potential = stem + 'られる'; f.passive = stem + 'られる'; f.causative = stem + 'させる'; f.volitional = stem + 'よう'; f.imperative = stem + 'ろ'; f.ba = stem + 'れば'; }
    else if (cls === 'godan') {
      const last = w.slice(-1), g = GODAN[last]; if (!g) return null; base = w.slice(0, -1); i = base + g[0]; a = base + g[1]; e = base + g[2]; o = base + g[3];
      te = base + (/^v5k-s/.test(tag) ? 'っ' + 'て' : teTa(last, false)); ta = base + (/^v5k-s/.test(tag) ? 'った' : teTa(last, true));
      if (/^v5aru/.test(tag)) { i = base + 'い'; te = base + 'って'; ta = base + 'った'; }
      if (last === 'う') a = base + 'わ';
      f.potential = e + 'る'; f.passive = a + 'れる'; f.causative = a + 'せる'; f.volitional = o + 'う'; f.imperative = e; f.ba = e + 'ば';
      stem = i;
    } else if (cls === 'suru') { const p = w.replace(/する$|為る$/, ''); f.masu = p + 'します'; stem = p + 'し'; a = p + 'し'; te = p + 'して'; ta = p + 'した'; f.potential = p + 'できる'; f.passive = p + 'される'; f.causative = p + 'させる'; f.volitional = p + 'しよう'; f.imperative = p + 'しろ'; f.ba = p + 'すれば'; f.nai = p + 'しない'; }
    else if (cls === 'kuru') { const kj = /来る$/.test(w), p = w.replace(/(来る|くる)$/, ''), K = (x, y) => p + (kj ? '来' : x) + y; stem = K('き', ''); te = stem + 'て'; ta = stem + 'た'; f.nai = K('こ', 'ない'); f.potential = K('こ', 'られる'); f.passive = f.potential; f.causative = K('こ', 'させる'); f.volitional = K('こ', 'よう'); f.imperative = K('こ', 'い'); f.ba = K('く', 'れば'); }
    else return null;
    f.dict = w; f.masu = f.masu || stem + 'ます'; f.mashita = stem + 'ました'; f.masen = stem + 'ません'; f.te = te; f.ta = ta;
    f.nai = f.nai || (/^v5r-i/.test(tag) ? 'ない' : a + 'ない'); f.nakatta = f.nai.replace(/ない$/, 'なかった');
    f.tai = stem + 'たい'; f.tara = ta + 'ら'; f.teiru = te + 'いる';
    return f;
  };
  // A one-line rule for making a form, shown after an answer. key: a VERB_FORM_NAMES key, word: the dictionary form, tag: the JMdict class.
  J.formRule = (key, word, tag) => {
    const cls = J.verbClass(tag), last = String(word || '').slice(-1);
    if (cls === 'ichidan') return { te: 'る-verb: drop る, add て.', ta: 'る-verb: drop る, add た.', masu: 'る-verb: drop る, add ます.', nai: 'る-verb: drop る, add ない.', potential: 'る-verb: drop る, add られる.', volitional: 'る-verb: drop る, add よう.', passive: 'る-verb: drop る, add られる.', causative: 'る-verb: drop る, add させる.', ba: 'る-verb: drop る, add れば.', imperative: 'る-verb: drop る, add ろ.' }[key] || '';
    if (cls === 'suru') return 'する is irregular: ' + ({ te: 'して', ta: 'した', masu: 'します', nai: 'しない', potential: 'できる', volitional: 'しよう', passive: 'される', causative: 'させる', ba: 'すれば', imperative: 'しろ' }[key] || '') + '.';
    if (cls === 'kuru') return '来る (くる) is irregular: ' + ({ te: '来て (きて)', ta: '来た (きた)', masu: '来ます (きます)', nai: '来ない (こない)', potential: '来られる (こられる)', volitional: '来よう (こよう)', passive: '来られる', causative: '来させる', ba: '来れば (くれば)', imperative: '来い (こい)' }[key] || '') + '.';
    if (cls === 'godan') {
      if (/^v5k-s/.test(tag) && (key === 'te' || key === 'ta')) return '行く is the one exception: 行って / 行った, not 行いて.';
      if (key === 'te' || key === 'ta') { const e = { う: 'って', つ: 'って', る: 'って', む: 'んで', ぶ: 'んで', ぬ: 'んで', く: 'いて', ぐ: 'いで', す: 'して' }[last]; return e ? 'う-verb ending in ' + last + ': ' + last + ' → ' + (key === 'ta' ? e.replace('て', 'た').replace('で', 'だ') : e) + '.' : ''; }
      const row = { masu: 'い', nai: 'あ', potential: 'え', volitional: 'お', passive: 'あ', causative: 'あ', ba: 'え', imperative: 'え' }[key];
      const add = { masu: 'ます', nai: 'ない', potential: 'る', volitional: 'う', passive: 'れる', causative: 'せる', ba: 'ば', imperative: '' }[key];
      return row ? 'う-verb: change the last kana to its ' + row + '-row sound (' + last + ' → ' + (GODAN[last] ? GODAN[last][{ い: 0, あ: 1, え: 2, お: 3 }[row]] : '?') + ')' + (add ? ', add ' + add : '') + '.' : '';
    }
    return '';
  };
  J.VERB_FORM_NAMES = { dict: 'dictionary form', masu: 'polite (ます)', mashita: 'polite past (ました)', masen: 'polite negative (ません)', te: 'て-form', ta: 'past (た)', nai: 'negative (ない)', nakatta: 'past negative (なかった)', tai: 'want to (たい)', potential: 'can do (potential)', passive: 'passive', causative: 'causative', volitional: "let's (volitional)", imperative: 'command', ba: 'if (ば)', tara: 'if / when (たら)', teiru: 'is doing (ている)' };
  // i-adjectives (cls 'i', or 'ix' for いい/よい) and na-adjectives ('na')
  J.adjForms = (word, cls) => {
    const w = String(word || ''); if (!w) return null;
    if (cls === 'na') return { dict: w, present: w + 'だ', polite: w + 'です', negative: w + 'ではない', past: w + 'だった', pastNeg: w + 'ではなかった', te: w + 'で', adverb: w + 'に', noun: w + 'な' };
    const st = cls === 'ix' && /いい$/.test(w) ? w.slice(0, -2) + 'よ' : w.slice(0, -1); // いい is よい in every form but its own
    return { dict: w, polite: w + 'です', negative: st + 'くない', past: st + 'かった', pastNeg: st + 'くなかった', te: st + 'くて', adverb: st + 'く', ba: st + 'ければ' };
  };
  J.ADJ_FORM_NAMES = { dict: 'dictionary form', present: 'plain', polite: 'polite', negative: 'negative', past: 'past', pastNeg: 'past negative', te: 'て-form (and)', adverb: 'adverb', noun: 'before a noun', ba: 'if (ば)' };

  // The row of the kana chart a word sorts under (あ か さ た な は ま や ら わ), or '#' for anything else.
  J.KANA_ROWS = 'あかさたなはまやらわ';
  const ROWS = { あ: 'ぁあぃいぅうぇえぉおゔ', か: 'かがきぎくぐけげこご', さ: 'さざしじすずせぜそぞ', た: 'たただちぢっつづてでとど', な: 'なにぬねの', は: 'はばぱひびぴふぶぷへべぺほぼぽ', ま: 'まみむめも', や: 'ゃやゅゆょよ', ら: 'らりるれろ', わ: 'ゎわゐゑをん' };
  J.kanaRow = (s) => { const c = J.toHira(String(s || '').normalize('NFKC')).charAt(0); for (const [row, cs] of Object.entries(ROWS)) if (cs.includes(c)) return row; return '#'; };

  // Counting and time helpers used on the Today page
  J.DAYS = ['日', '月', '火', '水', '木', '金', '土'];

  if (typeof module !== 'undefined' && module.exports) module.exports = J; else root.J = J;
})(typeof window !== 'undefined' ? window : globalThis);
