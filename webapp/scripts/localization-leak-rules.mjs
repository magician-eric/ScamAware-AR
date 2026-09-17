// What counts as a localization leak, per language. Shared by the runtime
// scan (scripts/localization-runtime-scan.mjs), the dataset test
// (scripts/location-localization.test.mjs) and the rendered-screen test
// (scripts/localization-leak.test.mjs), so all three judge a string the
// same way.

// Any Han character. A complete leak test for `en`, and a useless one for
// `jp`, which writes Han characters natively - hence the two tables below.
export const HAN = /[㐀-鿿]/u;

// Kana - the actual syllabaries, plus the marks that only Japanese writes.
// Deliberately NOT the whole 3040-30FF block: U+30FB (・) sits in it but is
// punctuation, not kana, and Traditional Chinese uses it as an interpunct in
// exactly the same way ("一般會員・會員編號", "安全交易・安心收付"). Treating
// the block wholesale flagged ten legitimate zh-TW separators as Japanese.
export const KANA = /[\u3041-\u309F\u30A1-\u30FA\u30FC-\u30FF]/u;

// Characters Traditional Chinese and Japanese write differently. One of these
// on a `jp` screen means Chinese text got there - an untranslated string, a
// dataset value used raw, or a fallback to the zh-TW table. The value is the
// Japanese form, so a failure can say what the text should have read.
export const TRADITIONAL_ONLY = {
  亞: '亜', 惡: '悪', 壓: '圧', 圍: '囲', 醫: '医', 隱: '隠', 榮: '栄',
  營: '営', 驛: '駅', 圓: '円', 緣: '縁', 應: '応', 歐: '欧', 毆: '殴',
  櫻: '桜', 奧: '奥', 橫: '横', 溫: '温', 穩: '穏', 假: '仮', 價: '価',
  畫: '画', 會: '会', 壞: '壊', 懷: '懐', 樂: '楽', 學: '学', 覺: '覚',
  陷: '陥', 巖: '巌', 觀: '観', 關: '関', 歡: '歓', 歸: '帰', 氣: '気',
  龜: '亀', 僞: '偽', 戲: '戯', 犧: '犠', 舊: '旧', 據: '拠', 擧: '挙',
  虛: '虚', 峽: '峡', 狹: '狭', 鄉: '郷', 曉: '暁', 區: '区', 驅: '駆',
  勳: '勲', 惠: '恵', 揭: '掲', 雞: '鶏', 鷄: '鶏', 藝: '芸', 擊: '撃',
  檢: '検', 劍: '剣', 險: '険', 驗: '験', 顯: '顕', 廣: '広', 恆: '恒',
  鑛: '鉱', 號: '号', 國: '国', 濟: '済', 齋: '斎', 劑: '剤', 雜: '雑',
  參: '参', 慘: '惨', 棧: '桟', 蠶: '蚕', 贊: '賛', 殘: '残', 絲: '糸',
  齒: '歯', 兒: '児', 辭: '辞', 濕: '湿', 實: '実', 舍: '舎', 寫: '写',
  釋: '釈', 從: '従', 獸: '獣', 縱: '縦', 處: '処', 將: '将', 稱: '称',
  燒: '焼', 證: '証', 乘: '乗', 剩: '剰', 壤: '壌', 孃: '嬢', 條: '条',
  淨: '浄', 疊: '畳', 讓: '譲', 釀: '醸', 觸: '触', 囑: '嘱', 寢: '寝',
  愼: '慎', 眞: '真', 盡: '尽', 醉: '酔', 髓: '髄', 數: '数', 樞: '枢',
  瀨: '瀬', 齊: '斉', 靜: '静', 攝: '摂', 竊: '窃', 專: '専', 戰: '戦',
  淺: '浅', 潛: '潜', 纖: '繊', 踐: '践', 錢: '銭', 禪: '禅', 雙: '双',
  壯: '壮', 巢: '巣', 爭: '争', 莊: '荘', 裝: '装', 藏: '蔵', 臟: '臓',
  屬: '属', 續: '続', 墮: '堕', 體: '体', 對: '対', 帶: '帯', 滯: '滞',
  臺: '台', 澤: '沢', 擇: '択', 單: '単', 擔: '担', 膽: '胆', 團: '団',
  斷: '断', 彈: '弾', 遲: '遅', 晝: '昼', 蟲: '虫', 鑄: '鋳', 廳: '庁',
  徵: '徴', 聽: '聴', 傳: '伝', 燈: '灯', 盜: '盗', 稻: '稲', 德: '徳',
  讀: '読', 屆: '届', 拂: '払', 佛: '仏', 變: '変', 邊: '辺', 辯: '弁',
  辨: '弁', 舖: '舗', 寶: '宝', 豐: '豊', 拔: '抜', 髮: '髪', 拜: '拝',
  每: '毎', 萬: '万', 滿: '満', 默: '黙', 藥: '薬', 餘: '余', 譽: '誉',
  搖: '揺', 樣: '様', 謠: '謡', 來: '来', 賴: '頼', 亂: '乱', 覽: '覧',
  兩: '両', 獵: '猟', 綠: '緑', 淚: '涙', 壘: '塁', 勵: '励', 禮: '礼',
  隸: '隷', 靈: '霊', 齡: '齢', 戀: '恋', 爐: '炉', 勞: '労', 樓: '楼',
  錄: '録', 灣: '湾', 縣: '県', 賣: '売', 蠻: '蛮', 內: '内', 麥: '麦',
  腳: '脚', 權: '権', 總: '総', 啟: '啓', 發: '発', 鬥: '闘', 歷: '歴',
  產: '産', 聲: '声', 黨: '党', 顏: '顔', 繼: '継', 歲: '歳', 點: '点',
  當: '当', 眾: '衆', 鐵: '鉄', 鹽: '塩', 蘆: '芦', 與: '与', 沒: '没',
  查: '査', 卻: '却', 嚴: '厳', 圖: '図', 寬: '寛', 廢: '廃', 徑: '径',
  擴: '拡', 攜: '携', 曆: '暦', 濱: '浜',
  獻: '献', 稅: '税', 繩: '縄', 聰: '聡',
  肅: '粛', 裡: '裏',
  說: '説', 讚: '賛', 賤: '賎', 轉: '転', 遞: '逓',
  鄰: '隣', 醬: '醤', 釐: '厘', 閱: '閲',
  隨: '随', 靑: '青', 飜: '翻',
  鬆: '緩', 鹼: '鹸', 麵: '麺', 黃: '黄',
};

// Characters Japanese does not write at all - Chinese function words and
// particles. Deliberately conservative: 那 (那覇), 誰, 於 and 個 are all
// ordinary Japanese and are not here.
export const CHINESE_ONLY = new Set([
  '這', '您', '們', '嗎', '呢', '麼', '咱', '啦', '唄', '啥', '倆', '咧',
  '咩', '噢', '嘞', '甭', '仨', '啰', '嘍', '喲', '嗲', '倂',
]);

// Proper nouns a Japanese run writes with Han characters because that IS the
// mark, not because a string was left untranslated.
//
// Scenario 05's three platforms carry the owner's official Japanese names:
// 買東東 (the marketplace), 黑皮通 (the courier) and SafeDeal (the fake
// external trading site). 黑皮通 keeps 黑 deliberately - the Japanese form 黒
// is a different mark, not a spelling of this one - which is exactly the kind
// of character the table above exists to catch, so the marks are named here
// instead of the check being weakened for everything else.
//
// They are lifted out of a `jp` string before the character scan, never
// around it: every other character of the same sentence is still judged, so
// "黑皮通の追跡番號" still fails on 號 while "黑皮通で発送します" passes.
//
// This is a Japanese-only allowance. An English run reads MyDonDon and HPE,
// so Han characters there remain a leak with no exceptions.
export const JAPANESE_BRAND_MARKS = ['買東東', '黑皮通', 'SafeDeal'];

// Text that is correctly in another language whatever the player picked.
// The language picker has to name each language in that language - an English
// player looking for Japanese needs to read 日本語, not "Japanese" - so these
// are the one thing on screen a language check must not judge.
export const LANGUAGE_PICKER_LABELS = new Set([
  '🇹🇼 中文', '🇺🇸 English', '🇯🇵 日本語',
  // GuGo Invest's in-app language row (apps/gugo-invest/app/pages/Account.tsx)
  '繁中 / EN / 日本語',
]);

// Whether `text` is a localization leak for `lang`, and why.
//
// Each language is judged by what can actually go wrong in it. `en` must have
// no Han characters at all. `zh` must have no kana. `jp` is judged by
// character, never by "contains Han characters": Japanese
// writes Taiwanese place and agency names in Han characters (台北市信義区,
// 台湾台北地方検察署) and those are correct Japanese, not leaks. What is not
// correct Japanese is a Traditional-only form or a Chinese function word,
// and any Chinese string long enough to matter carries at least one. The one
// exception is a brand mark (see JAPANESE_BRAND_MARKS above), which is removed
// before that scan rather than exempting the string it sits in.
export function findLeak(text, lang) {
  if (LANGUAGE_PICKER_LABELS.has(text)) return null;
  if (lang === 'en') {
    const han = text.match(HAN);
    return han ? { reason: `Chinese characters in an English run (${han[0]})` } : null;
  }
  // A Traditional-Chinese run is checked for the one thing that can leak into
  // it: Japanese. Kana is the giveaway, and nothing in the zh-TW copy has any.
  if (lang === 'zh') {
    const kana = text.match(KANA);
    return kana ? { reason: `Japanese kana in a Chinese run (${kana[0]})` } : null;
  }
  if (lang !== 'jp') return null;
  // The brand marks are the run's own proper nouns; everything around them is
  // still scanned character by character.
  const prose = JAPANESE_BRAND_MARKS.reduce((rest, mark) => rest.split(mark).join(''), text);
  for (const character of prose) {
    if (CHINESE_ONLY.has(character)) {
      return { reason: `Chinese-only character ${character} in a Japanese run` };
    }
    const japanese = TRADITIONAL_ONLY[character];
    if (japanese && japanese.length === 1) {
      return { reason: `Traditional-Chinese ${character} in a Japanese run (Japanese writes ${japanese})` };
    }
  }
  return null;
}
