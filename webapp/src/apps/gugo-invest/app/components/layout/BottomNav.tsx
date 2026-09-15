import { Home, LineChart, Wallet } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";

const ITEMS = [
  { to: "/", icon: Home, labelKey: "nav.home", end: true },
  { to: "/markets", icon: LineChart, labelKey: "nav.markets", end: false },
  { to: "/portfolio", icon: Wallet, labelKey: "nav.portfolio", end: false },
];

export function BottomNav() {
  const { t } = useTranslation();
  const { pathname } = useLocation();

  return (
    <nav className="flex-none border-t border-brand-gold/15 bg-brand-bg/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-stretch justify-between px-1">
        {ITEMS.map(({ to, icon: Icon, labelKey }) => {
          const isActive = to === "/" ? !pathname.endsWith("/markets") && !pathname.endsWith("/portfolio") : pathname.endsWith(to);
          return (
            <div
              key={to}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
                isActive ? "text-brand-gold" : "text-brand-gray"
              }`}
            >
              <Icon size={22} strokeWidth={2} />
              <span>{t(labelKey)}</span>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
