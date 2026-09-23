import { ArrowRight } from 'lucide-react';
import { AssetImage } from '../../../apps/blackpi';
import { useT } from '../i18n';

// 「商品頁宣稱 vs 實際收到」comparison, built in React + CSS rather than
// baked into an image - so the claim/actual wording is translated live
// through the scenario's CN/EN/JP dictionary instead of being frozen into
// pixels, and stays readable at any width.
//
// Layout (see .bp-cva* in styles/blackpi.css):
//   narrow phone  - claim photo above, actual photo below, arrow between
//   >= 400px      - the two photos side by side
// Both photos are square and use object-fit: cover, so neither is
// stretched and the product stays centred in frame.
export function ClaimVsActual({ claimAssetKey, actualAssetKey, rows }) {
  const t = useT();
  const claimTitle = t('商品頁宣稱');
  const actualTitle = t('實際收到');

  return (
    <div className="bp-cva">
      <div className="bp-cva-media">
        <figure className="bp-cva-side claim">
          <AssetImage assetKey={claimAssetKey} className="bp-cva-photo" />
          <figcaption className="bp-cva-cap">{claimTitle}</figcaption>
        </figure>
        <div className="bp-cva-arrow" aria-hidden="true"><ArrowRight size={16} /></div>
        <figure className="bp-cva-side actual">
          <AssetImage assetKey={actualAssetKey} className="bp-cva-photo" />
          <figcaption className="bp-cva-cap">{actualTitle}</figcaption>
        </figure>
      </div>

      <dl className="bp-cva-table">
        <div className="bp-cva-head" aria-hidden="true">
          <span>{claimTitle}</span>
          <span>{actualTitle}</span>
        </div>
        {rows.map((row) => (
          <div key={row.claim} className="bp-cva-row">
            <dt><span className="bp-cva-inline-label">{claimTitle}</span>{t(row.claim)}</dt>
            <dd><span className="bp-cva-inline-label">{actualTitle}</span>{t(row.actual)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
