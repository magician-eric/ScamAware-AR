import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PhoneShell } from '../../apps/mydondon';
import { ChatScreen } from '../../apps/mydondon';
import { BuyerAvatar } from '../../apps/mydondon';
import { useDialogueEngine } from '../../features/ghostorder/dialogueEngine';
import { buildBuyerTree } from '../../data/scenario05Dialogues';
import { getProduct } from '../../apps/mydondon';
import { BUYER_PROFILE, getBuyer } from '../../data/scenario05Characters';
import { useScenario05State, getBuyerId } from '../../lib/scenario05Store';
import { useT, useScenario05Lang } from './i18n';
import { useARInteraction } from '../../lib/arInteraction';

// Screens S03 / S04 / S04b / S06 / S07 / S09 / S09b - the single ongoing
// conversation with the fake buyer, inside MyDonDon.
//
// Still fully MyDonDon context (spec section 16): brand header, brand bubbles.
// What it does NOT have is the feed's tab bar - a one-to-one chat is a pushed
// screen (spec section 17). Several nodes hand off to 黑皮通's website and come
// back into this same conversation rather than starting a new one; leaving the
// app is a real context switch on those screens, not a themed sub-page.
export function BuyerChat() {
  const navigate = useNavigate();
  const t = useT();
  const lang = useScenario05Lang();
  const [state] = useScenario05State();
  const product = getProduct(state.selectedProduct, lang);
  const buyer = getBuyer(getBuyerId());

  const tree = useMemo(() => (product ? buildBuyerTree(product, lang) : []), [product, lang]);
  const nodesById = useMemo(() => Object.fromEntries(tree.map((n) => [n.id, n])), [tree]);
  const engine = useDialogueEngine(nodesById, 'buyer.s03.open', {
    screenKey: 'buyer',
    onRedirect: (to) => navigate(to),
  });

  useEffect(() => {
    if (!product) navigate('/scenario05-atm', { replace: true });
  }, [product, navigate]);

  // AR Interaction Contract, read off the dialogue engine's own pending
  // choices: two replies is `dual` (LEFT = the first, in the order ChoiceList
  // stacks them), one is `single`, and while the buyer is typing - or while a
  // node is handing off to the outside trade site - there is nothing to do.
  // Declared here, in the screen that knows the current choice node; MyDonDon's
  // ChatScreen renders the pills without knowing what any of them mean.
  useARInteraction(engine.pendingChoices?.length === 2
    ? {
      mode: 'dual',
      surfaceId: `scenario05/buyer-chat/${engine.currentNodeId}`,
      left: () => engine.choose(engine.pendingChoices[0]),
      right: () => engine.choose(engine.pendingChoices[1]),
    }
    : engine.pendingChoices?.length === 1
      ? {
        mode: 'single',
        surfaceId: `scenario05/buyer-chat/${engine.currentNodeId}`,
        action: () => engine.choose(engine.pendingChoices[0]),
      }
      : { mode: 'display', surfaceId: 'scenario05/buyer-chat' });

  if (!product) return null;

  return (
    <PhoneShell context="mydondon">
      <ChatScreen
        engine={engine}
        choicePrompt={t('快速回覆')}
        avatar={<BuyerAvatar buyer={buyer} size={34} />}
        name={buyer.name}
        status={t(BUYER_PROFILE.statusKey)}
        introContent={(
          <div className="md-chat-intro">
            <BuyerAvatar buyer={buyer} size={52} />
            <div className="md-chat-intro-name">{buyer.name}</div>
            <div className="md-chat-intro-meta">
              {t(BUYER_PROFILE.profileKey).split('\n').map((line, i, arr) => (
                <span key={line}>
                  {line}
                  {i < arr.length - 1 && <br />}
                </span>
              ))}
            </div>
          </div>
        )}
      />
    </PhoneShell>
  );
}
