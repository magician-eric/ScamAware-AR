import { useNavigate } from 'react-router-dom';
import { Home } from '../../apps/mydondon';
import { useMarketplaceNav } from './useMarketplaceNav';
import { useARInteraction } from '../../lib/arInteraction';

// Scenario 05 controller for MyDonDon's feed.
//
// The feed and its tab bar are pure presentation; every marketplace action
// they emit (刊登, 首頁, 訊息) is mapped to a story step here.
export function MarketplaceHome() {
  const navigate = useNavigate();
  const nav = useMarketplaceNav();
  const sellItem = () => navigate('/scenario05-atm/product-select');

  // AR Interaction Contract: 刊登 is the one story action on the feed; the tab
  // bar under it is fake App chrome and is never declared.
  useARInteraction({ mode: 'single', surfaceId: 'scenario05/marketplace-home', action: sellItem });

  return <Home onSellItem={sellItem} nav={nav} />;
}
