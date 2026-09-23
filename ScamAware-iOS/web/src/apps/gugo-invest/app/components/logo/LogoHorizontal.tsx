import { useTranslation } from "react-i18next";
import logoZh from "../../../assets/logos/logo-zh.webp";
import logoEn from "../../../assets/logos/logo-en.webp";
import logoJp from "../../../assets/logos/logo-jp.webp";

interface LogoHorizontalProps {
  size?: "sm" | "md" | "lg";
  /** Exact pixel height, when none of the three named sizes is the one. */
  height?: number;
  className?: string;
}

const HEIGHT = { sm: 26, md: 36, lg: 56 };

// The artwork is this App module's own, imported so the bundler owns its
// URL and fingerprint. The standalone build read it out of its public/
// folder via BASE_URL, which only worked because that build was served from
// its own subpath; inside webapp there is no such folder to point at.
const LOGO_SRC: Record<string, string> = {
  zh: logoZh,
  en: logoEn,
  jp: logoJp,
};

/** Icon + wordmark, using the real per-language CIS logo artwork. */
export function LogoHorizontal({ size = "md", height, className = "" }: LogoHorizontalProps) {
  const { i18n, t } = useTranslation();
  const lang = i18n.language.startsWith("zh") ? "zh" : i18n.language.startsWith("jp") ? "jp" : "en";

  return (
    <img
      src={LOGO_SRC[lang]}
      alt={t("brand.nameEn")}
      style={{ height: height ?? HEIGHT[size] }}
      className={`w-auto ${className}`}
    />
  );
}
