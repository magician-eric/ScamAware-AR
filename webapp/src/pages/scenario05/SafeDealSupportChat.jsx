import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PhoneShell } from '../../apps/mydondon';
import { BrowserChrome } from './components/BrowserChrome';
import { SuqubianSiteHeader } from './components/SuqubianSiteHeader';
import { SafeDealSupportSurface } from './components/SafeDealSupportSurface';
import { useDialogueEngine } from '../../features/ghostorder/dialogueEngine';
import { buildSupportTree } from '../../data/scenario05Dialogues';
import { markVerificationRequested } from '../../lib/scenario05Store';
import { FAKE_TRADE_SITE_BRAND, FAKE_TRADE_SITE_DOMAIN } from '../../data/scenario05FakeSite';
import { useT, useScenario05Lang } from './i18n';
import { useARInteraction } from '../../lib/arInteraction';

// SafeDeal（假交易網站）・客服中心 - the second conversation of the scenario,
// and the one that takes the money.
//
// It is still a website, not an app: browser chrome, the site's own masthead,
// and none of MyDonDon's chrome (see SafeDealSupportSurface for why this is
// its own surface rather than a reskin of MyDonDon's chat). 黑皮通 never
// appears here at all - HPE is real logistics and runs no support desk, no
// verification and no payments anywhere in this story.
//
// The conversation is checkpointed under its own screenKey, so the trip out
// to the simulated transfer comes back into this same thread at cs.done
// rather than replaying the agent's script - and so does a refresh.
export function SafeDealSupportChat() {
  const navigate = useNavigate();
  const t = useT();
  const lang = useScenario05Lang();

  const tree = useMemo(() => buildSupportTree(lang), [lang]);
  const nodesById = useMemo(() => Object.fromEntries(tree.map((n) => [n.id, n])), [tree]);
  const engine = useDialogueEngine(nodesById, 'cs.open', {
    screenKey: 'safedeal-support',
    onRedirect: (to) => navigate(to, { replace: true }),
  });

  // The demand has actually been put to the player. Recorded here rather than
  // on the reply, because it is true whichever way they answer - and it must
  // not walk backwards when this screen is resumed after the transfer (see
  // markVerificationRequested).
  useEffect(() => {
    if (engine.currentNodeId === 'cs.flow') markVerificationRequested();
  }, [engine.currentNodeId]);

  // AR Interaction Contract, read off the engine's own pending choices,
  // exactly as BuyerChat does: two replies is `dual` (LEFT = the first as the
  // list stacks them), one is `single`, and while the agent is "typing", while
  // the fake identity check plays, or while a node is handing off to the
  // transfer screen there is nothing to do.
  useARInteraction(engine.pendingChoices?.length === 2
    ? {
      mode: 'dual',
      surfaceId: `scenario05/safedeal-support/${engine.currentNodeId}`,
      left: () => engine.choose(engine.pendingChoices[0]),
      right: () => engine.choose(engine.pendingChoices[1]),
    }
    : engine.pendingChoices?.length === 1
      ? {
        mode: 'single',
        surfaceId: `scenario05/safedeal-support/${engine.currentNodeId}`,
        action: () => engine.choose(engine.pendingChoices[0]),
      }
      : { mode: 'display', surfaceId: 'scenario05/safedeal-support' });

  return (
    <PhoneShell context="hpefake">
      <BrowserChrome domain={FAKE_TRADE_SITE_DOMAIN} />
      <SuqubianSiteHeader section={t('客服中心')} brand={FAKE_TRADE_SITE_BRAND} tag={t('安全交易・安心收付')} />
      <SafeDealSupportSurface engine={engine} choicePrompt={t('快速回覆')} />
    </PhoneShell>
  );
}
