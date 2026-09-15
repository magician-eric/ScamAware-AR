export const CHARACTER_LANGUAGES = ['zh', 'en', 'jp'];

export const NAME_POOLS = {
  female: {
    casual: {
      zh: ['小晴', '安安', '沐沐', '小語', '若若', '小羽', '語芯', '心妤', '晴晴', '依依', '可可', '朵朵', '欣欣', '小葵', '樂樂', '雨彤', '品妍', '芷晴'],
      en: ['Chloe', 'Mia', 'Emma', 'Olivia', 'Ashley', 'Zoey', 'Claire', 'Avery', 'Ella', 'Lily', 'Nina', 'Ivy', 'Ava', 'Grace', 'Lucy', 'Ruby'],
      jp: ['みお', 'ゆい', 'ひな', 'あかり', 'さくら', 'りん', 'みゆ', 'なな', 'あおい', 'えま', 'めい', 'ゆな', 'こはる', 'すず', 'まい', 'かえで', 'のあ', 'ひかり'],
    },
    cute: {
      zh: ['小晴♡', '小語ෆ', '小羽✨', '晴晴♡', '沐沐☁', '安安୨୧', '可可', '朵朵', '小葵', '依依', '若若', '樂樂'],
      en: ['Chloe', 'Mia', 'Emma', 'Zoey', 'Ella', 'Lily', 'Ava', 'Ruby', 'Lucy', 'Nina'],
      jp: ['みお♡', 'ゆい୨୧', 'ひな☁', 'さくら', 'りん', 'みゆ', 'なな', 'あおい', 'えま', 'めい', 'ゆな', 'こはる'],
    },
  },
  male: {
    casual: {
      zh: ['阿凱', '小宇', '阿哲', '俊仔', '大維', '小傑', '阿翔', '老王'],
      en: ['Kevin', 'Alex', 'Ethan', 'Ryan', 'Jason', 'Leo', 'Eric', 'Kai'],
      jp: ['たく', 'ゆうき', 'けん', 'しょう', 'なおき', 'だいき', 'れん', 'かい'],
    },
  },
};

// Extracted intact from ScenarioSessionFactory: zh/en components stay paired;
// Japanese remains an independent localized identity.
export const MALE_FORMAL_NAME_PARTS = {
  officer: {
    surnames: [{ zh: '陳', en: 'Chen' }, { zh: '林', en: 'Lin' }, { zh: '張', en: 'Chang' }, { zh: '李', en: 'Lee' }, { zh: '王', en: 'Wang' }, { zh: '黃', en: 'Huang' }, { zh: '吳', en: 'Wu' }],
    given: [{ zh: '志明', en: 'Chih-Ming' }, { zh: '建宏', en: 'Chien-Hung' }, { zh: '俊傑', en: 'Chun-Chieh' }, { zh: '冠宇', en: 'Kuan-Yu' }, { zh: '承翰', en: 'Cheng-Han' }, { zh: '彥廷', en: 'Yen-Ting' }],
    jpSurnames: ['佐藤', '鈴木', '高橋', '田中', '伊藤', '渡辺', '山本'],
    jpGiven: ['大輔', '拓也', '直樹', '健太', '翔太', '誠'],
  },
  prosecutor: {
    surnames: [{ zh: '劉', en: 'Liu' }, { zh: '楊', en: 'Yang' }, { zh: '許', en: 'Hsu' }, { zh: '鄭', en: 'Cheng' }, { zh: '謝', en: 'Hsieh' }, { zh: '洪', en: 'Hung' }],
    given: [{ zh: '文彬', en: 'Wen-Pin' }, { zh: '國明', en: 'Kuo-Ming' }, { zh: '柏睿', en: 'Po-Jui' }, { zh: '志豪', en: 'Chih-Hao' }, { zh: '承恩', en: 'Cheng-En' }],
    jpSurnames: ['中村', '小林', '加藤', '吉田', '山田', '佐々木'],
    jpGiven: ['一郎', '修', '隆', '剛', '淳'],
  },
};

export function resolveFormalMaleName(kind, rng = Math.random) {
  const pool = MALE_FORMAL_NAME_PARTS[kind];
  const pick = (values) => values[Math.floor(rng() * values.length)];
  const surname = pick(pool.surnames);
  const given = pick(pool.given);
  return { zh: `${surname.zh}${given.zh}`, en: `${surname.en} ${given.en}`, jp: `${pick(pool.jpSurnames)}${pick(pool.jpGiven)}` };
}
