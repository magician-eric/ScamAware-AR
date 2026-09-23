import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStageClassName } from '../../shell/StageClassContext';
import { ChatScreen } from '../../apps/blackpi';
import { useDialogueEngine } from '../../features/shopping/dialogueEngine';
import { SELLER_CONVERSATION_KEY } from '../../features/shopping/conversationKeys';
import { buildHealthDisputeTree } from '../../data/dialogueTrees/health';
import { buildLuckyBagDisputeTree } from '../../data/dialogueTrees/luckyBag';
import { saveShoppingState } from '../../lib/shoppingStore';
import { useScenario04Lang, useT } from './i18n';
import { useARInteraction } from '../../lib/arInteraction';
import { FraudWarningBanner } from '../../components/warnings/FraudWarningBanner';

const WARNING_CONFIG = {
  changing_return_terms: { theme: 'shopping', severity: 'high', body: '賣家片面更改退貨條件，是常見的拖延退款手法。' },
};

const SHOP_NAME = { health: '智選家電生活館', luckyBag: '潮選數位通訊館' };
const START_ID = { health: 'health.dispute.opening', luckyBag: 'luckyBag.dispute.opening' };

// Screen 13 - 賣家售後對話 (post-receipt dispute).
export function DisputeChat() {
  useStageClassName('blackpi-stage');
  const navigate = useNavigate();
  const { route } = useParams();
  const lang = useScenario04Lang();
  const t = useT();
  const tree = useMemo(
    () => (route === 'health' ? buildHealthDisputeTree(lang) : buildLuckyBagDisputeTree(lang)),
    [route, lang],
  );
  const nodesById = useMemo(() => Object.fromEntries(tree.map((n) => [n.id, n])), [tree]);
  const engine = useDialogueEngine(nodesById, START_ID[route], { screenKey: SELLER_CONVERSATION_KEY(route) });
  const warningKey = engine.currentNodeId?.endsWith('stage2.pushBack') ? 'changing_return_terms' : null;
  const warning = WARNING_CONFIG[warningKey];

  useEffect(() => {
    if (!engine.done) return;
    if (engine.currentNodeId?.endsWith('.completedOrderExit')) {
      saveShoppingState({ orderStatus: 'completed' });
      navigate(`/scenario04-shopping/order/${route}`, { replace: true });
    } else if (engine.currentNodeId?.endsWith('.toReturn')) {
      navigate(`/scenario04-shopping/return-request/${route}`, { replace: true });
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
      surfaceId: `scenario04/dispute-chat/${engine.currentNodeId}`,
      left: () => engine.choose(engine.pendingChoices[0]),
      right: () => engine.choose(engine.pendingChoices[1]),
      disabled: engine.pendingChoices.some((choice) => choice.disabled),
    }
    : engine.pendingChoices?.length === 1
      ? {
        mode: 'single',
        surfaceId: `scenario04/dispute-chat/${engine.currentNodeId}`,
        action: () => engine.choose(engine.pendingChoices[0]),
        disabled: engine.pendingChoices[0].disabled,
      }
      : { mode: 'display', surfaceId: 'scenario04/dispute-chat' });

  return (
    <div className="blackpi-app bp-mood-dispute">
      <FraudWarningBanner active={Boolean(warning)} theme={warning?.theme} severity={warning?.severity} title={t('防詐風險提醒')} body={warning ? t(warning.body) : ''} duration={6000} />
      <ChatScreen
        headerTitle={t(SHOP_NAME[route])}
        headerSub={t('售後問題處理')}
        avatarLabel={t('賣')}
        engine={engine}
        onBack={() => navigate(`/scenario04-shopping/order/${route}`)}
      />
    </div>
  );
}
