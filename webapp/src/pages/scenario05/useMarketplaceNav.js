import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

// Which story step each of MyDonDon's live tabs leads to in this scenario.
// The app's tab bar only reports which tab was tapped; this hook is the one
// place that turns those taps into Scenario 05 routes.
export function useMarketplaceNav() {
  const navigate = useNavigate();
  return useMemo(() => ({
    onHome: () => navigate('/scenario05-atm/home'),
    onSellItem: () => navigate('/scenario05-atm/product-select'),
    onMessages: () => navigate('/scenario05-atm/chat'),
  }), [navigate]);
}
