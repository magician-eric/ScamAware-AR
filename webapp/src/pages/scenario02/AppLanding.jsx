import { useNavigate } from 'react-router-dom';
import { useStageClassName } from '../../shell/StageClassContext';
import { useSaveScenario02Progress } from '../../lib/scenario02Store';
import { MeetULandingScreen } from '../../apps/meetu';
import { getVisualAssetUrl } from '../../experience/characters/visuals';
import { useARInteraction } from '../../lib/arInteraction';

// The teaser faces on MeetU's splash are the exact three people the player is
// about to swipe through ({datingCandidate01}/{datingCandidate02}/{datingLead}) - reusing their existing
// profile photos rather than sourcing new stock images, so "who's here"
// isn't a promise the app immediately breaks once browsing starts. The photos
// come from the shared character registry, so MeetU never holds a second copy.
const TEASER_PHOTOS = ['dating_visual_01', 'dating_visual_02', 'dating_visual_03'].map((id) => getVisualAssetUrl(id));

// Scenario02 decides that the story opens on MeetU's splash and that starting
// matching leads to the swipe deck; the splash itself is the app's own screen.
export function AppLanding() {
  useSaveScenario02Progress('/scenario02-romance/app-landing');
  useStageClassName('meetu-stage');
  const navigate = useNavigate();
  const start = () => navigate('/scenario02-romance/dating-browse');

  // AR Interaction Contract: MeetU's splash has one story action - start
  // matching - so `single`.
  useARInteraction({ mode: 'single', surfaceId: 'scenario02/app-landing', action: start });

  return (
    <MeetULandingScreen
      teaserPhotos={TEASER_PHOTOS}
      onStart={start}
    />
  );
}
