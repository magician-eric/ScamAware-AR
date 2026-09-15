// Generates src/data/location/localizedLocationNames.js - the English and
// Japanese display names for every county, district, police department,
// division, station, prosecutors office and district court the location
// datasets can produce.
//
// Why a generated table rather than a runtime transliterator: the shipped
// bundle must resolve a name synchronously, offline, on a pair of AR glasses,
// and must give the SAME answer every run. A lookup table does that with no
// dictionary in the bundle and no reading ambiguity at runtime; it is also
// reviewable, which a romanization algorithm is not.
//
// Run it with pinyin-pro installed ad hoc (it is deliberately NOT a
// dependency of the app - nothing at runtime needs it):
//
//   npm install --no-save pinyin-pro
//   node scripts/generate-location-localization.mjs
//
// The output is committed. scripts/location-localization.test.mjs fails the
// build if any name in either dataset is missing from it, so the table cannot
// silently fall behind the data it dresses.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { pinyin } = require('pinyin-pro');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// --- English --------------------------------------------------------------

// The 22 counties/cities keep their official English names, which predate
// (and deliberately ignore) Hanyu Pinyin - "Taipei", never "Taibei".
const COUNTY_EN = {
  臺北市: 'Taipei City', 新北市: 'New Taipei City', 桃園市: 'Taoyuan City',
  臺中市: 'Taichung City', 臺南市: 'Tainan City', 高雄市: 'Kaohsiung City',
  基隆市: 'Keelung City', 新竹市: 'Hsinchu City', 新竹縣: 'Hsinchu County',
  苗栗縣: 'Miaoli County', 彰化縣: 'Changhua County', 南投縣: 'Nantou County',
  雲林縣: 'Yunlin County', 嘉義市: 'Chiayi City', 嘉義縣: 'Chiayi County',
  屏東縣: 'Pingtung County', 宜蘭縣: 'Yilan County', 花蓮縣: 'Hualien County',
  臺東縣: 'Taitung County', 澎湖縣: 'Penghu County', 金門縣: 'Kinmen County',
  連江縣: 'Lienchiang County',
};

// Name stems whose accepted English spelling is not Hanyu Pinyin. Applied
// before romanization, longest match first, so 臺北市政府警察局 becomes
// "Taipei ..." and 淡水分局 becomes "Tamsui Precinct".
const STEM_EN = {
  臺北: 'Taipei', 新北: 'New Taipei', 臺中: 'Taichung', 臺南: 'Tainan',
  高雄: 'Kaohsiung', 基隆: 'Keelung', 新竹: 'Hsinchu', 嘉義: 'Chiayi',
  苗栗: 'Miaoli', 彰化: 'Changhua', 南投: 'Nantou', 雲林: 'Yunlin',
  屏東: 'Pingtung', 宜蘭: 'Yilan', 花蓮: 'Hualien', 臺東: 'Taitung',
  澎湖: 'Penghu', 金門: 'Kinmen', 連江: 'Lienchiang', 桃園: 'Taoyuan',
  淡水: 'Tamsui', 鹿港: 'Lukang', 那瑪夏: 'Namasia', 三重: 'Sanchong',
  士林: 'Shilin', 橋頭: 'Qiaotou', 板橋: 'Banqiao', 恆春: 'Hengchun',
  綠島: 'Lyudao', 蘭嶼: 'Lanyu', 琉球: 'Liuqiu', 馬公: 'Magong',
  哈爾濱: 'Harbin', 羅斯福: 'Roosevelt', 重慶: 'Chongqing', 二重埔: 'Erchongpu',
  達卡努瓦: 'Takanua', 三地門: 'Sandimen', 太麻里: 'Taimali', 拉芙蘭: 'Lavalan',
};

// Unit names that are a landmark rather than a place name - translated, not
// romanized, because that is what the landmark is called in English.
const LANDMARK_EN = {
  日月潭: 'Sun Moon Lake', 工業區: 'Industrial Park',
  臺中公園: 'Taichung Park', 衛武營都會公園: 'Weiwuying Metropolitan Park',
  阿里山: 'Alishan', 八卦山: 'Baguashan', 太平山: 'Taipingshan',
};

// Whole district names that are not a place name at all - the compass-point
// districts several cities share. "Bei District" would be a mistranslation,
// not a romanization.
const DISTRICT_EN = {
  中區: 'Central District', 東區: 'East District', 西區: 'West District',
  南區: 'South District', 北區: 'North District', 中西區: 'West Central District',
};

// Administrative suffixes, longest first.
const REGION_SUFFIX_EN = [['區', 'District'], ['鄉', 'Township'], ['鎮', 'Township'], ['市', 'City']];
// Thoroughfare words that stay a separate English word in a unit's name.
const ROAD_SUFFIX_EN = [['大道', 'Blvd.'], ['路', 'Rd.'], ['街', 'St.'], ['巷', 'Ln.']];
const DIRECTION_EN = { 東: 'E.', 西: 'W.', 南: 'S.', 北: 'N.', 中: 'Central' };
const ORDINAL_EN = {
  一: 'First', 二: 'Second', 三: 'Third', 四: 'Fourth', 五: 'Fifth',
  六: 'Sixth', 七: 'Seventh', 八: 'Eighth', 九: 'Ninth', 十: 'Tenth',
};

// Hanyu Pinyin, joined into one capitalized word, with the apostrophe Hanyu
// Pinyin requires before a syllable starting a/e/o - "Da'an", never "Daan".
function romanize(chinese) {
  const syllables = pinyin(chinese, { toneType: 'none', type: 'array', nonZh: 'consecutive' });
  let out = '';
  for (const syllable of syllables) {
    if (!syllable) continue;
    if (out && /^[aeo]/.test(syllable)) out += "'";
    out += syllable;
  }
  return out.charAt(0).toUpperCase() + out.slice(1);
}

// Romanizes a stem, honouring STEM_EN as a WHOLE-NAME override.
//
// It used to match on any prefix, which is wrong: a place name is not a
// compound of the places whose names it happens to start with. 新北勢 is a
// village in 內埔鄉, Pingtung - matching its 新北 prefix against New Taipei
// produced "New Taipeishi", and every Scenario 03 surface in that jurisdiction
// (case site, calls, LINE card, documents) then named the wrong station.
//
// Nothing needs prefix matching: departmentEn and justiceEn already peel an
// agency name down to its bare city stem before calling this, districtEn peels
// off the administrative suffix, and unitStemEn peels off the road and unit
// suffixes. Every override in STEM_EN is reached as a whole name.
function romanizeStem(stem) {
  return STEM_EN[stem] ?? romanize(stem);
}

// A unit's own name, minus its unit-type suffix: "民生西路" -> "Minsheng W.
// Rd.", "中正第一" -> "Zhongzheng First", "三張犁" -> "Sanzhangli".
function unitStemEn(stem) {
  if (LANDMARK_EN[stem]) return LANDMARK_EN[stem];
  for (const [zh, en] of ROAD_SUFFIX_EN) {
    if (stem.endsWith(zh) && stem.length > zh.length) {
      let base = stem.slice(0, -zh.length);
      // 五福二路 / 中正三路 - the numbered section is its own word.
      const ordinal = ORDINAL_EN[base.slice(-1)];
      if (ordinal && base.length > 1) return `${romanizeStem(base.slice(0, -1))} ${ordinal} ${en}`;
      const direction = DIRECTION_EN[base.slice(-1)];
      if (direction && base.length > 1) return `${romanizeStem(base.slice(0, -1))} ${direction} ${en}`;
      return `${romanizeStem(base)} ${en}`;
    }
  }
  // 中正橋 -> "Zhongzheng Bridge"; a two-character name ending in 橋
  // (板橋, 橋頭) is a place name and stays romanized whole.
  if (stem.length >= 3 && stem.endsWith('橋')) return `${romanizeStem(stem.slice(0, -1))} Bridge`;
  // 中正第一分局 -> "Zhongzheng First Precinct"; 中山一派出所 -> "Zhongshan
  // First Police Station".
  const numbered = stem.match(/^(.+?)(?:第)?([一二三四五六七八九十])$/);
  if (numbered && numbered[1].length >= 2) return `${romanizeStem(numbered[1])} ${ORDINAL_EN[numbered[2]]}`;
  return romanizeStem(stem);
}

function districtEn(name) {
  if (DISTRICT_EN[name]) return DISTRICT_EN[name];
  if (COUNTY_EN[name]) return COUNTY_EN[name];
  for (const [zh, en] of REGION_SUFFIX_EN) {
    if (name.endsWith(zh)) return `${romanizeStem(name.slice(0, -zh.length))} ${en}`;
  }
  return romanizeStem(name);
}

// Both official spellings appear in the dataset: 臺北市政府警察局 and
// 基隆市警察局 are each the agency's own name, not a typo of the other.
function departmentEn(name) {
  const city = name.match(/^(.+?)(市|縣)(?:政府)?警察局$/);
  if (!city) return romanizeStem(name);
  const stem = romanizeStem(city[1]);
  return city[2] === '市' ? `${stem} City Police Department` : `${stem} County Police Bureau`;
}

function justiceEn(name) {
  const match = name.match(/^(臺灣|福建)(.+?)地方(檢察署|法院)$/);
  if (!match) return romanizeStem(name);
  const nation = match[1] === '福建' ? 'Fujian' : 'Taiwan';
  const kind = match[3] === '檢察署' ? 'District Prosecutors Office' : 'District Court';
  return `${nation} ${romanizeStem(match[2])} ${kind}`;
}

const UNIT_SUFFIX_EN = [
  ['分局', 'Precinct'], ['警察所', 'Police Office'],
  ['派出所', 'Police Station'], ['分駐所', 'Substation'], ['駐在所', 'Police Post'],
];

function unitEn(name) {
  for (const [zh, en] of UNIT_SUFFIX_EN) {
    if (name.endsWith(zh)) return `${unitStemEn(name.slice(0, -zh.length))} ${en}`;
  }
  return unitStemEn(name);
}

// --- Japanese -------------------------------------------------------------

// Taiwanese place and agency names are written in Japanese with the same
// characters, in their Japanese (shinjitai) forms - 臺北市信義區 is 台北市信義区,
// 臺灣臺北地方檢察署 is 台湾台北地方検察署. Only characters whose Japanese
// standard form actually differs are listed; anything absent is already
// written the same way in both scripts. Proper-noun characters Japanese keeps
// in their traditional form (龍, 鶯, 蘭, 華, 陽 ...) are deliberately NOT here.
const SHINJITAI = {
  臺: '台', 灣: '湾', 區: '区', 縣: '県', 鄉: '郷', 檢: '検', 廳: '庁',
  萬: '万', 與: '与', 內: '内', 學: '学', 藝: '芸', 豐: '豊', 邊: '辺',
  舊: '旧', 廣: '広', 團: '団', 圓: '円', 寶: '宝', 樂: '楽', 壽: '寿',
  鹽: '塩', 濱: '浜', 觀: '観', 關: '関', 鐵: '鉄', 榮: '栄', 澤: '沢',
  龜: '亀', 國: '国', 雙: '双', 蘆: '芦', 麥: '麦', 腳: '脚', 恆: '恒',
  滿: '満', 壯: '壮', 圍: '囲', 穗: '穂', 綠: '緑', 權: '権', 吳: '呉',
  瀨: '瀬', 檜: '桧', 繼: '継', 顯: '顕', 實: '実', 踐: '践', 總: '総',
  啟: '啓', 覺: '覚', 會: '会', 發: '発', 萊: '莱', 雞: '鶏', 條: '条',
  靜: '静', 惠: '恵', 觸: '触', 祿: '禄', 隱: '隠', 鬥: '闘', 歡: '歓',
  稻: '稲', 溫: '温', 歷: '歴', 樑: '梁', 膽: '胆', 德: '徳', 彌: '弥',
  歸: '帰', 將: '将', 營: '営', 橫: '横', 產: '産', 濟: '済', 齊: '斉',
  聲: '声', 醫: '医', 藥: '薬', 屬: '属', 縱: '縦', 隨: '随', 黨: '党',
  亞: '亜', 傳: '伝', 價: '価', 兒: '児', 勞: '労', 參: '参', 雜: '雑',
  變: '変', 顏: '顔', 峽: '峡', 勳: '勲', 劍: '剣', 燈: '灯',
  莊: '荘', 裡: '裏', 來: '来', 拔: '抜', 巢: '巣',
};

function toJapanese(name) {
  return [...name].map((ch) => SHINJITAI[ch] ?? ch).join('');
}

// --- Build ----------------------------------------------------------------

const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const grab = (source, key) => [
  ...new Set([...source.matchAll(new RegExp(`"${key}":\\s*"([^"]+)"`, 'g'))].map((m) => m[1])),
];

const dataset = read('src/data/location/locationDataset.js');
const organization = read('src/data/location/policeOrganization.js');

const counties = grab(dataset, 'county');
const districts = grab(dataset, 'district');
const departments = grab(dataset, 'policeDepartment');
const offices = grab(dataset, 'prosecutorsOffice');
const courts = grab(dataset, 'districtCourt');
const units = grab(organization, 'name');

const table = new Map();
const add = (zh, en) => {
  if (!zh) return;
  const jp = toJapanese(zh);
  const existing = table.get(zh);
  if (existing && existing.en !== en) throw new Error(`conflicting English for ${zh}: ${existing.en} / ${en}`);
  table.set(zh, { en, jp });
};

counties.forEach((name) => add(name, COUNTY_EN[name] ?? districtEn(name)));
districts.forEach((name) => add(name, districtEn(name)));
departments.forEach((name) => add(name, departmentEn(name)));
offices.forEach((name) => add(name, justiceEn(name)));
courts.forEach((name) => add(name, justiceEn(name)));
units.forEach((name) => add(name, unitEn(name)));

const missing = counties.filter((name) => !COUNTY_EN[name]);
if (missing.length) throw new Error(`county without an official English name: ${missing.join(', ')}`);

const entries = [...table.entries()].sort(([a], [b]) => a.localeCompare(b, 'zh-Hant'));
const body = entries
  .map(([zh, { en, jp }]) => `  ${JSON.stringify(zh)}: { en: ${JSON.stringify(en)}, jp: ${JSON.stringify(jp)} },`)
  .join('\n');

const header = `// GENERATED by scripts/generate-location-localization.mjs - do not edit by hand.
//
// The English and Japanese display name of every county, district, police
// department, division, station, prosecutors office and district court
// locationDataset.js / policeOrganization.js can produce. Chinese is the key
// because Chinese is what those datasets store; a player on \`en\` or \`jp\`
// never sees the key, only the value.
//
// English follows the agencies' own romanization where they have one
// (Taipei, Kaohsiung, Tamsui) and Hanyu Pinyin - Taiwan's official
// romanization standard - everywhere else. Japanese writes the same names
// with Japanese character forms, which is how Japanese text renders Taiwanese
// place and agency names (台北市信義区, 台湾台北地方検察署).
//
// ${entries.length} names. Regenerate after any edit to either dataset:
//   npm install --no-save pinyin-pro
//   node scripts/generate-location-localization.mjs
export const LOCALIZED_LOCATION_NAMES = {
${body}
};
`;

fs.writeFileSync(path.join(root, 'src/data/location/localizedLocationNames.js'), header);
console.log(`wrote ${entries.length} localized names`);
