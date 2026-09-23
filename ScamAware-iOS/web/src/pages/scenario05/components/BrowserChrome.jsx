import { ChevronLeft, EllipsisVertical, Lock } from 'lucide-react';

// The phone browser the player is looking at whenever they leave MyDonDon for
// a website - 速取便's official site and the fake support site both render
// inside this. Mounting it is what tells the player "this is not the app any
// more"; MyDonDon screens, the bank screen and the CIBAR result screens never
// mount it (spec sections 21 / 32 / 34 / 38).
//
// The chrome is deliberately IDENTICAL for the real and the fake site, lock
// icon included (spec section 28): the only thing that separates
// suqubian.tw from service-suqubian-tw.com is the address itself, which is
// exactly the discrimination the scenario is teaching. Painting the fake site
// with a browser warning would hand the player the answer for free.
//
// `domain` is never translated - the fictional addresses stay identical in
// zh/en/jp (spec section 49).
export function BrowserChrome({ domain }) {
  return (
    <div className="wb-chrome">
      <span className="wb-icon-btn wb-icon-display" aria-hidden="true">
        <ChevronLeft size={21} />
      </span>
      <span className="wb-omnibox">
        <Lock size={11} aria-hidden="true" />
        <span className="wb-domain">{domain}</span>
      </span>
      <span className="wb-icon-btn wb-icon-display" aria-hidden="true">
        <EllipsisVertical size={19} />
      </span>
    </div>
  );
}
