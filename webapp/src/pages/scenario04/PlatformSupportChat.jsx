import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { useStageClassName } from '../../shell/StageClassContext';
import { ChatScreen } from '../../apps/blackpi';
import { useDialogueEngine } from '../../features/shopping/dialogueEngine';
import { buildPlatformSupportTree } from '../../data/dialogueTrees/platformSupport';
import { saveShoppingState } from '../../lib/shoppingStore';
import { useSupportAgent } from './supportAgent';
import { useScenario04Lang, useT } from './i18n';
import { useARInteraction } from '../../lib/arInteraction';

// Screen 21 - 黑皮客服: 黑皮智能客服 (bot triage) hands off to 黑皮安心專員
// (human specialist) partway through - the header switches between the two
// depending on which stage the current node belongs to.
export function PlatformSupportChat() {
  useStageClassName('blackpi-stage');
  const navigate = useNavigate();
  const { route } = useParams();
  const lang = useScenario04Lang();
  const t = useT();
  const tree = useMemo(() => buildPlatformSupportTree(lang), [lang]);
  const nodesById = useMemo(() => Object.fromEntries(tree.map((n) => [n.id, n])), [tree]);
  const engine = useDialogueEngine(nodesById, 'shared.platform.bot.opening', { screenKey: `platform-${route}` });

  useEffect(() => {
    if (!engine.done) return;
    // reported is the single fact the ending outcome is computed from (see
    // OutcomeResult.jsx) - contacting the platform, by itself, never sets it.
    if (engine.currentNodeId?.endsWith('.toResultSuccess')) {
      saveShoppingState({ reported: true });
      navigate(`/scenario04-shopping/result/${route}/success`, { replace: true });
    } else if (engine.currentNodeId?.endsWith('.toResultFail')) {
      saveShoppingState({ reported: false });
      navigate(`/scenario04-shopping/result/${route}/fail`, { replace: true });
    }
  }, [engine.done, engine.currentNodeId, navigate, route]);

  const isAgentStage = engine.currentNodeId?.startsWith('shared.platform.agent');
  // The specialist is a person, so she has a name AND a face - one profile
  // drawn once per run from the shared character registry and persisted by
  // the store, so the same woman greets the player on every render, after a
  // refresh, and in all three languages.
  const agent = useSupportAgent();

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
      surfaceId: `scenario04/platform-support/${engine.currentNodeId}`,
      left: () => engine.choose(engine.pendingChoices[0]),
      right: () => engine.choose(engine.pendingChoices[1]),
      disabled: engine.pendingChoices.some((choice) => choice.disabled),
    }
    : engine.pendingChoices?.length === 1
      ? {
        mode: 'single',
        surfaceId: `scenario04/platform-support/${engine.currentNodeId}`,
        action: () => engine.choose(engine.pendingChoices[0]),
        disabled: engine.pendingChoices[0].disabled,
      }
      : { mode: 'display', surfaceId: 'scenario04/platform-support' });

  return (
    <div className="blackpi-app">
      {/* The bot speaks as 黑皮購物 itself, so it wears the storefront's own
          mark - the same ShoppingBag-in-a-tile lockup as the home header's
          .bp-logo-mark. The 安心專員 is a named person, so she gets her photo:
          a role initial ("專") in the avatar circle is what a system account
          looks like, not what a person you are talking to looks like. */}
      <ChatScreen
        headerTitle={isAgentStage ? agent.name : t('黑皮智能客服')}
        headerRole={isAgentStage ? t('黑皮安心專員') : null}
        headerSub={isAgentStage ? t('真人客服・已為您轉接') : t('官方認證・自動回覆中')}
        avatarLabel={isAgentStage
          ? <img className="bp-chat-avatar-photo" src={agent.avatar} alt="" />
          : <ShoppingBag size={17} />}
        avatarVariant={isAgentStage ? 'photo' : 'brand'}
        engine={engine}
        onBack={() => navigate(`/scenario04-shopping/refund-center/${route}`)}
      />
    </div>
  );
}
