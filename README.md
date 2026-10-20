# BiggGengo 🐷🎌

A cute, dark Japanese learning app for Windows (Electron): the Japanese sibling of [BiggTaal](https://github.com/laurmoe7/bigg-taal). Same pig, same look, same spaced-repetition engine, with everything about the language rebuilt for Japanese.

- **Flashcards** with FSRS spaced repetition in three modes: flip, type the answer (the app grades it: wrong is Again, with an "I was right" button; right is Good or Easy), or fill the blank in the word's own example sentence. Type **romaji and it turns into kana as you go**; kanji, kana and romaji all count as right (Settings: the reading can be made "close" instead of "right" when a card has kanji). **Furigana** over every kanji (always, on hover, or hidden). Retype, Repeat, Group (nouns, verbs, adjectives, needs work, one lesson) and "do more cards" as in BiggTaal.
- **Two cards per word**: Japanese → English and English → Japanese each have their own schedule (kept in the word's `rv`); Direction picks which you practise (Both by default). A new word starts Japanese first; its English → Japanese card can start from the next day, up to the new-words-per-day number, best-known words first. New and starting cards are spread through the session. Fill the blank follows the English → Japanese schedule.
- **Tricky words**: a card missed 4 or more times that is still weak is tricky. Bigg asks for a memory trick under the turned card (it shows on every later turn and on the word; edit it in the word's form), Today has a Tricky words card, and My words has a Tricky tab (also a flashcard group).
- **Reading**: short stories Claude writes at your JLPT level (N5, N4, N3), length and topic, using your tricky words and words that need work. Each paragraph comes with its words, readings and dictionary forms, so the story has furigana and tapping 行きました looks up 行く (without them the text is cut by the dictionary). Hear each paragraph or the whole story, show the English, add words from the story's word list or a tapped word (with the story sentence as the example), and answer a few questions. Code in `renderer/reading.js`, prompt and reply rules in `logic.js` (tested).
- **Kana**: hiragana and katakana charts you can tap to hear, plus practice with the same scheduling (read it and type the romaji, pick the kana, or hear it and pick it).
- **Phrases**: ~125 everyday sentences in 10 situations (greetings, restaurant, shopping, trains, hotels, phone...) with furigana, and 12 sentence patterns where you swap words in. Practise them as flashcards: flip, type the whole sentence (kana, kanji or romaji), or fill the missing word.
- **Words** in tabs (all, nouns, verbs, adjectives, other, needs work, new, learned), searched by kanji, kana, romaji or English, sorted あ–ん with a kana row strip. A **dictionary** (JMdict) that finds conjugated forms (たべた, ikimasu, 大きくない), **Suggested** words by frequency, **Blank-page recall** (type every word you remember, by group or frequency band).
- **Listening**: write the word you hear, pick the meaning, pick how it is written (kanji), or **sentence dictation** with real Tatoeba sentences. Spelling slips are tagged (long vowels, small っ, ゛゜, は/わ, を/お, じ/ぢ...) and come back as "sounds to practise".
- **Grammar**: 14 cheat sheets (scripts, word order, です, particles, verb groups, て-form, negative and past, adjectives, たい/好き/できる, ある/いる, counters, connectors, politeness) and a **conjugation trainer** (て-form, ない, た, ます, potential, volitional, adjective forms) with a one-line rule after every answer.
- **Worksheets**: quick practice made from the dictionary and real sentences (meanings, readings, fill the gap, particles, verb and adjective forms, word order), or worksheets Claude writes from the topics and grammar you pick (you copy a prompt to chat and paste the JSON reply back). Marked instantly where possible, by Claude for open answers, with a running record of your mistakes by skill.
- Bigg the pig: level-ups, daily goal, streak, a wardrobe of seasonal and holiday hats (new: Setsubun, Hinamatsuri, Hanami, Children's Day, Tanabata), Today page with a proverb (ことわざ), phrases and words of the day.

## Run / build

```
npm install
npm start          # run the app (needs Electron's postinstall: see below)
npm test           # logic tests
npm run dist       # builds dist/BiggGengo-Setup x.y.z.exe
```

Electron downloads its program file in an install script. If `npm install` reports that scripts were skipped, run `npm approve-scripts` (or `node node_modules/electron/install.js`) once.

To look at the screens in a plain browser (no Electron, data in localStorage): `node scripts/serve.js` and open http://localhost:5173/renderer/index.html.

Data is saved in `%APPDATA%\BiggGengo\data.json` (one backup per day beside it).

## Voices

No voice engine is bundled. Listening uses whichever of these is available:

1. **VOICEVOX** (free, offline): install the app from https://voicevox.hiroshiba.jp, start it before BiggGengo, and its voices appear under Settings → Voice ("Natural voices"). Each character has its own usage terms, see VOICEVOX's site.
2. **Windows' own Japanese voice** (Settings → Time & language → Language & region → add 日本語 with *Text-to-speech*), or
3. **Online Azure voices** (Nanami, Keita, Aoi, Daichi, Mayu, Naoki, Shiori) with a free Azure Speech key, set up in Settings. The key is encrypted with Windows' own protection and every clip is cached on the PC.

If none of these is set up (no Azure key, no Japanese Windows voice, VOICEVOX not running), the 🔊 buttons stay silent: add an Azure key in Settings, or install one of the others.

(The Piper project's only Japanese voice, `hi_fi_captain`, needs Piper 1.7+ and is licensed CC BY-NC-SA, so it is not used here.)

## Data

`data/dict.js`, `data/freq.js` and `data/sentences.js` are built by `scripts/build-data.js` from JMdict, an OpenSubtitles frequency list and Tatoeba; see [data/README.md](data/README.md). The hand-written content (starter words, proverbs, phrases, patterns) is in `scripts/content-src.js`; `node scripts/build-content.js` adds readings and word splits (kuromoji) and writes `renderer/content.js`. `kuromoji` is a build-time dev dependency only.

## Files

`main.js` window, saving, online voices, updates. `preload.js` bridge. `renderer/japanese.js` kana, romaji typing, furigana, verb and adjective forms (tested). `renderer/logic.js` pure rules (tested). `renderer/content.js` (generated) and `renderer/seed.js` starter words, phrases, grammar sheets, pig lines. `renderer/pig.js` the mascot. `renderer/app.js` shell, Today, Listening, Settings. `renderer/flashcards.js`, `words.js`, `phrases.js`, `kana.js`, `verbs.js` (conjugation trainer), `practice.js` (worksheets), `recall.js`.

## Claude import format

```json
{"words":[{"ja":"約束","reading":"やくそく","en":"promise","pos":"noun","example":"約束を守ります。","lesson":"Lesson 12"}],
 "lessons":[{"title":"Lesson 13","due":"2026-10-20"}]}
```

Or one word per line: `食べる（たべる）= to eat | 毎日ご飯を食べます。`
