// Scenario05 compatibility adapter. The marketplace buyer's visual and names
// are owned by the shared registry/cast; scenario code never owns an actor or
// reaches into another scenario's asset paths directly.
import { getLanguage } from '../lib/lang';
import { getCastName } from '../experience/characters/casting';
import { getVisual } from '../experience/characters/visuals';

// Fixed for every run regardless of who was drawn - the buyer's scenario05
// identity is "an ordinary MyDonDon user", not the persona she has elsewhere.
// Copy keys are translated at the rendering boundary.
export const BUYER_PROFILE = {
  statusKey: '在線上',
  profileKey: '已加入 MyDonDon 4 年 ・ 有一般生活貼文\n共同社團：二手交易交流',
};

export function getBuyer(cast) {
  const role = cast?.roles?.marketplaceBuyer;
  const visual = getVisual(role?.visualId) ?? getVisual('female_visual_01');
  const lang = ['en', 'jp'].includes(getLanguage()) ? getLanguage() : 'zh';
  return { id: visual.id, name: getCastName(cast, 'marketplaceBuyer', lang), avatarPath: visual.assets.avatar };
}

// The player's own name as pre-filled sender info on the fake trading site
// (see ShopCreate.jsx) - drawn once per run from the same shared name pool
// as every other cast member, never hardcoded and never asked of the player.
export function getSellerName(cast, lang = 'zh') {
  return getCastName(cast, 'sellerSender', lang);
}
