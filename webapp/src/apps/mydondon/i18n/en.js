// English dictionary for the MyDonDon (買東東) App module.
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
export const EN = {
  // apps/mydondon/brand/manifest.js
  '買東東': 'MyDonDon',

  // apps/mydondon/components/ChatScreen.jsx
  '對方輸入中': 'Other person is typing',
  '返回': 'Back',

  // apps/mydondon/components/ChoiceList.jsx
  '選擇你的回覆': 'Choose your reply',

  // apps/mydondon/components/MyDonDonBottomNav.jsx
  'MyDonDon 主要導覽': 'MyDonDon main navigation',
  '探索': 'Explore',
  '刊登': 'Sell',
  '我的': 'Me',
  '首頁': 'Home',
  '訊息': 'Messages',

  // apps/mydondon/components/MyDonDonHeader.jsx
  '通知': 'Notifications',
  '搜尋': 'Search',

  // apps/mydondon/components/MyDonDonPushNotice.jsx
  '{name} 傳來新訊息': 'New message from {name}',

  // apps/mydondon/components/Placeholder.jsx
  '圖片佔位：{label}': 'Image placeholder: {label}',

  // apps/mydondon/screens/Home.jsx
  '搜尋二手好物': 'Search secondhand finds',
  '把閒置變現金': 'Turn unused items into cash',
  '簡單刊登，讓好物找到新主人': 'List easily and find your items a new home',
  '我要賣・刊登商品 →': 'Sell an item — list it now →',

  // apps/mydondon/screens/Listing.jsx
  '我的帳號': 'My Account',
  '我': 'Me',
  '19:42 發布 ・ 二手拍賣': 'Posted at 19:42 · Secondhand Marketplace',
  '瀏覽 36': '36 views',
  '收藏 2': '2 saved',
  '留言 1': '1 comment',

  // apps/mydondon/screens/MyDonDonOrders.jsx
  '我的訂單': 'My Orders',
  '目前沒有新的交易訂單': 'No New Orders Right Now',
  '目前沒有任何買家透過 MyDonDon 對這件商品下單。': 'No buyer has placed an order for this item through MyDonDon.',
  '返回對話': 'Back to Conversation',

  // apps/mydondon/screens/PhoneHome.jsx
  '開啟買東東 MyDonDon': 'Open MyDonDon',

  // apps/mydondon/screens/ProductSelect.jsx
  '刊登商品': 'List an item',
  '選擇要出售的商品': 'Choose the item to sell',
  '選擇一件商品開始刊登': 'Pick one item to start listing',
};
