import { useTranslation } from "react-i18next";
import type { SupportedLanguage } from "../../i18n";

const OPTIONS: { code: SupportedLanguage; label: string }[] = [
  { code: "zh-TW", label: "繁中" },
  { code: "en", label: "EN" },
  { code: "jp", label: "日本語" },
];

interface LanguageSwitcherProps {
  className?: string;
}

/** The account language preference is scenery in the AR experience. */
export function LanguageSwitcher({ className = "" }: LanguageSwitcherProps) {
  const { i18n } = useTranslation();
  const current = i18n.language;

  return (
    <div className={`inline-flex items-center gap-1 rounded-full border border-brand-gold/30 bg-brand-navy/60 p-1 ${className}`}>
      {OPTIONS.map((opt) => {
        const active = current === opt.code || (opt.code === "zh-TW" && current.startsWith("zh"));
        return (
          <span
            key={opt.code}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              active ? "bg-brand-gold text-brand-bg" : "text-brand-gray"
            }`}
            aria-hidden="true"
          >
            {opt.label}
          </span>
        );
      })}
    </div>
  );
}
