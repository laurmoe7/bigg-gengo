# Word and sentence data

These files power the **Dictionary**, **Suggested** words, **Find examples**, **Real sentences** and the worksheets made from your words.
They are built by `node scripts/build-data.js <folder>` from three free sources (needs `npm install` for kuromoji, which splits sentences into words and adds readings):

| File | Source | Licence |
| --- | --- | --- |
| `dict.js` | [JMdict](https://www.edrdg.org/jmdict/j_jmdict.html) (common words), via [jmdict-simplified](https://github.com/scriptin/jmdict-simplified) (`jmdict-eng-common-*.json`) | EDRDG licence (CC BY-SA 4.0) |
| `freq.js` | [FrequencyWords](https://github.com/hermitdave/FrequencyWords) (Japanese, from OpenSubtitles, `content/2016/ja/ja_50k.txt`), matched to JMdict headwords | CC BY-SA 4.0 |
| `sentences.js` | [Tatoeba](https://tatoeba.org) sentence pairs via [manythings.org/anki](https://www.manythings.org/anki/) (`jpn-eng.zip`). Words and readings added with [kuromoji](https://github.com/takuyaa/kuromoji.js) (Apache 2.0, with the IPAdic dictionary) | CC BY 2.0 FR |

Formats (see the header comment of each file):

- `dict.js`: `[word, type, reading, forms, meanings]`; for verbs `forms` is the JMdict class (`v1`, `v5k`, `v5k-s`, `vs-i`, `vk`...) plus `vt` / `vi`; for adjectives `i`, `ix` (いい) or `na`; `vs` for nouns that take する.
- `freq.js`: `[word, meaning, rank, reading, type]`, rank = place among the common words found in subtitles.
- `sentences.js`: `[japanese, english, words]` where `words` is `surface;reading;dictionaryForm|...` (reading and dictionary form only when they differ from the surface).

The frequency list comes from subtitles and is matched by spelling, so it is a rough guide (some very common kana words that JMdict writes with kanji are missing, and a few single kanji appear as nouns). JMdict meanings are shortened for flashcards, so give them a quick check.
