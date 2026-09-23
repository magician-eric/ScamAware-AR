import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import zhTW from "./locales/zh-TW.json";
import en from "./locales/en.json";
import jp from "./locales/jp.json";

// Language codes used throughout this project: "zh-TW", "en", "jp".
// Japanese intentionally uses "jp", never the ISO "ja" code.
export const SUPPORTED_LANGUAGES = ["zh-TW", "en", "jp"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      "zh-TW": { translation: zhTW },
      en: { translation: en },
      jp: { translation: jp },
    },
    fallbackLng: "zh-TW",
    supportedLngs: SUPPORTED_LANGUAGES as unknown as string[],
    detection: {
      // "querystring" first so a ?lang= link from the main CIBAR app (e.g.
      // PlatformRegister's "Open GuGo Invest" button) can open this app
      // already matching whatever language the player already chose there.
      order: ["querystring", "localStorage", "navigator"],
      lookupQuerystring: "lang",
      lookupLocalStorage: "gugo-invest-language",
      caches: ["localStorage"],
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
