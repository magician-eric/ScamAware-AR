import { useTranslation } from "react-i18next";
import { UserCircle } from "lucide-react";
import { LogoHorizontal } from "../logo/LogoHorizontal";

// Shared top-level header (logo + account icon) for the bottom-nav's own
// pages (Home/Markets/Portfolio) - kept identical across all three rather
// than each rolling its own logo size/position.
export function PageHeader() {
  const { t } = useTranslation();
  return (
    <header className="flex flex-none items-center justify-between border-b border-brand-gold/15 px-4 pt-[calc(env(safe-area-inset-top)+10px)] pb-3">
      <LogoHorizontal size="md" />
      <span
        aria-hidden="true"
        title={t("nav.account")}
        className="grid h-9 w-9 place-items-center rounded-full text-brand-gold hover:bg-brand-navy/60"
      >
        <UserCircle size={26} />
      </span>
    </header>
  );
}
