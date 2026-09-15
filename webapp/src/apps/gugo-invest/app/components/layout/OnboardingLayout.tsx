import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

/**
 * Same shell as AppLayout (and sized the same way - see its comment) so the
 * pre-app onboarding flow (register -> invest in the AI quant contract)
 * reads as the same product, not a separate generic form - just without
 * BottomNav, since there's nothing to navigate to yet.
 */
export function OnboardingLayout({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-en" : i18n.language === "jp" ? "font-jp" : "font-zh";

  return (
    <div className={`h-full bg-[#05070d] ${fontClass}`}>
      <div className="mx-auto flex h-full w-full max-w-[430px] flex-col overflow-hidden bg-brand-bg">
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
