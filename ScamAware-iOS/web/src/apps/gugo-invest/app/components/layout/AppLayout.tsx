import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BottomNav } from "./BottomNav";

/**
 * Mobile-first shell, filling whatever box the host mounts the app in.
 *
 * It used to size itself against the viewport (min-h-screen / h-screen) and
 * carry a `sm:` desktop treatment that centred the content as a fixed-size
 * "phone" card. Both were for running as its own page. Inside CIBAR the app
 * is mounted in scenario01's stage - a phone-shaped box that AppShell
 * already sizes, centres and scales - so the viewport is the wrong thing to
 * measure, and the desktop card would draw a second phone frame inside the
 * first. Players never saw that treatment anyway: the app was embedded in a
 * 430px-wide iframe, so `sm:` never matched. Filling the host box renders
 * exactly what they saw before.
 */
export function AppLayout() {
  const { i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-en" : i18n.language === "jp" ? "font-jp" : "font-zh";

  return (
    <div className={`h-full bg-[#05070d] ${fontClass}`}>
      <div className="mx-auto flex h-full w-full max-w-[430px] flex-col overflow-hidden bg-brand-bg">
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </div>
        <BottomNav />
      </div>
    </div>
  );
}
