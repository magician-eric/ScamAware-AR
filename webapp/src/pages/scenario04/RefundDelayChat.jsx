import { useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStageClassName } from '../../shell/StageClassContext';
import { ChatScreen } from '../../apps/blackpi';
import { useDialogueEngine } from '../../features/shopping/dialogueEngine';
import { SELLER_CONVERSATION_KEY } from '../../features/shopping/conversationKeys';
import { buildDelayTree } from '../../data/dialogueTrees/delay';
import { getShoppingState, saveShoppingState } from '../../lib/shoppingStore';
import { feedback } from '../../lib/feedback';
import { useScenario04Lang, useT } from './i18n';
import { useARInteraction } from '../../lib/arInteraction';

const SHOP_NAME = { health: '智選家電生活館', luckyBag: '好日子驚喜選物' };

// Screens 18-19 - 退款進度拖延 -> 賣家失聯. UI mood escalates: 拖延中 uses
// the normal palette with slower replies; once the seller goes unreachable
// the whole screen desaturates, the avatar turns grey, and the chat is
// read-only (see ChatScreen's shopClosed prop).
export function RefundDelayChat() {
  useStageClassName('blackpi-stage');
  const navigate = useNavigate();
  const { route } = useParams();
  const lang = useScenario04Lang();
  const t = useT();
  const tree = useMemo(() => buildDelayTree(route, lang), [route, lang]);
  const nodesById = useMemo(() => Object.fromEntries(tree.map((n) => [n.id, n])), [tree]);
  const engine = useDialogueEngine(nodesById, `${route}.delay.opening`, { screenKey: SELLER_CONVERSATION_KEY(route) });
  const unreachableFiredRef = useRef(false);

  const shopClosed = Boolean(
    engine.currentNodeId?.includes('unreachable') || engine.timeline.some((item) => item.key?.includes('unreachable')),
  );

  useEffect(() => {
    if (shopClosed) {
      saveShoppingState({ refundStatus: 'sellerUnreachable', sellerUnreachable: true });
      if (!unreachableFiredRef.current) {
        unreachableFiredRef.current = true;
        feedback('sellerUnreachable');
      }
    } else if (!getShoppingState().sellerUnreachable) {
      // shopClosed itself flips back to false once the conversation moves
      // past the unreachable nodes onto the terminal - without this guard,
      // reaching the terminal would downgrade refundStatus back to
      // 'delayed' right as the seller goes dark for good.
      saveShoppingState({ refundStatus: 'delayed' });
    }
  }, [shopClosed]);

  useEffect(() => {
    if (!engine.done) return;
    if (engine.currentNodeId?.endsWith('.toRefundCenter')) {
      navigate(`/scenario04-shopping/refund-center/${route}`, { replace: true });
    }
  }, [engine.done, engine.currentNodeId, navigate, route]);

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
      surfaceId: `scenario04/refund-delay/${engine.currentNodeId}`,
      left: () => engine.choose(engine.pendingChoices[0]),
      right: () => engine.choose(engine.pendingChoices[1]),
      disabled: engine.pendingChoices.some((choice) => choice.disabled),
    }
    : engine.pendingChoices?.length === 1
      ? {
        mode: 'single',
        surfaceId: `scenario04/refund-delay/${engine.currentNodeId}`,
        action: () => engine.choose(engine.pendingChoices[0]),
        disabled: engine.pendingChoices[0].disabled,
      }
      : { mode: 'display', surfaceId: 'scenario04/refund-delay' });

  return (
    <div className={`blackpi-app ${shopClosed ? 'bp-mood-unreachable' : 'bp-mood-delay'}`}>
      <ChatScreen
        headerTitle={t(SHOP_NAME[route])}
        headerSub={shopClosed ? t('店家暫停營業') : t('退款處理中')}
        avatarLabel={t('賣')}
        engine={engine}
        onBack={() => navigate(`/scenario04-shopping/refund-center/${route}`)}
        shopClosed={shopClosed}
      />
    </div>
  );
}
