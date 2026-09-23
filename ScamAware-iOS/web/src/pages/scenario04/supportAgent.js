import { getPlatformAgentCast } from '../../lib/shoppingStore';
import { getCastName } from '../../experience/characters/casting';
import { getVisualAssetUrl } from '../../experience/characters/visuals';
import { useScenario04Lang } from './i18n';

// The 黑皮安心專員's identity for this run, as ONE profile: { name, avatar }.
//
// Both halves come out of the same persisted cast entry (shoppingStore's
// getPlatformAgentCast -> characterCast.roles.platformAgent), which is drawn
// once per run and then read back. That is the whole point of building the
// profile here rather than letting each screen reach for a name and a face
// separately: there is no second random call to fall out of step with the
// first, so the header can never end up showing one woman's photo next to
// another woman's name, and neither changes on a re-render, a language
// switch, or a return to the screen after navigating away.
export function getSupportAgentProfile(lang) {
  const cast = getPlatformAgentCast();
  return {
    name: getCastName(cast, 'platformAgent', lang),
    avatar: getVisualAssetUrl(cast?.roles?.platformAgent?.visualId),
  };
}

// Hook form, bound to the language the player picked. Only the displayed name
// is language-dependent - it is the same cast entry in all three languages,
// so switching language re-labels her, it never recasts her.
export function useSupportAgent() {
  return getSupportAgentProfile(useScenario04Lang());
}
