import { ArrowLeft } from 'lucide-react';
import { useT } from './i18n';

// The one way out of a 幣勝客 visit.
//
// Every trip into the platform used to end on a timer: the screen showed
// itself for a few seconds and then reported itself finished, which is
// exactly what a player could not follow - the platform was gone again
// before they had read what was on it. A visit now ends when the player
// says it ends, and this bar is the control that ends it.
//
// It is deliberately the only real control in the states that show it. The
// platform's own header icons, quick-action tiles and bottom tabs stay the
// inert decoration they have always been (aria-hidden / aria-disabled) and
// nothing here re-opens any of them, so there is never a second thing on
// screen competing to be "the button". Drawn as the last row of the app
// frame rather than floated over it: full width, in its own colour, so no
// card can cover it and it never reads as one more piece of the fake
// platform's chrome.
//
// Like every other Coin Winner control it reports one thing - the player
// asked to leave - and where that leads is the hosting scenario's decision
// (see pages/scenario02/CoinWinnerScreens.jsx).
export function ReturnBar({ onReturn }) {
  const t = useT();
  return (
    <div className="bition-return-bar">
      <button type="button" className="bition-return-cta" onClick={onReturn}>
        <ArrowLeft size={20} aria-hidden="true" />
        {t('返回 LINE 對話')}
      </button>
    </div>
  );
}
