// {datingLead}'s two guesthouse photos in the private chat (the Yilan villa
// room + the booking screenshot). They are story props owned by scenario02,
// not by whoever is cast as {datingLead} - so they come from this scenario's
// folder, not the character registry.
//
// Extracted out of PrivateChat.jsx for the same reason teacherVideo.js and
// heroLayout.js exist: a locale-coverage check
// (scripts/validate-localized-assets.mjs) can read a data module but not a
// component that has to be rendered.
//
// The booking screenshot has its whole order page drawn into it (訂單已確認 /
// 付款成功 / 總金額 TWD 10,800), and the chat opens it full-size on its own
// for 6 seconds, so it is one image per language. The room photo has no text
// in it and stays one file for every language.
const CHAT_IMG_DIR = `${import.meta.env?.BASE_URL ?? '/'}assets/scenarios/scenario-02/images/chat/`;

export const GUESTHOUSE_ROOM_IMG = `${CHAT_IMG_DIR}photo-villa-room.webp`;

export const GUESTHOUSE_BOOKING_IMG_BY_LANG = {
  zh: `${CHAT_IMG_DIR}photo-villa-booking-paid.webp`,
  en: `${CHAT_IMG_DIR}photo-villa-booking-paid-en.webp`,
  jp: `${CHAT_IMG_DIR}photo-villa-booking-paid-jp.webp`,
};
