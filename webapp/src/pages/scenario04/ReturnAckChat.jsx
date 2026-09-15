import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStageClassName } from '../../shell/StageClassContext';
import { ChatScreen } from '../../apps/blackpi';
import { useDialogueEngine } from '../../features/shopping/dialogueEngine';
import { SELLER_CONVERSATION_KEY } from '../../features/shopping/conversationKeys';
import { buildReturnAckTree } from '../../data/dialogueTrees/returnAck';
import { useScenario04Lang, useT } from './i18n';
import { useARInteraction } from '../../lib/arInteraction';
import { useShoppingState } from '../../lib/shoppingStore';

const SHOP_NAME = { health: '智選家電生活館', luckyBag: '好日子驚喜選物' };

// Seller's brief acknowledgement chat right after the return request is
// submitted (spec section 19), before the player generates a shipping code.
export function ReturnAckChat() {
  useStageClassName('blackpi-stage');
  const navigate = useNavigate();
  const { route } = useParams();
  const lang = useScenario04Lang();
  const t = useT();
  const [state] = useShoppingState();
  const evidenceAssets = state.returnEvidenceAssets;
  const tree = useMemo(() => buildReturnAckTree(route, lang, evidenceAssets), [route, lang, evidenceAssets]);
  const nodesById = useMemo(() => Object.fromEntries(tree.map((n) => [n.id, n])), [tree]);
  const engine = useDialogueEngine(nodesById, `${route}.returnAck.opening`, { screenKey: SELLER_CONVERSATION_KEY(route) });

  useEffect(() => {
    if (!engine.done) return;
    navigate(`/scenario04-shopping/return-shipping/${route}`, { replace: true });
  }, [engine.done, navigate, route]);

  // AR Interaction Contract. Every scenario04 chat runs on the shared dialogue
  // engine, so the geometry is read straight off the engine's own pending
  // choices - two replies is `dual` (LEFT = the first, exactly as the choice
  // grid draws them), one is `single`, and while the other side is typing
  // there is nothing to do at all. No node in these trees offers three, and
  // none may: a third reply has no gesture to run it, so it would leave the
  // player with a prompt they cannot answer. scripts/ar-interaction-migration
  // .test.mjs fails the moment one appears.
  useARInteraction(engine.pendingChoices?.length === 2
    ? {
      mode: 'dual',
      surfaceId: `scenario04/return-ack/${engine.currentNodeId}`,
      left: () => engine.choose(engine.pendingChoices[0]),
      right: () => engine.choose(engine.pendingChoices[1]),
      disabled: engine.pendingChoices.some((choice) => choice.disabled),
    }
    : engine.pendingChoices?.length === 1
      ? {
        mode: 'single',
        surfaceId: `scenario04/return-ack/${engine.currentNodeId}`,
        action: () => engine.choose(engine.pendingChoices[0]),
        disabled: engine.pendingChoices[0].disabled,
      }
      : { mode: 'display', surfaceId: 'scenario04/return-ack' });

  return (
    <div className="blackpi-app">
      <ChatScreen
        headerTitle={t(SHOP_NAME[route])}
        headerSub={t('退貨申請已提交，賣家須於 24 小時內回覆')}
        avatarLabel={t('賣')}
        engine={engine}
        onBack={() => navigate(-1)}
      />
    </div>
  );
}
