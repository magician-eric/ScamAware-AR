import { useNavigate } from 'react-router-dom';
import { MyDonDonOrders } from '../../apps/mydondon';
import { useARInteraction } from '../../lib/arInteraction';

// Scenario 05 controller for MyDonDon's own order list (spec section B).
//
// The buyer never ordered through MyDonDon at all, so this run has no
// official order to hand over: the app is given an empty order list and
// says so. Finding nothing is the beat the story is built on - the player
// reads "目前沒有新的交易訂單" and goes back to the conversation, where the
// fake buyer explains it away. Which step that return lands on is decided
// here, not by the app: `replace` keeps the detour out of the history so
// the chat resumes at its saved checkpoint (see buyer.s07.toOrders /
// buyer.s07.playerNotice in data/scenario05Dialogues.js).
const NO_OFFICIAL_ORDERS = [];

export function MarketplaceOrders() {
  const navigate = useNavigate();
  const backToChat = () => navigate('/scenario05-atm/chat', { replace: true });

  // AR Interaction Contract: finding nothing IS the beat, so the only story
  // action here is going back to the conversation with that fact in hand.
  useARInteraction({ mode: 'single', surfaceId: 'scenario05/mydondon-orders', action: backToChat });

  return (
    <MyDonDonOrders
      orders={NO_OFFICIAL_ORDERS}
      onBack={backToChat}
    />
  );
}
