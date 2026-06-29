import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Link from "@mui/material/Link";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { useOnboarding } from "@/hooks";
import { useOnboardingStore } from "@/store";
import { toast } from "@/store/toastStore";
import { SUPPORTED_LOCALES } from "@/i18n";

declare const __APP_VERSION__: string;
const APP_VERSION = __APP_VERSION__;
const GITHUB_URL = "https://github.com/QuentinGenet/esperanzapp";

const LOCALE_FLAGS: Record<string, string> = {
  fr: "🇫🇷", en: "🇬🇧", es: "🇪🇸", de: "🇩🇪", "pt-BR": "🇧🇷", nl: "🇳🇱", it: "🇮🇹",
};

interface SettingsGeneralSectionProps {
  onReplayTutorial: () => void;
  onShowTerms: () => void;
}

export function SettingsGeneralSection({ onReplayTutorial, onShowTerms }: SettingsGeneralSectionProps) {
  const { t, i18n } = useTranslation();
  const { saveName } = useOnboarding();
  const userName = useOnboardingStore((s) => s.userName);
  const [editName, setEditName] = useState(userName);

  const handleSaveName = () => {
    void saveName(editName)
      .then(() => { toast.success(t("common.saved")); })
      .catch(() => { toast.error(t("common.error")); });
  };

  const handleLanguageChange = (value: string) => {
    void i18n.changeLanguage(value);
    localStorage.setItem("i18n_lang", value);
    toast.success(t("common.saved"));
  };

  return (
    <Box sx={{ px: 2, pt: 2 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>{t("export.editName")}</Typography>
      <Box sx={{ display: "flex", gap: 1, mb: 3 }}>
        <TextField fullWidth size="small" value={editName} onChange={(e) => { setEditName(e.target.value); }} label={t("common.name")} />
        <Button variant="contained" onClick={handleSaveName} aria-label={t("common.save")} sx={{ minHeight: 44, px: 2 }}>{t("common.save")}</Button>
      </Box>

      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>{t("settings.language")}</Typography>
      <Select
        fullWidth
        size="small"
        value={i18n.language}
        onChange={(e) => { handleLanguageChange(e.target.value); }}
        sx={{ mb: 3 }}
        aria-label={t("settings.language")}
      >
        {SUPPORTED_LOCALES.map((locale) => (
          <MenuItem key={locale} value={locale}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <span style={{ fontSize: "1.2rem", lineHeight: 1 }}>{LOCALE_FLAGS[locale]}</span>
              <span>{t(`settings.languages.${locale}`)}</span>
            </Box>
          </MenuItem>
        ))}
      </Select>

      <Divider sx={{ mb: 2 }} />

      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
        <Button variant="text" onClick={onReplayTutorial} sx={{ justifyContent: "flex-start", px: 0, minHeight: 44, textTransform: "none", fontWeight: 400, color: "text.primary" }}>
          {t("settings.replayTutorial")}
        </Button>
        <Button variant="text" onClick={onShowTerms} sx={{ justifyContent: "flex-start", px: 0, minHeight: 44, textTransform: "none", fontWeight: 400, color: "text.primary" }}>
          {t("settings.terms")}
        </Button>
        <Link href={GITHUB_URL} target="_blank" rel="noopener noreferrer" underline="hover" sx={{ minHeight: 44, display: "flex", alignItems: "center" }}>
          {t("settings.sourceCode")}
        </Link>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>{t("settings.version")} {APP_VERSION}</Typography>
        <Typography variant="caption" color="text.secondary">{t("settings.license")} · {t("app.by")} Quentin Genet</Typography>
      </Box>
    </Box>
  );
}
