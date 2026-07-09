import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import type { UserNameInputProps } from "@/types";

export function UserNameInput({ onSave, onSkip }: UserNameInputProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");

  const handleSave = () => {
    if (name.trim()) onSave(name.trim());
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3, px: 3, pt: 6 }}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        {t("onboarding.yourName.title")}
      </Typography>
      <TextField
        fullWidth
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t("onboarding.yourName.placeholder")}
        slotProps={{ htmlInput: { "aria-label": t("onboarding.yourName.title"), maxLength: 50 } }}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
        }}
        autoFocus
      />
      <Button
        variant="contained"
        fullWidth
        onClick={handleSave}
        disabled={!name.trim()}
        aria-label={t("common.save")}
        sx={{ minHeight: 48, borderRadius: 2 }}
      >
        {t("common.save")}
      </Button>
      <Button
        variant="text"
        fullWidth
        onClick={onSkip}
        aria-label={t("onboarding.yourName.skip")}
        sx={{ minHeight: 44, color: "text.secondary" }}
      >
        {t("onboarding.yourName.skip")}
      </Button>
    </Box>
  );
}
