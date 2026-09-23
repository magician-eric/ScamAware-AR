import { useNavigate } from 'react-router-dom';
import { PhoneHome } from '../../apps/mydondon';
import { useARInteraction } from '../../lib/arInteraction';

// Scenario 05 controller for the phone desktop.
//
// The desktop screen itself belongs to MyDonDon (apps/mydondon); this wrapper
// is the only place that knows opening the app means walking into this
// scenario's marketplace home.
export function MarketplacePhoneHome() {
  const navigate = useNavigate();
  const openApp = () => navigate('/scenario05-atm/home');

  // AR Interaction Contract: one app icon, one story action.
  useARInteraction({ mode: 'single', surfaceId: 'scenario05/phone-home', action: openApp });

  return <PhoneHome onOpenApp={openApp} />;
}
