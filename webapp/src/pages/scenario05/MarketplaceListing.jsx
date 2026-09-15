import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Listing, getProduct } from '../../apps/mydondon';
import { getBuyer } from '../../data/scenario05Characters';
import { useScenario05State, getBuyerId } from '../../lib/scenario05Store';
import { useMarketplaceNav } from './useMarketplaceNav';
import { useT, useScenario05Lang } from './i18n';
import { useARInteraction } from '../../lib/arInteraction';

// Scenario 05 controller for the "just posted" listing screen.
//
// Everything the app shows here is story state supplied from this side: the
// item the player listed, who wrote to them (the fake buyer drawn for this
// run) and the first line of that message. MyDonDon only presents it, and
// reports back that the conversation should open - which in this scenario
// means the buyer chat.
export function MarketplaceListing() {
  const navigate = useNavigate();
  const t = useT();
  const lang = useScenario05Lang();
  const [state] = useScenario05State();
  const nav = useMarketplaceNav();
  const product = getProduct(state.selectedProduct, lang);
  const buyer = getBuyer(getBuyerId());

  useEffect(() => {
    if (!product) navigate('/scenario05-atm', { replace: true });
  }, [product, navigate]);

  // AR Interaction Contract: the listing has just gone up and the buyer has
  // written - opening that conversation is the one story action.
  useARInteraction(product
    ? {
      mode: 'single',
      surfaceId: 'scenario05/listing',
      action: () => navigate('/scenario05-atm/chat'),
    }
    : { mode: 'display', surfaceId: 'scenario05/listing-empty' });

  if (!product) return null;

  return (
    <Listing
      listing={product}
      incomingMessage={{
        sender: buyer,
        preview: t('你好～請問這台{product}還在嗎？…', { product: product.name }),
        time: '19:43',
      }}
      onOpenConversation={() => navigate('/scenario05-atm/chat')}
      nav={nav}
    />
  );
}
