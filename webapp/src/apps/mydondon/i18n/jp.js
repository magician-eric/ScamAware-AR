// Japanese dictionary for the MyDonDon (買東東) App module.
//
// The App owns its UI, so it owns its UI copy: every string here is rendered
// by a screen or component under apps/mydondon/ and by nothing else. It used
// to live in Scenario 05's dictionary, which made a story
// module the owner of another module's buttons and tabs (§13 AD-14). The
// values are the ones that were already on screen, moved across unchanged -
// this was an ownership move, not a re-translation.
//
// Keyed off the Chinese source string exactly as it appears in the JSX, the
// same convention every dictionary in this repo uses; see
// shared/i18n/createTranslator.js for how a key is looked up and what happens
// when one is missing. Grouped by the file that renders each string.
//
// A label another App also renders (返回, 首頁, 訊息) is deliberately repeated
// in that App's own table rather than shared: ownership follows the UI, not
// the spelling (spec section 3.6).
//
// The internal locale code for Japanese is always 'jp', never 'ja'.
export const JP = {
  // apps/mydondon/brand/manifest.js
  '買東東': 'MyDonDon',

  // apps/mydondon/components/ChatScreen.jsx
  '對方輸入中': '相手が入力中',
  '返回': '戻る',

  // apps/mydondon/components/ChoiceList.jsx
  '選擇你的回覆': '返信を選択',

  // apps/mydondon/components/MyDonDonBottomNav.jsx
  'MyDonDon 主要導覽': 'MyDonDon メインナビゲーション',
  '探索': '探す',
  '刊登': '出品',
  '我的': 'マイページ',
  '首頁': 'ホーム',
  '訊息': 'メッセージ',

  // apps/mydondon/components/MyDonDonHeader.jsx
  '通知': '通知',
  '搜尋': '検索',

  // apps/mydondon/components/MyDonDonPushNotice.jsx
  '{name} 傳來新訊息': '{name}から新着メッセージ',

  // apps/mydondon/components/Placeholder.jsx
  '圖片佔位：{label}': '画像プレースホルダー：{label}',

  // apps/mydondon/screens/Home.jsx
  '搜尋二手好物': '中古品を検索',
  '把閒置變現金': '使わない物を現金に',
  '簡單刊登，讓好物找到新主人': 'かんたん出品で、大切な物を次の人へ',
  '我要賣・刊登商品 →': '売りたい・商品を出品する →',

  // apps/mydondon/screens/Listing.jsx
  '我的帳號': 'マイアカウント',
  '我': '自分',
  '19:42 發布 ・ 二手拍賣': '19:42に出品・中古品マーケット',
  '瀏覽 36': '閲覧36',
  '收藏 2': 'お気に入り2',
  '留言 1': 'コメント1',

  // apps/mydondon/screens/MyDonDonOrders.jsx
  '我的訂單': 'マイ注文',
  '目前沒有新的交易訂單': '現在、新しい注文はありません',
  '目前沒有任何買家透過 MyDonDon 對這件商品下單。': 'この商品について、MyDonDonを通じて注文した購入者はいません。',
  '返回對話': 'チャットに戻る',

  // apps/mydondon/screens/PhoneHome.jsx
  '開啟買東東 MyDonDon': 'MyDonDonを開く',

  // apps/mydondon/screens/ProductSelect.jsx
  '刊登商品': '商品を出品する',
  '選擇要出售的商品': '出品する商品を選ぶ',
  '選擇一件商品開始刊登': '商品を1点選んで出品を始めましょう',
};
