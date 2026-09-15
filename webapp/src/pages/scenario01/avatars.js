// Avatar images for scenario01's "Coach Chen" storyline (LineTeacher's 1:1
// chat header + VipGroup's group icon and per-sender message avatars).
//
// Every portrait below is resolved through the shared character registry by
// visual ID - scenario01 never names an image file or reaches into an asset
// folder itself. The files live under assets/shared/characters/<visualId>/,
// which is what lets a visual be cast in more than one scenario without either
// scenario reading the other's folder (see docs/asset-architecture.md).
import { getVisualAssetUrl } from '../../experience/characters/visuals';

export const COACH_CHEN_AVATAR = getVisualAssetUrl('scenario01_coach_chen');

// Keyed by the exact Chinese sender name as it appears in VipGroup's MESSAGES
// script (see VipGroup.jsx) - stable across zh/en/jp so a sender's photo
// doesn't change with the player's language, unlike the translated display
// name. Senders the cast system draws at random resolve through
// getScenario01CharacterBySlot instead and only fall back to this map; the
// three fixed scenario01 characters (陳老師 / 股海小白 / 財富自由ing) are
// pinned to their own visuals in the registry and are never re-cast.
export const VIP_GROUP_AVATARS = {
  '陳老師': COACH_CHEN_AVATAR,
  '阿凱': getVisualAssetUrl('male_visual_01'),
  'Jenny': getVisualAssetUrl('female_visual_01'),
  '股海小白': getVisualAssetUrl('scenario01_stock_rookie'),
  '王先生': getVisualAssetUrl('male_visual_03'),
  '小雅': getVisualAssetUrl('female_visual_02'),
  'Kevin': getVisualAssetUrl('male_visual_02'),
  '財富自由ing': getVisualAssetUrl('scenario01_wealth_freedom'),
};
