import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import type { SupportedLocale } from "@/i18n";

const LANGUAGES: { locale: SupportedLocale; flag: string; name: string }[] = [
  { locale: "fr", flag: "🇫🇷", name: "Français" },
  { locale: "en", flag: "🇬🇧", name: "English" },
  { locale: "es", flag: "🇪🇸", name: "Español" },
  { locale: "de", flag: "🇩🇪", name: "Deutsch" },
  { locale: "pt-BR", flag: "🇧🇷", name: "Português" },
  { locale: "nl", flag: "🇳🇱", name: "Nederlands" },
  { locale: "it", flag: "🇮🇹", name: "Italiano" },
];

interface LanguageSelectorProps {
  onSelect: (locale: SupportedLocale) => void;
}

export function LanguageSelector({ onSelect }: LanguageSelectorProps) {
  const { i18n } = useTranslation();
  const current = i18n.language as SupportedLocale;

  const handleSelect = (locale: SupportedLocale) => {
    void i18n.changeLanguage(locale);
  };

  return (
    <Box
      sx={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        px: 3,
        pt: 6,
        pb: "calc(32px + env(safe-area-inset-bottom))",
      }}
    >
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
        🌍
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
        Choose your language
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 4, fontSize: "0.9rem" }}>
        Choisissez votre langue
      </Typography>

      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5, flex: 1 }}>
        {LANGUAGES.map(({ locale, flag, name }) => {
          const selected =
            current === locale || (locale === "en" && !LANGUAGES.some((l) => l.locale === current));
          return (
            <Box
              key={locale}
              role="button"
              tabIndex={0}
              onClick={() => {
                handleSelect(locale);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  handleSelect(locale);
                  e.preventDefault();
                }
              }}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                p: 2,
                borderRadius: 3,
                cursor: "pointer",
                border: "2px solid",
                borderColor: selected ? "primary.main" : "divider",
                bgcolor: selected ? "primary.50" : "transparent",
                transition: "all 0.15s",
                minHeight: 60,
                "&:active": { transform: "scale(0.97)" },
              }}
            >
              <Typography sx={{ fontSize: "1.8rem", lineHeight: 1 }}>{flag}</Typography>
              <Typography variant="body2" sx={{ fontWeight: selected ? 700 : 400 }}>
                {name}
              </Typography>
            </Box>
          );
        })}
      </Box>

      <Button
        fullWidth
        variant="contained"
        size="large"
        onClick={() => {
          onSelect(current);
        }}
        sx={{ mt: 3, minHeight: 52, borderRadius: 3, fontSize: "1.05rem", fontWeight: 700 }}
      >
        →
      </Button>
    </Box>
  );
}
