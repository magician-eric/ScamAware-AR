import { useNavigate } from 'react-router-dom';
import { useSaveScenario02Progress } from '../../lib/scenario02Store';
import { MatchOverlay } from '../../apps/meetu';
import { t, getDatingLeadName } from './i18n';
import { getVisualAssetUrl } from '../../experience/characters/visuals';
import { useARInteraction } from '../../lib/arInteraction';

const DATING_LEAD_PHOTO = getVisualAssetUrl('dating_visual_03');

// Normal play never routes here - liking {datingLead}'s card in DatingBrowse shows
// MatchOverlay directly as an overlay on that same screen (no page jump, per
// the design note). This route exists only so /dating-match stays a stable,
// directly-linkable URL for testing this one beat in isolation.
export function DatingMatch() {
  useSaveScenario02Progress('/scenario02-romance/dating-match');
  const navigate = useNavigate();
  const person = { name: getDatingLeadName(), photo: DATING_LEAD_PHOTO };
  const openChat = () => navigate('/scenario02-romance/dating-chat');

  // AR Interaction Contract: one story action - open the conversation.
  useARInteraction({ mode: 'single', surfaceId: 'scenario02/dating-match', action: openChat });

  return (
    <MatchOverlay
      person={person}
      subtitle={t('{datingLead} 傳來了第一則訊息')}
      onStart={openChat}
    />
  );
}
