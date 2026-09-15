import { PhoneShell } from '../components/PhoneShell';
import { useT } from '../i18n';

const CATEGORIES = ['美妝保養', '生活雜貨', '3C 配件', '食品飲料', '寵物用品', '戶外運動', '居家收納', '精選商品'];

// 底部導覽・分類 - a plain non-interactive listing so the app reads complete.
//
// S04 remaining audit: the tiles said so in this comment but did not say so in
// the DOM - eight real <button>s with a pointer cursor and no onClick between
// them. Same defect AUD-07 named for 分享 on the PDP, and the reason this
// screen's host declares `display`: there is no story action here at all, so
// the tiles are plain divs.
//
// Nor is there one on the bar below them: 分類 is a BlackPi destination, not a
// story beat, and the whole screen is now scenery - the tiles, the header and
// the inert tab bar alike.
export function Category() {
  const t = useT();
  return (
    <PhoneShell nav="category">
      <header className="bp-header"><div className="bp-header-title">{t('分類')}</div></header>
      <div className="bp-scroll bp-page">
        <div className="bp-product-grid bp-section">
          {CATEGORIES.map((c) => (
            <div key={c} className="bp-card" style={{ textAlign: 'center' }}>
              {t(c)}
            </div>
          ))}
        </div>
      </div>
    </PhoneShell>
  );
}
