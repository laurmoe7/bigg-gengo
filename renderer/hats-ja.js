// Japanese holiday hats for Bigg. Loads after hats.js. Same 120 x 120 grid, the top of his head is at about y = 46.
const sakura = (x, y, r) => `<g transform="translate(${x} ${y})">${[0, 72, 144, 216, 288].map((a) => `<path d="M0 0 Q${-r * 0.9} ${-r * 1.1} 0 ${-r * 1.5} Q${r * 0.9} ${-r * 1.1} 0 0Z" fill="#ffc6dc" stroke="#ff9ec7" stroke-width=".6" transform="rotate(${a})"/>`).join('')}<circle r="${r * 0.28}" fill="#ff7fa6"/></g>`;
Object.assign(HATS, {
  // Setsubun (3 Feb): oni horns on a tiger-stripe band
  setsubun: `<g class="hat"><path d="M41 45 Q37 29 45 17 Q51 27 51 44 Z" fill="#fff3c4" stroke="#e8c76a" stroke-width="1.2" stroke-linejoin="round"/><path d="M79 45 Q83 29 75 17 Q69 27 69 44 Z" fill="#fff3c4" stroke="#e8c76a" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="M43 36 Q46 28 47 22" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round" opacity=".8"/><path d="M77 36 Q74 28 73 22" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round" opacity=".8"/>
    <circle cx="52" cy="38" r="4.6" fill="#2b2540"/><circle cx="60" cy="35" r="5" fill="#2b2540"/><circle cx="68" cy="38" r="4.6" fill="#2b2540"/><circle cx="56" cy="33" r="4" fill="#3a3258"/><circle cx="64" cy="33" r="4" fill="#3a3258"/>
    <path d="M33 47 Q60 38 87 47 L87 53 Q60 44 33 53 Z" fill="#ffd35a"/><path d="M42 44 l4 9 M52 41.6 l4 9 M62 41 l4 9 M72 42 l4 9 M81 44.5 l3.4 8" stroke="#2b2540" stroke-width="3" stroke-linecap="round"/></g>`,
  // Hinamatsuri (3 Mar): hishimochi, the pink, white and green diamond rice cakes, and a peach blossom
  hinamatsuri: `<g class="hat"><path d="M60 8 L74 20 L60 32 L46 20 Z" fill="#ffb3cf"/><path d="M60 8 L74 20 L60 20 Z" fill="#ff9ec7"/><path d="M60 20 L74 32 L60 44 L46 32 Z" fill="#fffaf5"/><path d="M60 20 L74 32 L60 32 Z" fill="#efe6dc"/><path d="M60 32 L74 44 L60 56 L46 44 Z" fill="#a9dc9a"/><path d="M60 32 L74 44 L60 44 Z" fill="#8cc87e"/>
    <path d="M52 15 L56 11" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".7"/>${sakura(36, 40, 5)}${sakura(86, 42, 4.4)}<path d="M34 46 Q60 40 88 46" fill="none" stroke="#a9dc9a" stroke-width="2.4" stroke-linecap="round" opacity=".0"/></g>`,
  // Hanami (cherry blossom viewing, late March to early April): a wreath of sakura
  hanami: `<g class="hat"><path d="M32 46 Q60 24 88 46" fill="none" stroke="#8a6a54" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M40 40 q-3 -6 -9 -6 q2 6 9 6 M80 40 q3 -6 9 -6 q-2 6 -9 6" fill="#8cc87e"/>${sakura(36, 43, 5.6)}${sakura(46, 34, 5)}${sakura(60, 30, 6)}${sakura(74, 34, 5)}${sakura(84, 43, 5.6)}${sakura(53, 27, 3.6)}${sakura(68, 26, 3.4)}
    <path transform="translate(24 28) scale(.9)" d="M0 0 q3 -5 6 0 q-3 5 -6 0z" fill="#ffc6dc"/><path transform="translate(96 24) scale(.9)" d="M0 0 q3 -5 6 0 q-3 5 -6 0z" fill="#ffe0ec"/></g>`,
  // Kodomo no Hi (5 May, Golden Week): a paper kabuto helmet
  kodomo: `<g class="hat"><path d="M34 47 Q36 20 60 17 Q84 20 86 47 Z" fill="#d94452"/><path d="M60 17 Q84 20 86 47 L72 47 Q74 26 60 17 Z" fill="#b8333f"/><path d="M42 36 Q47 26 54 22" stroke="#ff8a96" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".7"/>
    <path d="M30 47 Q60 41 90 47 L94 56 Q60 48 26 56 Z" fill="#2b2540"/><path d="M30 47 Q60 41 90 47" fill="none" stroke="#ffd35a" stroke-width="2"/>
    <path d="M60 33 Q50 28 44 12 Q47 10 50 14 Q54 24 60 27 Q66 24 70 14 Q73 10 76 12 Q70 28 60 33 Z" fill="#ffd35a" stroke="#e0a93a" stroke-width="1" stroke-linejoin="round"/><circle cx="60" cy="31" r="3.4" fill="#ffe9a0"/>
    ${[40, 50, 60, 70, 80].map((x) => `<circle cx="${x}" cy="${44 - Math.abs(x - 60) * 0.1}" r="1.5" fill="#ffd35a"/>`).join('')}</g>`,
  // Tanabata (7 Jul): a bamboo branch with wish papers and a star
  tanabata: `<g class="hat"><path d="M76 47 L84 2" stroke="#6cb878" stroke-width="3.6" stroke-linecap="round"/><path d="M76 47 L84 2" stroke="#9ad9a3" stroke-width="1.2" stroke-linecap="round"/><path d="M78.4 34 h4.6 M80.6 20 h4.2" stroke="#4a9a5a" stroke-width="1.6"/>
    <path d="M83 12 Q70 6 60 12 Q70 14 83 12 Z" fill="#7fcf8c"/><path d="M80 24 Q68 20 58 28 Q70 28 80 24 Z" fill="#6cb878"/><path d="M82 30 Q94 22 104 28 Q94 32 82 30 Z" fill="#7fcf8c"/>
    <rect x="62" y="26" width="6" height="16" fill="#ff9ec7"/><rect x="92" y="28" width="6" height="14" fill="#ffe29a"/><rect x="50" y="34" width="6" height="12" fill="#8fd3ff"/><path d="M65 26 v-6 M95 28 v-5 M53 34 v-6" stroke="#b9a4ff" stroke-width="1"/>
    <path transform="translate(84 4) scale(1.5)" d="M0 -4 l1.2 2.7 2.9 .3 -2.2 2 .6 2.9 -2.5 -1.5 -2.5 1.5 .6 -2.9 -2.2 -2 2.9 -.3z" fill="#ffd35a"/>
    <path d="M34 47 Q56 40 78 47" fill="none" stroke="#b9a4ff" stroke-width="4" stroke-linecap="round"/></g>`,
});
