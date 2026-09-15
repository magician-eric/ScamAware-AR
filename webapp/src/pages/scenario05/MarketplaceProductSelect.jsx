import { useNavigate } from 'react-router-dom';
import { ProductSelect, getAllProducts } from '../../apps/mydondon';
import { clearDialogueCheckpoint, saveScenario05State } from '../../lib/scenario05Store';
import { useScenario05Lang } from './i18n';

// Scenario 05 controller for MyDonDon's 刊登 picker.
//
// Which item the player puts up for sale is this run's story state, so the
// choice is recorded here (`selectedProduct`) rather than inside the app, and
// publishing the listing is what moves the story on to the listing screen.
export function MarketplaceProductSelect() {
  const navigate = useNavigate();
  const lang = useScenario05Lang();
  return (
    <ProductSelect
      products={getAllProducts(lang)}
      onProductSelected={(id) => {
        clearDialogueCheckpoint('buyer');
        saveScenario05State({ selectedProduct: id });
      }}
      onListingPublished={() => navigate('/scenario05-atm/listing')}
      onBack={() => navigate('/scenario05-atm/home')}
    />
  );
}
