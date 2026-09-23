import { AssetImage } from './AssetImage';
import { useT } from '../i18n';

export function ProductCard({ product, onClick, highlighted = false }) {
  const t = useT();
  return (
    <button
      type="button"
      className={`bp-product-card${highlighted ? ' bp-product-card-highlighted' : ''}`}
      onClick={onClick}
      aria-label={t(product.name)}
    >
      <AssetImage assetKey={product.assetKey} label={product.assetLabel} size="" dashed={false} />
      <div className="bp-product-info">
        <div className="bp-product-name">{t(product.name)}</div>
        <div className="bp-product-price">
          NT${product.price.toLocaleString()}
          {product.shipping === 0 && <small>{t('免運')}</small>}
        </div>
        <div className="bp-product-meta">{t('已售')} {product.sold.toLocaleString()} ・ {product.rating} {t('分')}</div>
      </div>
    </button>
  );
}
