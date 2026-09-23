import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { useTranslation } from "react-i18next";

interface TopBarProps {
  title?: string;
  showBack?: boolean;
  left?: ReactNode;
  right?: ReactNode;
}

export function TopBar({ title, showBack = false, left, right }: TopBarProps) {
  const { t } = useTranslation();

  return (
    <header className="flex-none flex items-center gap-2 border-b border-brand-gold/15 bg-brand-bg px-3 pt-[env(safe-area-inset-top)] h-14">
      {left ??
        (showBack && (
          <span
            aria-hidden="true"
            title={t("common.back")}
            className="grid h-9 w-9 place-items-center rounded-full text-brand-white"
          >
            <ChevronLeft size={22} />
          </span>
        ))}
      {title && <h1 className="flex-1 truncate text-base font-bold text-brand-white">{title}</h1>}
      {!title && <div className="flex-1" />}
      {right && <div className="flex items-center gap-1">{right}</div>}
    </header>
  );
}
