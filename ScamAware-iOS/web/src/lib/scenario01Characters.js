import { resolveCast, getCastName, validateResolvedCast } from '../experience/characters/casting';
import { getVisual } from '../experience/characters/visuals';

// v3 restores the assistant's fixed visual while keeping her name randomized
// independently from the VIP members.
const KEY = 'cibar-scenario01-character-cast-v3';
const REQUESTS = [
  { roleId: 'scenario01.investmentAssistant', slotId: 'investmentAssistant' },
  { roleId: 'scenario01.vipMember', slotId: 'vipFemale01', gender: 'female' },
  { roleId: 'scenario01.vipMember', slotId: 'vipFemale02', gender: 'female' },
  { roleId: 'scenario01.vipMember', slotId: 'vipMale01', gender: 'male' },
  { roleId: 'scenario01.vipMember', slotId: 'vipMale02', gender: 'male' },
  { roleId: 'scenario01.vipMember', slotId: 'vipMale03', gender: 'male' },
];

export function getScenario01Cast() {
  const saved = sessionStorage.getItem(KEY);
  if (saved) {
    const cast = JSON.parse(saved);
    validateResolvedCast(cast);
    return cast;
  }
  const cast = resolveCast('scenario01', REQUESTS);
  sessionStorage.setItem(KEY, JSON.stringify(cast));
  return cast;
}

export function resetScenario01Cast() {
  sessionStorage.removeItem(KEY);
  const cast = resolveCast('scenario01', REQUESTS);
  sessionStorage.setItem(KEY, JSON.stringify(cast));
  return cast;
}

export function getScenario01CharacterBySlot(slot, lang = 'zh') {
  const cast = getScenario01Cast();
  const role = cast.roles[slot];
  const avatar = getVisual(role.visualId)?.assets.avatar;
  return { name: getCastName(cast, slot, lang), avatar: avatar ? `${import.meta.env.BASE_URL}${avatar}` : undefined };
}
