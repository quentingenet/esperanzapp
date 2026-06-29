import { useTranslation } from "react-i18next";
import { fr } from "date-fns/locale/fr";
import { enUS } from "date-fns/locale/en-US";
import { es } from "date-fns/locale/es";
import { de } from "date-fns/locale/de";
import { ptBR } from "date-fns/locale/pt-BR";
import { nl } from "date-fns/locale/nl";
import { it } from "date-fns/locale/it";
import type { Locale } from "date-fns";

const LOCALE_MAP: Record<string, Locale> = {
  fr,
  en: enUS,
  es,
  de,
  "pt-BR": ptBR,
  nl,
  it,
};

export function useDateLocale(): Locale {
  const { i18n } = useTranslation();
  return LOCALE_MAP[i18n.language] ?? enUS;
}
