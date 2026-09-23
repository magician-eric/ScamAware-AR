import { useTranslation } from "react-i18next";
import { ChevronDown, LogOut, Shield, Bell, Headphones, Info, UserCircle } from "lucide-react";
import { TopBar } from "../components/layout/TopBar";
import { Card } from "../components/ui/Card";
import { LanguageSwitcher } from "../components/ui/LanguageSwitcher";

type SectionKey = "security" | "notifications" | "support" | "about";

const SECTIONS: { key: SectionKey; icon: typeof Shield; titleKey: string }[] = [
  { key: "security", icon: Shield, titleKey: "account.security" },
  { key: "notifications", icon: Bell, titleKey: "account.notifications" },
  { key: "support", icon: Headphones, titleKey: "account.support" },
  { key: "about", icon: Info, titleKey: "account.about" },
];

export function Account() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-full flex-col">
      <TopBar showBack title={t("account.title")} />

      <div className="flex-1 space-y-4 px-4 py-4">
        <Card className="flex items-center gap-3 p-4">
          <UserCircle size={52} className="flex-none text-brand-gold" />
          <div className="min-w-0">
            <div className="truncate text-base font-bold text-brand-white">{t("account.memberName")}</div>
            <div className="text-[14px] text-brand-gray">
              {t("account.memberId")}: GUGO-000128 · {t("account.memberSince")} 2025-01-01
            </div>
          </div>
        </Card>

        <Card className="flex items-center justify-between p-4">
          <span className="text-sm font-semibold text-brand-white">繁中 / EN / 日本語</span>
          <LanguageSwitcher />
        </Card>

        <Card className="p-0">
          {SECTIONS.map(({ key, icon: Icon, titleKey }, i) => (
            <div key={key} className={i > 0 ? "border-t border-white/5" : ""}>
              <div
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
              >
                <Icon size={18} className="flex-none text-brand-gold" />
                <span className="flex-1 text-sm font-medium text-brand-white">{t(titleKey)}</span>
                <ChevronDown size={16} className="text-brand-gray" />
              </div>
            </div>
          ))}
        </Card>

        <div
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand-red/30 py-3 text-sm font-bold text-brand-red"
        >
          <LogOut size={16} />
          {t("account.logout")}
        </div>
      </div>
    </div>
  );
}
