import { Subtitle } from './Subtitle';
import { ChoicePanel } from './ChoicePanel';

// The bottom half of every "call" scene: subtitle plate, the two-choice
// panel while a choice is pending (the subtitle pauses underneath it, per
// section 0.2), and the player-triggered continue button once the scene's
// script has played out - no scene ever advances itself except scene 01's
// incoming call.
export function DialogueLayer({ player, continueLabel, onContinue }) {
  return (
    <div className="pol-dialogue-layer">
      {!player.choice && (
        <Subtitle beat={player.current} />
      )}
      <ChoicePanel key={player.choice?.id} choice={player.choice} onChoose={player.choose} />
      {player.done && onContinue && (
        <button type="button" className="pol-cta" onClick={onContinue}>{continueLabel}</button>
      )}
    </div>
  );
}
