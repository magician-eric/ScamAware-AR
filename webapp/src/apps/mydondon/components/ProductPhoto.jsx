import { Placeholder } from './Placeholder';

// Renders the real product photo once one exists on the product record,
// falling back to the labeled placeholder otherwise - swapping in
// photography for a product only means adding `image` in
// data/scenario05Products.js, not touching either of the screens
// (Listing, ProductSelect) that show it.
export function ProductPhoto({ product, className = '' }) {
  if (product.image) {
    return <img src={product.image} alt={product.name} className={`go-ph ${className}`.trim()} />;
  }
  return <Placeholder label={product.assetLabel} className={className} />;
}
