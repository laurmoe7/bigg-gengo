# BiggGengo 🐷🎌

A cute Japanese learning app for Windows, with Bigg the pig. The Japanese sibling of [BiggTaal](https://github.com/laurmoe7/bigg-taal).

**Install:** download `BiggGengo-Setup-x.y.z.exe` from [Releases](https://github.com/laurmoe7/bigg-gengo/releases). After that it updates itself (Settings → Check for updates).

## What's inside

- **Flashcards** with spaced repetition: flip, type the answer, or fill the blank in an example sentence. Each word has a Japanese → English and an English → Japanese card. Words you keep missing become *tricky words* and get a memory trick.
- **Type in romaji** and it turns into kana as you go. Kanji, kana and romaji all count, and close answers show which kana slipped.
- **Show Japanese as** kanji with furigana, kana only, kana with romaji, or romaji only (Settings).
- **Kana** charts and practice, **Phrases** for everyday situations, **My words**, a **Dictionary** that understands conjugated forms, and **Blank-page recall**.
- **Listening**: write what you hear, pick the meaning or spelling, or take dictation of real sentences.
- **Grammar**: cheat sheets, a conjugation trainer and a sentence builder.
- **Worksheets**: quick practice from your words, or worksheets Claude writes for you.
- **Bonus Lessons**: Japan's 47 prefectures, its seas, mountains and islands, and the countries and flags of the world, all in Japanese.
- **Bigg**: levels, a daily goal, a streak, and a wardrobe of seasonal hats.

## Voices

No voice is bundled. The 🔊 buttons use whichever of these you have:

1. **VOICEVOX** (free, offline): install it from https://voicevox.hiroshiba.jp and start it before BiggGengo.
2. **Windows' Japanese voice**: Settings → Time & language → Language & region → add 日本語 with *Text-to-speech*.
3. **Azure online voices**: add a free Azure Speech key in Settings.

## For developers

```
npm install
npm start          # run the app
npm test           # tests
npm run dist       # build dist/BiggGengo-Setup-x.y.z.exe
```

If `npm install` skips Electron's install script, run `node node_modules/electron/install.js` once. To try the screens in a browser, run `node scripts/serve.js` and open http://localhost:5173/renderer/index.html.

Your data is saved in `%APPDATA%\BiggGengo\data.json`, with one backup per day beside it. Where the dictionary, sentences, maps and flags come from is in [data/README.md](data/README.md).

### Importing words from Claude

```json
{"words":[{"ja":"約束","reading":"やくそく","en":"promise","pos":"noun","example":"約束を守ります。","lesson":"Lesson 12"}],
 "lessons":[{"title":"Lesson 13","due":"2026-10-20"}]}
```

Or one word per line: `食べる（たべる）= to eat | 毎日ご飯を食べます。`
