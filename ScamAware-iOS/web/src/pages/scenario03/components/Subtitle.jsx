import { getScenario03Strings } from '../i18n';
import { StressText } from './StressText';

// Section 0.3's subtitle layer: one line at a time, pinned above the bottom
// safe area over a dark translucent plate. Lines display in full the
// instant a beat becomes current - no per-character typewriter reveal -
// so a line stays fully readable even over background noise instead of
// still being drawn out when the player's attention lands on it. How long
// each line stays on screen before advancing to the next one is still
// controlled by useScriptPlayer (synced to the real recording's duration
// when one is playing, or a character-timed fallback otherwise); this
// component only ever renders the current beat's full text.
// `*詞*` marks a stress word (the pressure vocabulary the scam leans on -
// 限時/凍結/保密), rendered in the spec's pink-red by the shared StressText
// parser; player lines get a green 「你」 tag so it's always obvious who is
// speaking.
export function Subtitle({ beat }) {
  if (!beat) return null;

  const t = getScenario03Strings();

  return (
    <div className="pol-subtitle" aria-live="polite">
      <span className={`pol-subtitle-tag pol-tag-${beat.speaker ?? 'system'}`}>
        {beat.speaker === 'player' ? t.components.subtitleYou : beat.speakerLabel ?? ''}
      </span>
      <span className="pol-subtitle-text">
        <StressText text={beat.text} />
      </span>
    </div>
  );
}
