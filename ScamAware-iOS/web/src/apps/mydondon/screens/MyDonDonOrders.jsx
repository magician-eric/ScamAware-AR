import { ChevronLeft, PackageSearch } from 'lucide-react';
import { PhoneShell } from '../components/PhoneShell';
import { useT } from '../i18n';

// MyDonDon's own order/transaction record - the one place a real order
// placed through MyDonDon would actually show up.
//
// `orders` is whatever the caller hands in. When it is empty the screen says
// so ("目前沒有新的交易訂單"), which is a real answer from the marketplace,
// not a loading or error state - MyDonDon simply has no order on file. What
// that answer means for the story, and where the player goes next, is the
// caller's decision (`onBack`), not this screen's.
//
// The player must actively choose to leave: no auto-navigation timer, and the
// only way out is the explicit primary button (spec section C) - they need
// time to actually read "沒有訂單". Reuses the same back-header pattern as
// ProductSelect.jsx and the same empty-card visual language as MyDonDon's
// quoted-card bubble, just without any 黑皮通 head bar - this card belongs to
// MyDonDon, not to a message someone else sent.
export function MyDonDonOrders({ orders = [], onBack }) {
  const t = useT();

  return (
    <PhoneShell context="mydondon">
      <header className="md-subheader">
        <span className="md-icon-btn md-icon-display" aria-hidden="true">
          <ChevronLeft size={22} />
        </span>
        <span className="md-subheader-title">{t('我的訂單')}</span>
      </header>
      <div className="go-scroll md-pick-page">
        {orders.length === 0 ? (
          <div className="md-quoted-card">
            <div className="md-quoted-card-body">
              <span className="md-quoted-card-icon" aria-hidden="true"><PackageSearch size={20} /></span>
              <div className="md-quoted-card-title">{t('目前沒有新的交易訂單')}</div>
              <p>{t('目前沒有任何買家透過 MyDonDon 對這件商品下單。')}</p>
            </div>
          </div>
        ) : (
          orders.map((order) => (
            <div className="md-quoted-card" key={order.id}>
              <div className="md-quoted-card-body">
                <div className="md-quoted-card-title">{order.title}</div>
                <p>{order.detail}</p>
              </div>
            </div>
          ))
        )}
        <div className="go-spacer" />
        <button type="button" className="md-btn" onClick={onBack}>{t('返回對話')}</button>
      </div>
    </PhoneShell>
  );
}
