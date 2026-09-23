import { PhoneShell } from '../components/PhoneShell';
import { AssetImage } from '../components/AssetImage';
import { getProductByRoute } from '../data/catalog';
import { useT } from '../i18n';

const STATUS_LABEL = {
  none: '尚未下單', placed: '已下單', paid: '已付款', preparing: '賣家備貨中',
  shipped: '已出貨', shipping: '配送中', delivered: '已送達', completed: '訂單已完成',
};

// 底部導覽・訂單. `order` is supplied by whoever mounts the App - the App
// itself never reads the run's order state, and opening the order is reported
// rather than navigated.
export function Orders({ order, onOpenOrder }) {
  const t = useT();
  const product = order?.productRoute ? getProductByRoute(order.productRoute) : null;

  return (
    <PhoneShell nav="orders">
      <header className="bp-header"><div className="bp-header-title">{t('我的訂單')}</div></header>
      <div className="bp-scroll bp-page">
        {!product && <p className="bp-muted bp-section">{t('目前沒有訂單。')}</p>}
        {product && (
          <button type="button" className="bp-list-row" style={{ width: '100%', textAlign: 'left', background: 'none', border: 0, cursor: 'pointer' }} onClick={() => onOpenOrder?.(order.productRoute)}>
            <AssetImage assetKey={product.assetKey} label={product.assetLabel} size="" dashed={false} />
            <div style={{ minWidth: 0 }}>
              <div className="bp-product-name" style={{ minHeight: 0 }}>{t(product.name)}</div>
              <div className="bp-badge neutral" style={{ marginTop: 6 }}>{t(STATUS_LABEL[order.status]) || order.status}</div>
            </div>
          </button>
        )}
      </div>
    </PhoneShell>
  );
}
