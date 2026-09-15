// A dialogue checkpoint is scoped by CONVERSATION, not by screen.
//
// 賣家聊聊 (pre-sale), the 貨不對版 dispute, the return acknowledgement and the
// refund-delay chase are four screens, but they are all the same shop - the
// header shows the same shop name on every one of them. They therefore share
// this key, so each stage appends to the running history instead of opening a
// fresh, empty room with that shop's name at the top, and the player can
// still scroll back to what the seller promised before they paid.
//
// The platform's own support chat and the 165 hotline are different parties
// and keep their own keys.
export const SELLER_CONVERSATION_KEY = (route) => `seller-${route}`;
