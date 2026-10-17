// Reference content that is not in content.js: the Grammar cheat sheets and what Bigg says. (Starter words, phrases and proverbs are in content.js.)

// Cheat sheets for the Grammar page. Japanese examples in <i>italics</i> have their meaning after an equals sign.
const GRAMMAR = [
  { t: 'Three scripts: hiragana, katakana, kanji', b: [
    '<b>Hiragana</b> (ひらがな) writes native words and endings: <i>たべます</i>. <b>Katakana</b> (カタカナ) writes foreign words and names: <i>コーヒー</i> = coffee, <i>アメリカ</i> = America. <b>Kanji</b> (漢字) are Chinese characters for the core of a word: <i>食べます</i>.',
    'A kanji word has the kanji for its meaning and hiragana for its ending (<i>okurigana</i>): 食<u>べる</u>, 大<u>きい</u>. Learn the reading together with the word.',
    'Use the <b>Kana</b> page to learn the 46 basic hiragana and katakana first. Everything else builds on them.' ] },
  { t: 'Sentence order: the verb comes last', b: [
    'Japanese is subject – object – verb. English: "I eat sushi." Japanese: <i>私は寿司を食べます。</i> = "I sushi eat."',
    'Particles come <b>after</b> the word they mark, and the verb ends the sentence: <i>友達と 駅で 会います。</i> = I meet a friend at the station.',
    'The subject (or any known thing) is often left out when it is clear: <i>寿司を食べます。</i> can mean "I eat sushi".' ] },
  { t: 'です and questions with か', b: [
    '<b>です</b> is a polite "is / am / are": <i>私は学生です。</i> = I am a student.',
    'Make a question by adding <b>か</b> at the end (no change in word order): <i>学生ですか。</i> = Are you a student?',
    'Negative: <i>学生ではありません</i> (or <i>じゃありません</i>). Past: <i>学生でした</i>. Past negative: <i>学生ではありませんでした</i>.' ] },
  { t: 'Particles: は, が, を', b: [
    '<b>は</b> (read "wa") marks the <b>topic</b>, what the sentence is about: <i>私は学生です。</i>',
    '<b>が</b> marks the <b>subject</b>, often new information or after question words: <i>誰が来ましたか。</i> = Who came? Also with 好き, 分かる, できる, ある, いる: <i>犬が好きです。</i>',
    '<b>を</b> (read "o") marks the <b>direct object</b>: <i>水を飲みます。</i> = I drink water.' ] },
  { t: 'Particles: に, で, へ, と, も, の, から, まで', b: [
    '<b>に</b>: a point in time or the target: <i>七時に起きます。</i> · <i>学校に行きます。</i> · where something exists: <i>部屋に猫がいます。</i>',
    '<b>で</b>: where an action happens, or the means: <i>図書館で勉強します。</i> · <i>電車で行きます。</i>',
    '<b>へ</b> (read "e"): direction, like に for going: <i>日本へ行きます。</i> · <b>と</b>: with / and: <i>友達と食べます。</i> · <b>も</b>: also: <i>私も行きます。</i>',
    '<b>の</b>: of / \'s: <i>私の本</i> = my book. · <b>から</b> / <b>まで</b>: from / until: <i>九時から五時まで働きます。</i>' ] },
  { t: 'Verbs: three groups and the ます-form', b: [
    '<b>Ichidan</b> (る-verbs): the dictionary form ends in -iru or -eru, drop る: <i>食べる → 食べます</i>, <i>見る → 見ます</i>.',
    '<b>Godan</b> (う-verbs): the last kana changes along the い-row: <i>書く → 書きます</i>, <i>飲む → 飲みます</i>, <i>話す → 話します</i>. (Some -iru/-eru verbs are godan too: 帰る → 帰ります.)',
    '<b>Irregular</b>: <i>する → します</i>, <i>来る (くる) → 来ます (きます)</i>.',
    'Polite forms: <i>〜ます</i> (present/future), <i>〜ません</i> (negative), <i>〜ました</i> (past), <i>〜ませんでした</i> (past negative).' ] },
  { t: 'The て-form', b: [
    '<b>Ichidan</b>: drop る, add て: 食べる → 食べ<u>て</u>. <b>する</b> → して. <b>来る</b> → 来て.',
    '<b>Godan</b> by the last kana: う・つ・る → <u>って</u> (買う → 買って) · む・ぶ・ぬ → <u>んで</u> (飲む → 飲んで) · く → <u>いて</u> (書く → 書いて) · ぐ → <u>いで</u> (泳ぐ → 泳いで) · す → <u>して</u> (話す → 話して). Exception: 行く → 行って.',
    'Uses: <i>〜てください</i> = please do (<i>見てください</i>) · <i>〜ています</i> = is doing / has been done (<i>食べています</i>) · <i>〜てもいいです</i> = may (<i>座ってもいいですか</i>) · <i>〜てから</i> = after doing.' ] },
  { t: 'Plain form, negative and past', b: [
    '<b>Plain (dictionary) form</b> is what you find in the dictionary: <i>食べる, 飲む, 行く</i>. It is used with friends, in writing and inside longer sentences.',
    '<b>Negative (ない)</b>: ichidan drop る + ない (食べない); godan: last kana to the あ-row + ない (書かない, 飲まない; 買う → 買わない); する → しない; 来る → 来ない; ある → ない.',
    '<b>Past (た)</b> is the て-form with た (or だ for で): 食べた, 飲んだ, 書いた, 行った.',
    'Polite vs plain: <i>食べます / 食べません / 食べました</i> ↔ <i>食べる / 食べない / 食べた</i>.' ] },
  { t: 'い-adjectives and な-adjectives', b: [
    '<b>い-adjectives</b> end in い and conjugate themselves: <i>大きい → 大きくない → 大きかった → 大きくなかった</i>. Before a noun: <i>大きい家</i>. Polite: <i>大きいです</i>. Exception: <i>いい → よくない, よかった</i>.',
    '<b>な-adjectives</b> (静か, きれい, 好き) take <i>な</i> before a noun (<i>静かな町</i>) and use です / ではありません / でした like nouns.',
    'Adverbs: い-adjective <i>〜く</i> (早く = early, quickly), な-adjective <i>〜に</i> (静かに = quietly).',
    'Beware: きれい and 嫌い end in い but are な-adjectives.' ] },
  { t: 'Liking, wanting, being able', b: [
    '<b>好き / 嫌い</b> use が: <i>寿司が好きです。</i> · <b>上手 / 下手</b> too: <i>日本語が上手です。</i>',
    '<b>〜たい</b> = want to (verb ます-stem + たい): <i>食べたいです。</i> = I want to eat. It conjugates like an い-adjective: <i>食べたくない</i>.',
    '<b>〜がほしい</b> = want (a thing): <i>新しい車がほしいです。</i>',
    '<b>Can do</b>: <i>〜ことができる</i> (<i>泳ぐことができます</i>) or the potential form: ichidan <i>食べられる</i>, godan <i>書ける</i>, する → <i>できる</i>.' ] },
  { t: 'Existence: ある and いる', b: [
    '<b>ある</b> for things and plants, <b>いる</b> for people and animals: <i>机の上に本があります。</i> · <i>部屋に猫がいます。</i>',
    'The place takes <b>に</b>: <i>駅の前に銀行があります。</i> Position words with の: 上 (on), 下 (under), 前 (front), 後ろ (behind), 中 (inside), 横 (beside).',
    'To say you have something: <i>私には兄がいます。</i> (I have an older brother.) or <i>お金がありません。</i>' ] },
  { t: 'Numbers, time and counters', b: [
    '1–10: 一 いち, 二 に, 三 さん, 四 し/よん, 五 ご, 六 ろく, 七 しち/なな, 八 はち, 九 きゅう/く, 十 じゅう. Hundreds: 百 ひゃく, thousands: 千 せん, ten thousands: 万 まん.',
    'Time: <i>三時</i> (さんじ) · <i>四時</i> (よじ) · <i>九時</i> (くじ) · minutes: <i>五分</i> (ごふん), <i>十分</i> (じゅっぷん) · half: <i>半</i> (はん). Use に for a point in time: <i>七時に起きます。</i>',
    'Counters change with what you count: <i>人</i> for people (一人 ひとり, 二人 ふたり, 三人 さんにん), <i>つ</i> for general things (一つ, 二つ, 三つ), <i>枚</i> flat things, <i>本</i> long things, <i>冊</i> books.' ] },
  { t: 'Connecting sentences', b: [
    '<b>から</b> = because (after the reason): <i>忙しいですから、行けません。</i> · <b>ので</b> is softer: <i>雨なので、行きません。</i>',
    '<b>が / けど</b> = but: <i>高いですが、美味しいです。</i> · <b>でも</b> = however (starts a sentence). <b>そして</b> = and then. <b>それから</b> = after that.',
    '<b>〜とき</b> = when: <i>日本に行くとき、</i> · <b>〜たら</b> = if / when: <i>雨が降ったら、行きません。</i> · <b>〜ながら</b> = while doing: <i>音楽を聞きながら勉強します。</i>' ] },
  { t: 'Polite and plain speech', b: [
    'There are two everyday levels: <b>polite (です / ます)</b> for strangers, shops, work and teachers, and <b>plain (だ / dictionary form)</b> for close friends and family.',
    'Polite words for others: <i>お名前</i>, <i>お仕事</i>, <i>ご家族</i>: the prefix お/ご shows respect. Never add it to your own things.',
    'Useful fixed phrases: <i>すみません</i> (excuse me / sorry / thanks), <i>お願いします</i> (please, I request), <i>ありがとうございます</i>, <i>失礼します</i>.',
    'Keigo (honorific and humble forms) comes later. At first, a clear です / ます is always safe.' ] },
];

// Bigg's lines. He is Varken's little brother: sweet, cheery, always kind. {n} = number, {s} = streak, {t} = title
const PIG = {
  welcome: ["こんにちは! I am Bigg, Varken's little brother! Let us learn Japanese together! 🌸", 'ようこそ! Add a few words and we can start. I am so excited! ✨', 'こんにちは! Add a few words and I will help you remember them. 🌱', 'A fresh start! Let us collect some Japanese words together. ✨'],
  due: ['{n} cards are ready, and I think you are going to do wonderfully! 💗', 'Yay, {n} cards! Just a few minutes is perfect. 🌸', 'Every card you review makes my little plant grow. {n} to go! 🌱', 'I saved {n} cards for you. We can do this together! ✨', '{n} cards are waiting for you. Shall we? 🌸', 'がんばろう! {n} cards to go! 🎌'],
  nothingDue: ['All caught up! You are amazing. Maybe a little listening for fun? 🎧', 'Nothing due right now. How about a worksheet? Or a rest, you earned it! 💗', 'You are all done for now. I am so proud of you! 🌸', 'Nothing is due, so everything from here on is a bonus! ✨', 'すごい! All clear. 🌟'],
  goal: ['You reached your goal! I am doing a happy wiggle! 🎉', 'よくできました! That is today done, and anything extra is a lovely bonus. 💗', 'Wheee! Daily goal complete! Varken will be so proud of you! ✨', 'Daily goal done! You can stop now, or keep going for fun. 🌟', 'やった! Goal reached. ⭐'],
  level: ['You are level {n}! Look how far you have come! 🌟', '{x} XP to level {m}. You can do it! 💗', 'Level {n} already? I am so proud of you! ✨', 'My plant is blooming because of you, level {n}! 🌼', 'Level {n} looks good on you! 🌟', 'Only {x} XP until level {m}! Almost there! 🚀'],
  night: ['It is late. おやすみなさい, we will learn more tomorrow! 🌙', 'Zzz.. you did lovely today. Sleep well! 💤', 'おやすみ! The words will still be here tomorrow. 🌙', 'Late-night learning? Wonderful, but sleep helps memory too! 💤', 'Shh, the stars are out. Maybe one more card, then bed? ⭐'],
  right: ['よくできました!', 'せいかい! 🌸', 'Yay, you got it!', 'すごい!', 'Wonderful!', 'Super!', 'いいね!', 'そうです!', 'Nailed it!', 'Top! ✨', 'ばっちり!', 'その通り!'],
  close: ['So close! You almost had it! 💗', 'Nearly perfect, just a tiny slip!', 'おしい! Great try!', 'Just one little slip, you know it! 🌸', 'So near! Check the kana once more.', 'もう少し! Almost there!'],
  wrong: ['That is okay, every try helps you remember! 💗', 'No worries! Now it will stick even better. 🌸', 'You are learning, and that is what counts!', 'だいじょうぶ! We will see it again soon.', 'おっと! That is how we learn. 🌱', 'A little slip, no problem! 🌸', 'It will click soon, I promise! 💗'],
  poke: ['Hehe, that tickles! 💗', 'Oink-oink! やあ!', 'Varken says hi from the other room!', 'You are doing so well!', 'Bigg believes in you! 🌸', 'Yay yay yay!', '日本語、上手ですね! You are great at it! ✨', 'Big hug! 🤗', 'Oink! That was my favourite spot. 🐽', 'You found me! 🐷'],
};

// Extra things Bigg says on Today: by time of day, weekend, Monday, little Japanese tips and facts, the Kana page, and by name once you have given yours.
PIG.morning = ['おはよう! A few cards with your tea? 🍵', 'Good morning! Fresh brain, perfect time for new words. 🌅', 'おはようございます! The day is young. 🌸'];
PIG.afternoon = ['こんにちは! Time for a little Japanese break? 🌿', 'Good afternoon! A few cards will wake you right up. ✨', 'Afternoon slump? A quick quiz helps! ☀️'];
PIG.evening = ['こんばんは! A calm round of cards before dinner? 🍙', 'Good evening! Let us wrap up the day with some Japanese. 🌆', 'こんばんは! Your words are ready for you. 🌙'];
PIG.weekend = ['Happy weekend! No pressure, just a little fun with Japanese. 🌈', 'It is the weekend! Even five minutes counts. 🌸', 'Weekend mode: relaxed learning only! 🛋️'];
PIG.monday = ['月曜日! A fresh week, a fresh start. 🌱', 'Monday! Your weekly recap is waiting on this page. 📅'];
PIG.tips = ['Tip: say new words out loud. Press the speaker and copy me! 🔊', 'Tip: learn a kanji word together with its reading, like 食べる (たべる). 🏷️', 'Tip: Japanese puts the verb last: "毎日ご飯を食べます" = "every day rice eat". 🍚',
  'Fun fact: は is read "wa" when it is a particle, and を is read "o". 🙈', 'Fun fact: Japanese has no plural and no articles. One less thing to learn! 🎉', 'Fun fact: about 125 million people speak Japanese. 🌍',
  'Tip: little and often beats long and rarely. Five minutes a day is great! ⏱️', 'Fun fact: 「いただきます」 is said before every meal, as thanks for the food. 🍙', 'Tip: try Blank-page recall on the Words page to find what you really remember. 📝',
  'Tip: words you miss come back more often. That is the system helping you! 🔁', 'Fun fact: Japanese writing uses three scripts at once. You will get used to it! ✍️', 'Fun fact: there is a word 「木漏れ日」 (komorebi) for sunlight filtering through leaves. 🌿',
  'Tip: type in romaji and I turn it into kana for you. Try it on a flashcard! ⌨️', 'Fun fact: the Japanese eat noodles loudly. Slurping is polite! 🍜'];
PIG.bonus = ['Have you tried the Kana page? Hiragana and katakana, one row at a time! あいうえお 🔤', 'Quick kana quiz? I will go easy on you. 🌸', 'Do you know all of the hiragana? Let us find out! あ〜ん ✨', 'The Phrases tab has everyday sentences with furigana. 📖', 'Try the Verb forms practice: て-form is a classic! 🔧'];
PIG.named = ['やあ {name}! 会えて嬉しい! 🌸', '{name}, you are doing great! ✨', 'がんばってるね, {name}! 🎉', 'Ready when you are, {name}! 🌱', '{name}, I saved you a seat. Let us learn! 🐷'];

// What Bigg says while you go through flashcards. One list per moment (see L.coachMoment).
const COACH = {
  start: ['Here we go! You have got this! 🌸', 'Ready? I will cheer for every card! ✨', 'Let us do this together! 💗', 'Take your time, I am right here! 🌱', 'よろしくお願いします! Let us begin. 🌸', 'Deep breath, and off we go! ✨'],
  right: ['Yay, よくできました! 🌸', 'Wonderful!', 'That one is yours now! ✨', 'Nice one! 💗', 'You remembered it!', 'Look at you go! 🌟', 'そうです!', 'いいね! 🌸', 'ばっちり!', 'You are on a roll! 🎉', 'すごい!'],
  again: ['That is okay, it will come back soon. 💗', 'No worries, we will see it again!', 'Every try helps it stick. 🌱', 'You are doing great, keep going!', 'Mistakes are how it sticks. 🌸', 'おっと, that one is tricky. It will come back! 🌱', 'A good miss! Now it will stay. 🐷', 'だいじょうぶ! 💗'],
  streak3: ['Three in a row! ⭐', 'Three right, you are warming up! 🔥', '三つ続けて! ⭐'],
  streak5: ['Five in a row! You are on fire! 🔥', 'Five! I am doing a spin for you! ✨', '五連続! すごい! 🔥'],
  streak8: ['Eight in a row?! Amazing! 🎉', 'A whole streak! I am so proud of you! 💗'],
  half: ['Halfway there! 🌟', 'Half done, you are flying! ✨', 'Over halfway! がんばれ! 🌟'],
  last: ['Last card! Finish strong! 💪', 'One more and you are done! 🌸', 'あと一つ! 🌸'],
  done: ['All done! I am so proud of you! 🎉', 'おつかれさま! You did so well today! 💗', 'よくできました! Time for a little rest. 🌸', 'That was it! 🌼', 'おつかれさま! Take a sip of tea, you earned it. 🍵'],
};
const DAILY_WORDS = SEED_WORDS.filter((w) => w.pos !== 'other').map((w) => [w.ja, w.en, w.reading]);
