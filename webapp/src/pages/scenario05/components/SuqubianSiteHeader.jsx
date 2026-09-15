import { ShieldCheck } from 'lucide-react';

// The masthead for the fake external trading site (ShopCreate / TradeInfo -
// see data/scenario05FakeSite.js), rendered directly under the
// browser chrome. 黑皮通 is a different company inside the story - real
// logistics/delivery only, never a shop-building or payment site - so it
// never appears here; every caller supplies its own `brand`/`tag` for the
// site it's actually rendering.
//
// The lockup is a line shield-check mark next to the wordmark, with the
// brand's own strapline under it - drawn from the icon library rather than
// shipped as an image, so SafeDeal owns a real identity without adding a
// binary asset. The section label under the lockup is what changes per page;
// the brand bar itself stays identical, the way a real site's masthead does.
export function SuqubianSiteHeader({ section, brand, tag }) {
  return (
    <div className="sq-masthead">
      <div className="sq-brand">
        <ShieldCheck className="sq-brand-icon" size={21} strokeWidth={2} aria-hidden="true" />
        <span className="sq-wordmark">{brand}</span>
      </div>
      {tag && <div className="sq-brand-tag">{tag}</div>}
      {section && <div className="sq-section">{section}</div>}
    </div>
  );
}
