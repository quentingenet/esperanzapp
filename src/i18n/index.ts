import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import resourcesToBackend from "i18next-resources-to-backend";

export const SUPPORTED_LOCALES = ["fr", "en", "es", "de", "pt-BR", "nl", "it"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

function loadLocale(language: string): Promise<unknown> {
  switch (language) {
    case "fr":
      return import("./locales/fr.json");
    case "en":
      return import("./locales/en.json");
    case "es":
      return import("./locales/es.json");
    case "de":
      return import("./locales/de.json");
    case "pt-BR":
      return import("./locales/pt-BR.json");
    case "nl":
      return import("./locales/nl.json");
    case "it":
      return import("./locales/it.json");
    default:
      return import("./locales/en.json");
  }
}

export const i18nInit = i18n
  .use(LanguageDetector)
  .use(resourcesToBackend(loadLocale))
  .use(initReactI18next)
  .init({
    fallbackLng: "en",
    supportedLngs: SUPPORTED_LOCALES,
    ns: ["translation"],
    defaultNS: "translation",
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      caches: [],
      lookupLocalStorage: "i18n_lang",
    },
  });

export default i18n;
