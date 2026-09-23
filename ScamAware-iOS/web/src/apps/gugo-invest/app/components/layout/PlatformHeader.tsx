import { LogoHorizontal } from "../logo/LogoHorizontal";

/**
 * The brand lockup for the platform screens the host places in its own pages
 * (see ../../screens/). scenario01 used to keep its own copy of this - a
 * second component reading a second, build-time-mirrored copy of the logo
 * files - so that its post-platform pages carried the brand through. There is
 * one of each now: this component, over the artwork this module imports.
 */
export function PlatformHeader({ subtitle }: { subtitle?: string }) {
  return (
    <div className="gugo-platform-topbar">
      <div className="gugo-brand">
        <LogoHorizontal height={28} />
        {subtitle && <small className="gugo-brand-subtitle">{subtitle}</small>}
      </div>
    </div>
  );
}
