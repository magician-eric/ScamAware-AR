// English dictionary for the MeetU (覓友) App module.
//
// The App owns its UI, so it owns its UI copy: every string here is rendered
// by a screen or component under apps/meetu/ and by nothing else. It used
// to live in Scenario 02's dictionary, which made a story
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
  // apps/meetu/components/MatchOverlay.jsx
  '配對成功': "It's a Match",
  '開始聊天': 'Start Chatting',

  // apps/meetu/components/MeetUBottomNav.jsx
  '個人檔案': 'Profile',
  '探索': 'Discover',
  '訊息': 'Messages',

  // apps/meetu/components/MeetUSwipeActions.jsx
  '喜歡': 'Like',
  '略過': 'Pass',

  // apps/meetu/components/SuggestedReplies.jsx
  '選擇一個回覆': 'Pick a Reply',

  // apps/meetu/screens/MeetULandingScreen.jsx
  '遇見，怦然心動的開始': 'Where the right swipe begins',
  '上千位真實用戶，就在你附近': 'Thousands of real people, right around you',
  '附近活躍用戶': 'Active Nearby',
  '今日新配對': 'Matches Today',
  '立即開始配對': 'Start Matching',
};
