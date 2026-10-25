// Bonus Lessons data: the countries of the world in Japanese (names, capitals, flags), the 47 prefectures of Japan, and its seas, mountains and islands.
// Flags are image files, not flag emoji, because Windows shows flag emoji as two letters.
// Loads in the browser (globals) and in node (module.exports) so the data can be tested.
// Every name has its reading in hiragana when it has kanji (rd, capRd), so it gets furigana, follows Settings → Show Japanese as, and can be typed in kana or romaji.
(function (root) {
const J = root.J || (typeof require !== 'undefined' ? require('./japanese.js') : null);

// Flags are the SVG files in renderer/flags (flag-icons, MIT licence; see flags/LICENSE.txt).
const flagImg = (id, cls) => `<img class="flag${cls ? ' ' + cls : ''}" src="flags/${id}.svg" alt="" draggable="false">`;

// [iso code, Japanese name, its reading if it has kanji, English, capital, its reading, capital in English, region, { name: [other names], cap: [...] }]
const mk = (rows, cont) => rows.map(([id, name, rd, en, cap, capRd, capEn, region, alt]) => ({ id, name, rd: rd || '', en, cap, capRd: capRd || '', capEn: capEn || en, region, cont, nameAlt: (alt && alt.name) || [], capAlt: (alt && alt.cap) || [], flag: (cls) => flagImg(id, cls) }));

const EUROPE_REGIONS = [['west', 'West'], ['north', 'North'], ['central', 'Central'], ['south', 'South & Balkans'], ['east', 'East']];
const EUROPE = mk([
  ['nl', 'オランダ', '', 'the Netherlands', 'アムステルダム', '', 'Amsterdam', 'west'], ['be', 'ベルギー', '', 'Belgium', 'ブリュッセル', '', 'Brussels', 'west'],
  ['lu', 'ルクセンブルク', '', 'Luxembourg', 'ルクセンブルク', '', 'Luxembourg', 'west'], ['fr', 'フランス', '', 'France', 'パリ', '', 'Paris', 'west'],
  ['gb', 'イギリス', '', 'United Kingdom', 'ロンドン', '', 'London', 'west', { name: ['英国', 'えいこく'] }], ['ie', 'アイルランド', '', 'Ireland', 'ダブリン', '', 'Dublin', 'west'],
  ['mc', 'モナコ', '', 'Monaco', 'モナコ', '', 'Monaco', 'west'],
  ['dk', 'デンマーク', '', 'Denmark', 'コペンハーゲン', '', 'Copenhagen', 'north'], ['se', 'スウェーデン', '', 'Sweden', 'ストックホルム', '', 'Stockholm', 'north'],
  ['no', 'ノルウェー', '', 'Norway', 'オスロ', '', 'Oslo', 'north'], ['fi', 'フィンランド', '', 'Finland', 'ヘルシンキ', '', 'Helsinki', 'north'],
  ['is', 'アイスランド', '', 'Iceland', 'レイキャビク', '', 'Reykjavik', 'north'], ['ee', 'エストニア', '', 'Estonia', 'タリン', '', 'Tallinn', 'north'],
  ['lv', 'ラトビア', '', 'Latvia', 'リガ', '', 'Riga', 'north'], ['lt', 'リトアニア', '', 'Lithuania', 'ビリニュス', '', 'Vilnius', 'north', { cap: ['ヴィリニュス'] }],
  ['de', 'ドイツ', '', 'Germany', 'ベルリン', '', 'Berlin', 'central'], ['ch', 'スイス', '', 'Switzerland', 'ベルン', '', 'Bern', 'central'],
  ['at', 'オーストリア', '', 'Austria', 'ウィーン', '', 'Vienna', 'central'], ['li', 'リヒテンシュタイン', '', 'Liechtenstein', 'ファドゥーツ', '', 'Vaduz', 'central'],
  ['pl', 'ポーランド', '', 'Poland', 'ワルシャワ', '', 'Warsaw', 'central'], ['cz', 'チェコ', '', 'Czechia', 'プラハ', '', 'Prague', 'central'],
  ['sk', 'スロバキア', '', 'Slovakia', 'ブラチスラバ', '', 'Bratislava', 'central'], ['hu', 'ハンガリー', '', 'Hungary', 'ブダペスト', '', 'Budapest', 'central'],
  ['si', 'スロベニア', '', 'Slovenia', 'リュブリャナ', '', 'Ljubljana', 'central'],
  ['es', 'スペイン', '', 'Spain', 'マドリード', '', 'Madrid', 'south'], ['pt', 'ポルトガル', '', 'Portugal', 'リスボン', '', 'Lisbon', 'south'],
  ['it', 'イタリア', '', 'Italy', 'ローマ', '', 'Rome', 'south'], ['mt', 'マルタ', '', 'Malta', 'バレッタ', '', 'Valletta', 'south'],
  ['gr', 'ギリシャ', '', 'Greece', 'アテネ', '', 'Athens', 'south'], ['cy', 'キプロス', '', 'Cyprus', 'ニコシア', '', 'Nicosia', 'south'],
  ['ad', 'アンドラ', '', 'Andorra', 'アンドララベリャ', '', 'Andorra la Vella', 'south'], ['sm', 'サンマリノ', '', 'San Marino', 'サンマリノ', '', 'San Marino', 'south'],
  ['va', 'バチカン', '', 'Vatican City', 'バチカン', '', 'Vatican City', 'south'], ['hr', 'クロアチア', '', 'Croatia', 'ザグレブ', '', 'Zagreb', 'south'],
  ['ba', 'ボスニア・ヘルツェゴビナ', '', 'Bosnia and Herzegovina', 'サラエボ', '', 'Sarajevo', 'south', { name: ['ボスニア'] }], ['rs', 'セルビア', '', 'Serbia', 'ベオグラード', '', 'Belgrade', 'south'],
  ['me', 'モンテネグロ', '', 'Montenegro', 'ポドゴリツァ', '', 'Podgorica', 'south'], ['mk', '北マケドニア', 'きたマケドニア', 'North Macedonia', 'スコピエ', '', 'Skopje', 'south', { name: ['マケドニア'] }],
  ['al', 'アルバニア', '', 'Albania', 'ティラナ', '', 'Tirana', 'south'],
  ['bg', 'ブルガリア', '', 'Bulgaria', 'ソフィア', '', 'Sofia', 'east'], ['ro', 'ルーマニア', '', 'Romania', 'ブカレスト', '', 'Bucharest', 'east'],
  ['md', 'モルドバ', '', 'Moldova', 'キシナウ', '', 'Chisinau', 'east'], ['ua', 'ウクライナ', '', 'Ukraine', 'キーウ', '', 'Kyiv', 'east', { cap: ['キエフ'] }],
  ['by', 'ベラルーシ', '', 'Belarus', 'ミンスク', '', 'Minsk', 'east'], ['ru', 'ロシア', '', 'Russia', 'モスクワ', '', 'Moscow', 'east'],
], 'europe');

const ASIA_REGIONS = [['mideast', 'Middle East'], ['central', 'Central Asia'], ['south', 'South Asia'], ['east', 'East Asia'], ['se', 'Southeast Asia']];
const ASIA = mk([
  ['tr', 'トルコ', '', 'Turkey', 'アンカラ', '', 'Ankara', 'mideast'], ['ge', 'ジョージア', '', 'Georgia', 'トビリシ', '', 'Tbilisi', 'mideast', { name: ['グルジア'] }],
  ['am', 'アルメニア', '', 'Armenia', 'エレバン', '', 'Yerevan', 'mideast'], ['az', 'アゼルバイジャン', '', 'Azerbaijan', 'バクー', '', 'Baku', 'mideast'],
  ['sy', 'シリア', '', 'Syria', 'ダマスカス', '', 'Damascus', 'mideast'], ['lb', 'レバノン', '', 'Lebanon', 'ベイルート', '', 'Beirut', 'mideast'],
  ['il', 'イスラエル', '', 'Israel', 'エルサレム', '', 'Jerusalem', 'mideast'], ['jo', 'ヨルダン', '', 'Jordan', 'アンマン', '', 'Amman', 'mideast'],
  ['iq', 'イラク', '', 'Iraq', 'バグダッド', '', 'Baghdad', 'mideast'], ['ir', 'イラン', '', 'Iran', 'テヘラン', '', 'Tehran', 'mideast'],
  ['sa', 'サウジアラビア', '', 'Saudi Arabia', 'リヤド', '', 'Riyadh', 'mideast'], ['ye', 'イエメン', '', 'Yemen', 'サヌア', '', 'Sanaa', 'mideast'],
  ['om', 'オマーン', '', 'Oman', 'マスカット', '', 'Muscat', 'mideast'], ['ae', 'アラブ首長国連邦', 'アラブしゅちょうこくれんぽう', 'United Arab Emirates', 'アブダビ', '', 'Abu Dhabi', 'mideast', { name: ['UAE'] }],
  ['qa', 'カタール', '', 'Qatar', 'ドーハ', '', 'Doha', 'mideast'], ['kw', 'クウェート', '', 'Kuwait', 'クウェート', '', 'Kuwait City', 'mideast'],
  ['bh', 'バーレーン', '', 'Bahrain', 'マナーマ', '', 'Manama', 'mideast'],
  ['kz', 'カザフスタン', '', 'Kazakhstan', 'アスタナ', '', 'Astana', 'central'], ['uz', 'ウズベキスタン', '', 'Uzbekistan', 'タシケント', '', 'Tashkent', 'central'],
  ['tm', 'トルクメニスタン', '', 'Turkmenistan', 'アシガバット', '', 'Ashgabat', 'central'], ['kg', 'キルギス', '', 'Kyrgyzstan', 'ビシュケク', '', 'Bishkek', 'central'],
  ['tj', 'タジキスタン', '', 'Tajikistan', 'ドゥシャンベ', '', 'Dushanbe', 'central'], ['af', 'アフガニスタン', '', 'Afghanistan', 'カブール', '', 'Kabul', 'central'],
  ['pk', 'パキスタン', '', 'Pakistan', 'イスラマバード', '', 'Islamabad', 'south'], ['in', 'インド', '', 'India', 'ニューデリー', '', 'New Delhi', 'south', { cap: ['デリー'] }],
  ['np', 'ネパール', '', 'Nepal', 'カトマンズ', '', 'Kathmandu', 'south'], ['bt', 'ブータン', '', 'Bhutan', 'ティンプー', '', 'Thimphu', 'south'],
  ['bd', 'バングラデシュ', '', 'Bangladesh', 'ダッカ', '', 'Dhaka', 'south'], ['lk', 'スリランカ', '', 'Sri Lanka', 'コロンボ', '', 'Colombo', 'south', { cap: ['スリジャヤワルダナプラコッテ'] }],
  ['mv', 'モルディブ', '', 'Maldives', 'マレ', '', 'Malé', 'south'],
  ['cn', '中国', 'ちゅうごく', 'China', '北京', 'ぺきん', 'Beijing', 'east'], ['mn', 'モンゴル', '', 'Mongolia', 'ウランバートル', '', 'Ulaanbaatar', 'east'],
  ['kp', '北朝鮮', 'きたちょうせん', 'North Korea', '平壌', 'ぴょんやん', 'Pyongyang', 'east'], ['kr', '韓国', 'かんこく', 'South Korea', 'ソウル', '', 'Seoul', 'east'],
  ['jp', '日本', 'にほん', 'Japan', '東京', 'とうきょう', 'Tokyo', 'east', { name: ['にっぽん'] }], ['tw', '台湾', 'たいわん', 'Taiwan', '台北', 'たいぺい', 'Taipei', 'east'],
  ['mm', 'ミャンマー', '', 'Myanmar', 'ネピドー', '', 'Naypyidaw', 'se', { name: ['ビルマ'] }], ['th', 'タイ', '', 'Thailand', 'バンコク', '', 'Bangkok', 'se'],
  ['la', 'ラオス', '', 'Laos', 'ビエンチャン', '', 'Vientiane', 'se'], ['kh', 'カンボジア', '', 'Cambodia', 'プノンペン', '', 'Phnom Penh', 'se'],
  ['vn', 'ベトナム', '', 'Vietnam', 'ハノイ', '', 'Hanoi', 'se'], ['my', 'マレーシア', '', 'Malaysia', 'クアラルンプール', '', 'Kuala Lumpur', 'se'],
  ['sg', 'シンガポール', '', 'Singapore', 'シンガポール', '', 'Singapore', 'se'], ['id', 'インドネシア', '', 'Indonesia', 'ジャカルタ', '', 'Jakarta', 'se'],
  ['bn', 'ブルネイ', '', 'Brunei', 'バンダルスリブガワン', '', 'Bandar Seri Begawan', 'se'], ['ph', 'フィリピン', '', 'Philippines', 'マニラ', '', 'Manila', 'se'],
  ['tl', '東ティモール', 'ひがしティモール', 'East Timor', 'ディリ', '', 'Dili', 'se'],
], 'asia');

const AFRICA_REGIONS = [['north', 'North'], ['west', 'West'], ['central', 'Central'], ['east', 'East'], ['south', 'Southern']];
const AFRICA = mk([
  ['ma', 'モロッコ', '', 'Morocco', 'ラバト', '', 'Rabat', 'north'], ['dz', 'アルジェリア', '', 'Algeria', 'アルジェ', '', 'Algiers', 'north'],
  ['tn', 'チュニジア', '', 'Tunisia', 'チュニス', '', 'Tunis', 'north'], ['ly', 'リビア', '', 'Libya', 'トリポリ', '', 'Tripoli', 'north'],
  ['eg', 'エジプト', '', 'Egypt', 'カイロ', '', 'Cairo', 'north'],
  ['mr', 'モーリタニア', '', 'Mauritania', 'ヌアクショット', '', 'Nouakchott', 'west'], ['sn', 'セネガル', '', 'Senegal', 'ダカール', '', 'Dakar', 'west'],
  ['gm', 'ガンビア', '', 'The Gambia', 'バンジュール', '', 'Banjul', 'west'], ['gw', 'ギニアビサウ', '', 'Guinea-Bissau', 'ビサウ', '', 'Bissau', 'west'],
  ['gn', 'ギニア', '', 'Guinea', 'コナクリ', '', 'Conakry', 'west'], ['sl', 'シエラレオネ', '', 'Sierra Leone', 'フリータウン', '', 'Freetown', 'west'],
  ['lr', 'リベリア', '', 'Liberia', 'モンロビア', '', 'Monrovia', 'west'], ['ci', 'コートジボワール', '', 'Ivory Coast', 'ヤムスクロ', '', 'Yamoussoukro', 'west'],
  ['gh', 'ガーナ', '', 'Ghana', 'アクラ', '', 'Accra', 'west'], ['tg', 'トーゴ', '', 'Togo', 'ロメ', '', 'Lomé', 'west'],
  ['bj', 'ベナン', '', 'Benin', 'ポルトノボ', '', 'Porto-Novo', 'west'], ['ng', 'ナイジェリア', '', 'Nigeria', 'アブジャ', '', 'Abuja', 'west'],
  ['ml', 'マリ', '', 'Mali', 'バマコ', '', 'Bamako', 'west'], ['bf', 'ブルキナファソ', '', 'Burkina Faso', 'ワガドゥグー', '', 'Ouagadougou', 'west'],
  ['ne', 'ニジェール', '', 'Niger', 'ニアメ', '', 'Niamey', 'west'], ['cv', 'カーボベルデ', '', 'Cape Verde', 'プライア', '', 'Praia', 'west'],
  ['td', 'チャド', '', 'Chad', 'ンジャメナ', '', "N'Djamena", 'central'], ['cm', 'カメルーン', '', 'Cameroon', 'ヤウンデ', '', 'Yaoundé', 'central'],
  ['cf', '中央アフリカ', 'ちゅうおうアフリカ', 'Central African Republic', 'バンギ', '', 'Bangui', 'central'], ['gq', '赤道ギニア', 'せきどうギニア', 'Equatorial Guinea', 'マラボ', '', 'Malabo', 'central'],
  ['ga', 'ガボン', '', 'Gabon', 'リーブルビル', '', 'Libreville', 'central'], ['cg', 'コンゴ共和国', 'コンゴきょうわこく', 'Republic of the Congo', 'ブラザビル', '', 'Brazzaville', 'central'],
  ['cd', 'コンゴ民主共和国', 'コンゴみんしゅきょうわこく', 'DR Congo', 'キンシャサ', '', 'Kinshasa', 'central'], ['st', 'サントメ・プリンシペ', '', 'São Tomé and Príncipe', 'サントメ', '', 'São Tomé', 'central'],
  ['ao', 'アンゴラ', '', 'Angola', 'ルアンダ', '', 'Luanda', 'central'],
  ['sd', 'スーダン', '', 'Sudan', 'ハルツーム', '', 'Khartoum', 'east'], ['ss', '南スーダン', 'みなみスーダン', 'South Sudan', 'ジュバ', '', 'Juba', 'east'],
  ['er', 'エリトリア', '', 'Eritrea', 'アスマラ', '', 'Asmara', 'east'], ['dj', 'ジブチ', '', 'Djibouti', 'ジブチ', '', 'Djibouti', 'east'],
  ['et', 'エチオピア', '', 'Ethiopia', 'アディスアベバ', '', 'Addis Ababa', 'east'], ['so', 'ソマリア', '', 'Somalia', 'モガディシュ', '', 'Mogadishu', 'east'],
  ['ke', 'ケニア', '', 'Kenya', 'ナイロビ', '', 'Nairobi', 'east'], ['ug', 'ウガンダ', '', 'Uganda', 'カンパラ', '', 'Kampala', 'east'],
  ['rw', 'ルワンダ', '', 'Rwanda', 'キガリ', '', 'Kigali', 'east'], ['bi', 'ブルンジ', '', 'Burundi', 'ギテガ', '', 'Gitega', 'east'],
  ['tz', 'タンザニア', '', 'Tanzania', 'ドドマ', '', 'Dodoma', 'east'],
  ['zm', 'ザンビア', '', 'Zambia', 'ルサカ', '', 'Lusaka', 'south'], ['mw', 'マラウイ', '', 'Malawi', 'リロングウェ', '', 'Lilongwe', 'south'],
  ['mz', 'モザンビーク', '', 'Mozambique', 'マプト', '', 'Maputo', 'south'], ['zw', 'ジンバブエ', '', 'Zimbabwe', 'ハラレ', '', 'Harare', 'south'],
  ['na', 'ナミビア', '', 'Namibia', 'ウィントフック', '', 'Windhoek', 'south'], ['bw', 'ボツワナ', '', 'Botswana', 'ハボロネ', '', 'Gaborone', 'south'],
  ['za', '南アフリカ', 'みなみアフリカ', 'South Africa', 'プレトリア', '', 'Pretoria', 'south', { cap: ['ケープタウン', 'ブルームフォンテーン'] }], ['ls', 'レソト', '', 'Lesotho', 'マセル', '', 'Maseru', 'south'],
  ['sz', 'エスワティニ', '', 'Eswatini', 'ムババーネ', '', 'Mbabane', 'south'], ['mg', 'マダガスカル', '', 'Madagascar', 'アンタナナリボ', '', 'Antananarivo', 'south'],
  ['mu', 'モーリシャス', '', 'Mauritius', 'ポートルイス', '', 'Port Louis', 'south'], ['sc', 'セーシェル', '', 'Seychelles', 'ビクトリア', '', 'Victoria', 'south'],
  ['km', 'コモロ', '', 'Comoros', 'モロニ', '', 'Moroni', 'south'],
], 'africa');

const NAMERICA_REGIONS = [['north', 'North'], ['central', 'Central America'], ['carib', 'Caribbean']];
const NAMERICA = mk([
  ['ca', 'カナダ', '', 'Canada', 'オタワ', '', 'Ottawa', 'north'], ['us', 'アメリカ', '', 'United States', 'ワシントンD.C.', '', 'Washington, D.C.', 'north', { name: ['アメリカ合衆国', 'あめりかがっしゅうこく', '米国', 'べいこく'], cap: ['ワシントン'] }],
  ['mx', 'メキシコ', '', 'Mexico', 'メキシコシティ', '', 'Mexico City', 'north'],
  ['gt', 'グアテマラ', '', 'Guatemala', 'グアテマラシティ', '', 'Guatemala City', 'central'], ['bz', 'ベリーズ', '', 'Belize', 'ベルモパン', '', 'Belmopan', 'central'],
  ['sv', 'エルサルバドル', '', 'El Salvador', 'サンサルバドル', '', 'San Salvador', 'central'], ['hn', 'ホンジュラス', '', 'Honduras', 'テグシガルパ', '', 'Tegucigalpa', 'central'],
  ['ni', 'ニカラグア', '', 'Nicaragua', 'マナグア', '', 'Managua', 'central'], ['cr', 'コスタリカ', '', 'Costa Rica', 'サンホセ', '', 'San José', 'central'],
  ['pa', 'パナマ', '', 'Panama', 'パナマシティ', '', 'Panama City', 'central'],
  ['cu', 'キューバ', '', 'Cuba', 'ハバナ', '', 'Havana', 'carib'], ['jm', 'ジャマイカ', '', 'Jamaica', 'キングストン', '', 'Kingston', 'carib'],
  ['ht', 'ハイチ', '', 'Haiti', 'ポルトープランス', '', 'Port-au-Prince', 'carib'], ['do', 'ドミニカ共和国', 'ドミニカきょうわこく', 'Dominican Republic', 'サントドミンゴ', '', 'Santo Domingo', 'carib'],
  ['bs', 'バハマ', '', 'The Bahamas', 'ナッソー', '', 'Nassau', 'carib'], ['tt', 'トリニダード・トバゴ', '', 'Trinidad and Tobago', 'ポートオブスペイン', '', 'Port of Spain', 'carib'],
  ['bb', 'バルバドス', '', 'Barbados', 'ブリッジタウン', '', 'Bridgetown', 'carib'], ['gd', 'グレナダ', '', 'Grenada', 'セントジョージズ', '', "Saint George's", 'carib'],
  ['lc', 'セントルシア', '', 'Saint Lucia', 'カストリーズ', '', 'Castries', 'carib'], ['vc', 'セントビンセント・グレナディーン', '', 'Saint Vincent and the Grenadines', 'キングスタウン', '', 'Kingstown', 'carib', { name: ['セントビンセント'] }],
  ['ag', 'アンティグア・バーブーダ', '', 'Antigua and Barbuda', 'セントジョンズ', '', "Saint John's", 'carib'], ['kn', 'セントクリストファー・ネービス', '', 'Saint Kitts and Nevis', 'バセテール', '', 'Basseterre', 'carib'],
  ['dm', 'ドミニカ国', 'ドミニカこく', 'Dominica', 'ロゾー', '', 'Roseau', 'carib'],
], 'namerica');
const SAMERICA = mk([
  ['co', 'コロンビア', '', 'Colombia', 'ボゴタ', '', 'Bogotá', 'sa'], ['ve', 'ベネズエラ', '', 'Venezuela', 'カラカス', '', 'Caracas', 'sa'],
  ['gy', 'ガイアナ', '', 'Guyana', 'ジョージタウン', '', 'Georgetown', 'sa'], ['sr', 'スリナム', '', 'Suriname', 'パラマリボ', '', 'Paramaribo', 'sa'],
  ['br', 'ブラジル', '', 'Brazil', 'ブラジリア', '', 'Brasília', 'sa'], ['ec', 'エクアドル', '', 'Ecuador', 'キト', '', 'Quito', 'sa'],
  ['pe', 'ペルー', '', 'Peru', 'リマ', '', 'Lima', 'sa'], ['bo', 'ボリビア', '', 'Bolivia', 'スクレ', '', 'Sucre', 'sa', { cap: ['ラパス'] }],
  ['py', 'パラグアイ', '', 'Paraguay', 'アスンシオン', '', 'Asunción', 'sa'], ['uy', 'ウルグアイ', '', 'Uruguay', 'モンテビデオ', '', 'Montevideo', 'sa'],
  ['ar', 'アルゼンチン', '', 'Argentina', 'ブエノスアイレス', '', 'Buenos Aires', 'sa'], ['cl', 'チリ', '', 'Chile', 'サンティアゴ', '', 'Santiago', 'sa'],
], 'samerica');
const AMERICAS = NAMERICA.concat(SAMERICA);
const AMERICAS_REGIONS = NAMERICA_REGIONS.concat([['sa', 'South America']]);

const OCEANIA_REGIONS = [['anz', 'Australia & New Zealand'], ['mel', 'Melanesia'], ['mic', 'Micronesia'], ['pol', 'Polynesia']];
const OCEANIA = mk([
  ['au', 'オーストラリア', '', 'Australia', 'キャンベラ', '', 'Canberra', 'anz'], ['nz', 'ニュージーランド', '', 'New Zealand', 'ウェリントン', '', 'Wellington', 'anz'],
  ['pg', 'パプアニューギニア', '', 'Papua New Guinea', 'ポートモレスビー', '', 'Port Moresby', 'mel'], ['fj', 'フィジー', '', 'Fiji', 'スバ', '', 'Suva', 'mel'],
  ['sb', 'ソロモン諸島', 'ソロモンしょとう', 'Solomon Islands', 'ホニアラ', '', 'Honiara', 'mel'], ['vu', 'バヌアツ', '', 'Vanuatu', 'ポートビラ', '', 'Port Vila', 'mel'],
  ['pw', 'パラオ', '', 'Palau', 'マルキョク', '', 'Ngerulmud', 'mic', { cap: ['ンゲルルムド'] }], ['fm', 'ミクロネシア', '', 'Micronesia', 'パリキール', '', 'Palikir', 'mic'],
  ['mh', 'マーシャル諸島', 'マーシャルしょとう', 'Marshall Islands', 'マジュロ', '', 'Majuro', 'mic'], ['ki', 'キリバス', '', 'Kiribati', 'タラワ', '', 'Tarawa', 'mic'],
  ['nr', 'ナウル', '', 'Nauru', 'ヤレン', '', 'Yaren', 'mic'],
  ['tv', 'ツバル', '', 'Tuvalu', 'フナフティ', '', 'Funafuti', 'pol'], ['ws', 'サモア', '', 'Samoa', 'アピア', '', 'Apia', 'pol'], ['to', 'トンガ', '', 'Tonga', 'ヌクアロファ', '', "Nuku'alofa", 'pol'],
], 'oceania');

// the whole world as one list, grouped by continent (a copy of each country whose region is its continent)
const WORLD_REGIONS = [['europe', 'Europe'], ['asia', 'Asia'], ['africa', 'Africa'], ['namerica', 'North & Central America'], ['samerica', 'South America'], ['oceania', 'Oceania']];
const WORLD = [EUROPE, ASIA, AFRICA, NAMERICA, SAMERICA, OCEANIA].flatMap((list) => list.map((c) => Object.assign({}, c, { region: c.cont })));

// ---------- Japan ----------
// the 47 prefectures (都道府県): [ISO number, name, reading, English, capital, its reading, capital in English, region, a small fact]
const PREF_REGIONS = [['hokkaido', 'Hokkaidō'], ['tohoku', 'Tōhoku'], ['kanto', 'Kantō'], ['chubu', 'Chūbu'], ['kinki', 'Kinki (Kansai)'], ['chugoku', 'Chūgoku'], ['shikoku', 'Shikoku'], ['kyushu', 'Kyūshū & Okinawa']];
const PREFECTURES = [
  ['01', '北海道', 'ほっかいどう', 'Hokkaidō', '札幌', 'さっぽろ', 'Sapporo', 'hokkaido', 'The biggest and most northern prefecture. Sapporo has a famous snow festival.'],
  ['02', '青森県', 'あおもりけん', 'Aomori', '青森', 'あおもり', 'Aomori', 'tohoku', 'Famous for apples and the giant lanterns of the Nebuta festival.'],
  ['03', '岩手県', 'いわてけん', 'Iwate', '盛岡', 'もりおか', 'Morioka', 'tohoku', 'The second biggest prefecture. Try wanko soba: bowl after bowl of noodles.'],
  ['04', '宮城県', 'みやぎけん', 'Miyagi', '仙台', 'せんだい', 'Sendai', 'tohoku', 'Sendai is the biggest city of Tōhoku, known for grilled beef tongue (gyūtan).'],
  ['05', '秋田県', 'あきたけん', 'Akita', '秋田', 'あきた', 'Akita', 'tohoku', 'Home of the Akita dog and kiritanpo (grilled rice sticks).'],
  ['06', '山形県', 'やまがたけん', 'Yamagata', '山形', 'やまがた', 'Yamagata', 'tohoku', 'Grows most of the cherries (さくらんぼ) in Japan.'],
  ['07', '福島県', 'ふくしまけん', 'Fukushima', '福島', 'ふくしま', 'Fukushima', 'tohoku', 'Peaches, sake, and the old samurai town of Aizu.'],
  ['08', '茨城県', 'いばらきけん', 'Ibaraki', '水戸', 'みと', 'Mito', 'kanto', 'Mito is famous for nattō and the plum trees of Kairaku-en.'],
  ['09', '栃木県', 'とちぎけん', 'Tochigi', '宇都宮', 'うつのみや', 'Utsunomiya', 'kanto', 'The shrines of Nikkō, and Utsunomiya’s gyōza.'],
  ['10', '群馬県', 'ぐんまけん', 'Gunma', '前橋', 'まえばし', 'Maebashi', 'kanto', 'Hot springs like Kusatsu, and the mascot Gunma-chan.'],
  ['11', '埼玉県', 'さいたまけん', 'Saitama', 'さいたま', '', 'Saitama', 'kanto', 'Right next to Tokyo; many people travel to work from here. Its capital is written in hiragana.'],
  ['12', '千葉県', 'ちばけん', 'Chiba', '千葉', 'ちば', 'Chiba', 'kanto', 'Narita Airport and Tokyo Disneyland are both in Chiba.'],
  ['13', '東京都', 'とうきょうと', 'Tokyo', '東京', 'とうきょう', 'Tokyo', 'kanto', 'The capital of Japan. The government building is in Shinjuku (新宿).'],
  ['14', '神奈川県', 'かながわけん', 'Kanagawa', '横浜', 'よこはま', 'Yokohama', 'kanto', 'Yokohama, the Great Buddha of Kamakura, and Hakone’s hot springs.'],
  ['15', '新潟県', 'にいがたけん', 'Niigata', '新潟', 'にいがた', 'Niigata', 'chubu', 'Famous for its rice (Koshihikari) and sake.'],
  ['16', '富山県', 'とやまけん', 'Toyama', '富山', 'とやま', 'Toyama', 'chubu', 'The Tateyama mountains with their snow walls, and fresh fish from Toyama Bay.'],
  ['17', '石川県', 'いしかわけん', 'Ishikawa', '金沢', 'かなざわ', 'Kanazawa', 'chubu', 'Kanazawa’s Kenroku-en garden, and gold leaf on everything, even ice cream.'],
  ['18', '福井県', 'ふくいけん', 'Fukui', '福井', 'ふくい', 'Fukui', 'chubu', 'Dinosaur fossils, and most of the glasses frames made in Japan.'],
  ['19', '山梨県', 'やまなしけん', 'Yamanashi', '甲府', 'こうふ', 'Kōfu', 'chubu', 'The north side of Mount Fuji, grapes and wine.'],
  ['20', '長野県', 'ながのけん', 'Nagano', '長野', 'ながの', 'Nagano', 'chubu', 'The Japanese Alps, the 1998 Winter Olympics and the snow monkeys.'],
  ['21', '岐阜県', 'ぎふけん', 'Gifu', '岐阜', 'ぎふ', 'Gifu', 'chubu', 'The thatched-roof farmhouses of Shirakawa-gō.'],
  ['22', '静岡県', 'しずおかけん', 'Shizuoka', '静岡', 'しずおか', 'Shizuoka', 'chubu', 'Green tea fields and the south side of Mount Fuji.'],
  ['23', '愛知県', 'あいちけん', 'Aichi', '名古屋', 'なごや', 'Nagoya', 'chubu', 'Nagoya, and the home of Toyota cars.'],
  ['24', '三重県', 'みえけん', 'Mie', '津', 'つ', 'Tsu', 'kinki', 'Ise Grand Shrine. Tsu (津) is the shortest city name in Japan.'],
  ['25', '滋賀県', 'しがけん', 'Shiga', '大津', 'おおつ', 'Ōtsu', 'kinki', 'Lake Biwa (琵琶湖), the biggest lake in Japan, fills a sixth of it.'],
  ['26', '京都府', 'きょうとふ', 'Kyoto', '京都', 'きょうと', 'Kyoto', 'kinki', 'The old capital, with more than a thousand temples.'],
  ['27', '大阪府', 'おおさかふ', 'Osaka', '大阪', 'おおさか', 'Osaka', 'kinki', '"The nation’s kitchen": takoyaki and okonomiyaki.'],
  ['28', '兵庫県', 'ひょうごけん', 'Hyōgo', '神戸', 'こうべ', 'Kobe', 'kinki', 'Kobe beef and the white castle of Himeji.'],
  ['29', '奈良県', 'ならけん', 'Nara', '奈良', 'なら', 'Nara', 'kinki', 'Friendly deer in Nara Park and the giant Buddha of Tōdai-ji.'],
  ['30', '和歌山県', 'わかやまけん', 'Wakayama', '和歌山', 'わかやま', 'Wakayama', 'kinki', 'The temples of Kōya-san, and mikan oranges.'],
  ['31', '鳥取県', 'とっとりけん', 'Tottori', '鳥取', 'とっとり', 'Tottori', 'chugoku', 'Big sand dunes, and the fewest people of all prefectures.'],
  ['32', '島根県', 'しまねけん', 'Shimane', '松江', 'まつえ', 'Matsue', 'chugoku', 'Izumo Taisha, one of the oldest shrines in Japan.'],
  ['33', '岡山県', 'おかやまけん', 'Okayama', '岡山', 'おかやま', 'Okayama', 'chugoku', 'The Kōraku-en garden, and the home of the Momotarō story.'],
  ['34', '広島県', 'ひろしまけん', 'Hiroshima', '広島', 'ひろしま', 'Hiroshima', 'chugoku', 'The Peace Memorial, and the floating torii gate of Miyajima.'],
  ['35', '山口県', 'やまぐちけん', 'Yamaguchi', '山口', 'やまぐち', 'Yamaguchi', 'chugoku', 'At the western tip of Honshū; famous for fugu (pufferfish).'],
  ['36', '徳島県', 'とくしまけん', 'Tokushima', '徳島', 'とくしま', 'Tokushima', 'shikoku', 'The Awa Odori, a huge summer dance festival.'],
  ['37', '香川県', 'かがわけん', 'Kagawa', '高松', 'たかまつ', 'Takamatsu', 'shikoku', 'The smallest prefecture, and the home of udon noodles.'],
  ['38', '愛媛県', 'えひめけん', 'Ehime', '松山', 'まつやま', 'Matsuyama', 'shikoku', 'Dōgo Onsen, one of the oldest hot springs, and mikan oranges.'],
  ['39', '高知県', 'こうちけん', 'Kōchi', '高知', 'こうち', 'Kōchi', 'shikoku', 'Seared bonito (katsuo no tataki), and the home of Sakamoto Ryōma.'],
  ['40', '福岡県', 'ふくおかけん', 'Fukuoka', '福岡', 'ふくおか', 'Fukuoka', 'kyushu', 'Hakata ramen; Fukuoka is the biggest city of Kyūshū.'],
  ['41', '佐賀県', 'さがけん', 'Saga', '佐賀', 'さが', 'Saga', 'kyushu', 'The porcelain towns of Arita and Imari.'],
  ['42', '長崎県', 'ながさきけん', 'Nagasaki', '長崎', 'ながさき', 'Nagasaki', 'kyushu', 'Japan’s window to the world in the Edo period, when the country was closed.'],
  ['43', '熊本県', 'くまもとけん', 'Kumamoto', '熊本', 'くまもと', 'Kumamoto', 'kyushu', 'Kumamoto Castle, the volcano Aso, and the bear mascot Kumamon.'],
  ['44', '大分県', 'おおいたけん', 'Ōita', '大分', 'おおいた', 'Ōita', 'kyushu', 'More hot springs than anywhere else: Beppu and Yufuin.'],
  ['45', '宮崎県', 'みやざきけん', 'Miyazaki', '宮崎', 'みやざき', 'Miyazaki', 'kyushu', 'Warm and sunny, with mangoes and surfing beaches.'],
  ['46', '鹿児島県', 'かごしまけん', 'Kagoshima', '鹿児島', 'かごしま', 'Kagoshima', 'kyushu', 'The smoking volcano Sakurajima, and the ancient cedars of Yakushima.'],
  ['47', '沖縄県', 'おきなわけん', 'Okinawa', '那覇', 'なは', 'Naha', 'kyushu', 'Subtropical islands far to the south, with their own Ryūkyū culture.'],
].map(([id, name, rd, en, cap, capRd, capEn, region, fact]) => {
  const base = name.replace(/[県府都]$/, ''), baseRd = name === '北海道' ? '' : rd.replace(/(けん|ふ|と)$/, ''); // 青森 counts for 青森県
  return { id, name, rd, en, cap, capRd, capEn, region, fact, nameAlt: base !== name ? [base, baseRd] : [], capAlt: id === '13' ? ['新宿', 'しんじゅく'] : [cap + '市', (capRd || cap) + 'し'] };
});

// seas, mountains, lakes and islands; where they are drawn is in mapdata.js (built from these coordinates by scripts/build-japan-map.js)
const PLACES_REGIONS = [['sea', 'Seas'], ['mountain', 'Mountains'], ['lake', 'Lakes'], ['island', 'Islands']];
const JAPAN_PLACES = [
  // [id, name, reading, English, kind, [lat, lon], fact]
  ['nihonkai', '日本海', 'にほんかい', 'Sea of Japan', 'sea', [40.3, 135.2], 'Between Japan and the Asian mainland. In winter its moist air brings heavy snow to the west coast.'],
  ['taiheiyo', '太平洋', 'たいへいよう', 'Pacific Ocean', 'sea', [33.6, 142.4], 'The biggest ocean, east and south of Japan.'],
  ['higashishinakai', '東シナ海', 'ひがしシナかい', 'East China Sea', 'sea', [31.2, 127.6], 'Between Kyūshū, Okinawa, China and Korea.'],
  ['ohotsukukai', 'オホーツク海', 'オホーツクかい', 'Sea of Okhotsk', 'sea', [45.6, 145.3], 'North of Hokkaidō. In winter, drift ice comes to its coast.'],
  ['setonaikai', '瀬戸内海', 'せとないかい', 'Seto Inland Sea', 'sea', [34.15, 133.2], 'A calm sea with hundreds of islands between Honshū, Shikoku and Kyūshū.'],
  ['fujisan', '富士山', 'ふじさん', 'Mount Fuji', 'mountain', [35.36, 138.73], 'The highest mountain in Japan (3,776 m), a sleeping volcano.'],
  ['kitadake', '北岳', 'きただけ', 'Mount Kita', 'mountain', [35.67, 138.24], 'The second highest mountain (3,193 m), in the Southern Alps.'],
  ['asosan', '阿蘇山', 'あそさん', 'Mount Aso', 'mountain', [32.88, 131.1], 'An active volcano in Kumamoto with one of the biggest calderas in the world.'],
  ['sakurajima', '桜島', 'さくらじま', 'Sakurajima', 'mountain', [31.58, 130.66], 'A volcano in Kagoshima Bay that puffs out ash almost every day.'],
  ['asamayama', '浅間山', 'あさまやま', 'Mount Asama', 'mountain', [36.41, 138.52], 'An active volcano on the border of Nagano and Gunma.'],
  ['taisetsuzan', '大雪山', 'たいせつざん', 'Daisetsuzan', 'mountain', [43.66, 142.85], 'The "great snowy mountains" in the middle of Hokkaidō.'],
  ['ontakesan', '御嶽山', 'おんたけさん', 'Mount Ontake', 'mountain', [35.89, 137.48], 'A sacred volcano between Nagano and Gifu.'],
  ['biwako', '琵琶湖', 'びわこ', 'Lake Biwa', 'lake', [35.25, 136.08], 'The biggest lake in Japan, in Shiga. Its shape is like a biwa (a lute).'],
  ['towadako', '十和田湖', 'とわだこ', 'Lake Towada', 'lake', [40.47, 140.88], 'A deep crater lake between Aomori and Akita.'],
  ['kasumigaura', '霞ヶ浦', 'かすみがうら', 'Lake Kasumigaura', 'lake', [36.05, 140.4], 'The second biggest lake, in Ibaraki.'],
  ['sadogashima', '佐渡島', 'さどがしま', 'Sado Island', 'island', [38.05, 138.4], 'A big island off Niigata, once famous for its gold mine.'],
  ['awajishima', '淡路島', 'あわじしま', 'Awaji Island', 'island', [34.4, 134.83], 'Between Kobe and Shikoku, joined to both by bridges.'],
  ['yakushima', '屋久島', 'やくしま', 'Yakushima', 'island', [30.35, 130.53], 'A rainy island with cedar trees thousands of years old.'],
  ['tsushima', '対馬', 'つしま', 'Tsushima', 'island', [34.4, 129.3], 'Between Kyūshū and Korea; on a clear day you can see Busan.'],
  ['shodoshima', '小豆島', 'しょうどしま', 'Shōdoshima', 'island', [34.49, 134.27], 'An island in the Seto Inland Sea, known for olives and soy sauce.'],
].map(([id, name, rd, en, region, at, fact]) => ({ id, name, rd, en, region, at, fact, cap: '', capRd: '', capEn: '', nameAlt: [], capAlt: [] }));

// ---------- quiz rules (pure, tested) ----------
// English is compared without accents or punctuation; Japanese goes through J.norm (katakana = hiragana, romaji is read as kana).
const geoNorm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const geoLev = (a, b) => J.lev(a, b);
const geoReading = (it, field) => (field === 'cap' ? it.capRd : it.rd);
// field is 'name' (the country, prefecture or place) or 'cap' (its capital). Kanji, kana and romaji all count.
// right | close (a typo, or a long ー left out) | english (you typed the English name) | wrong
function geoJudge(typed, item, field) {
  const t = J.norm(typed); if (!t) return 'wrong';
  const want = [item[field], geoReading(item, field), ...(item[field + 'Alt'] || [])].filter(Boolean).map((x) => J.norm(x));
  if (want.includes(t)) return 'right';
  const noLong = (x) => x.replace(/ー/g, '');
  if (want.some((w) => noLong(w) === noLong(t))) return 'close';
  const en = geoNorm(field === 'name' ? item.en : item.capEn);
  if (en && [en, en.replace(/^the /, '')].includes(geoNorm(typed))) return 'english';
  if (want.some((w) => [...w].length >= 4 && geoLev(t, w) <= 1)) return 'close';
  return 'wrong';
}
// how well an item is known, from its tally { c: right answers, m: misses }
function geoLevel(rec) {
  const c = (rec && rec.c) || 0, m = (rec && rec.m) || 0, n = c - m;
  return !c && !m ? 'new' : n >= 4 ? 'mastered' : n >= 2 ? 'known' : 'learning';
}
// the n items to ask about: the ones you know least come first (new ones count as zero), with a little shuffling so rounds differ
function geoPickQueue(items, stats, n, rnd) {
  rnd = rnd || Math.random;
  const score = (it) => { const r = (stats && stats[it.id]) || {}; return (r.c || 0) - 2 * (r.m || 0) + rnd() * 2.5; };
  return items.map((it) => [score(it), it]).sort((a, b) => a[0] - b[0]).slice(0, n).map((x) => x[1]);
}
// the right item plus three look-alikes: from the same region when possible, the rest from anywhere; no two options with the same text
function geoOptions(items, item, key, count, rnd) {
  rnd = rnd || Math.random; count = count || 4;
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const seen = new Set([key(item)]), out = [];
  const others = shuffle(items.filter((x) => x.id !== item.id)), near = others.filter((x) => item.region && x.region === item.region);
  for (const x of near.concat(others)) { if (out.length >= count - 1) break; if (!seen.has(key(x))) { seen.add(key(x)); out.push(x); } }
  return shuffle(out.concat(item));
}

const G = { flagImg, EUROPE, EUROPE_REGIONS, ASIA, ASIA_REGIONS, AFRICA, AFRICA_REGIONS, NAMERICA, NAMERICA_REGIONS, SAMERICA, AMERICAS, AMERICAS_REGIONS, OCEANIA, OCEANIA_REGIONS, WORLD, WORLD_REGIONS,
  PREFECTURES, PREF_REGIONS, JAPAN_PLACES, PLACES_REGIONS, geoNorm, geoLev, geoJudge, geoLevel, geoPickQueue, geoOptions };
if (typeof module !== 'undefined' && module.exports) module.exports = G; else Object.assign(root, G);
})(typeof window !== 'undefined' ? window : globalThis);
