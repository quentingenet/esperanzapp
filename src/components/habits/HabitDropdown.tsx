import Box from "@mui/material/Box";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import SvgIcon from "@mui/material/SvgIcon";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import type { HabitDropdownProps, HabitTypeConfig, HabitTypeId } from "@/types";
import { HABIT_TYPES } from "@/utils/habitTypes";

const CHECKMARK = "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z";

interface TypeItemProps {
  config: HabitTypeConfig;
  selected: boolean;
  onSelect: (id: HabitTypeId) => void;
}

function TypeItem({ config, selected, onSelect }: TypeItemProps) {
  const { t } = useTranslation();
  return (
    <ListItemButton
      selected={selected}
      onClick={() => { onSelect(config.id); }}
      aria-label={t(`habitTypes.${config.id}.label`)}
      sx={{ borderRadius: 2, mb: 0.5, minHeight: 56 }}
    >
      <Box
        sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: config.bgColor, display: "flex", alignItems: "center", justifyContent: "center", mr: 1.5, flexShrink: 0 }}
      >
        <SvgIcon aria-hidden="true" sx={{ width: 20, height: 20, color: config.color }}>
          <path d={config.svgPath} />
        </SvgIcon>
      </Box>
      <ListItemText
        primary={t(`habitTypes.${config.id}.label`)}
        secondary={config.id === "custom" ? t(`habitTypes.${config.id}.desc`) : undefined}
        slotProps={{ primary: { sx: { fontWeight: selected ? 600 : 400 } } }}
      />
      {selected && (
        <SvgIcon aria-hidden="true" sx={{ color: "primary.main", ml: 1 }}>
          <path d={CHECKMARK} />
        </SvgIcon>
      )}
    </ListItemButton>
  );
}

const SUBSTANCES = HABIT_TYPES.filter((h) => h.group === "substances");
const BEHAVIOURS = HABIT_TYPES.filter((h) => h.group === "behaviours");
const CUSTOM_CONFIG = HABIT_TYPES.find((h) => h.id === "custom");

export function HabitDropdown({ selectedId, customLabel, onSelect, onCustomChange }: HabitDropdownProps) {
  const { t } = useTranslation();
  return (
    <Box>
      <Typography variant="overline" color="text.secondary" sx={{ px: 1 }}>
        {t("habitTypes.groups.custom")}
      </Typography>
      {CUSTOM_CONFIG && <TypeItem config={CUSTOM_CONFIG} selected={selectedId === "custom"} onSelect={onSelect} />}
      {selectedId === "custom" && (
        <Box sx={{ px: 1, mt: 1, mb: 1 }}>
          <TextField
            fullWidth
            autoFocus
            value={customLabel}
            onChange={(e) => { onCustomChange(e.target.value); }}
            placeholder={t("habits.form.namePlaceholder")}
            slotProps={{ htmlInput: { "aria-label": t("habitTypes.groups.custom"), maxLength: 60 } }}
          />
        </Box>
      )}
      <Typography variant="overline" color="text.secondary" sx={{ px: 1, mt: 1, display: "block" }}>
        {t("habitTypes.groups.substances")}
      </Typography>
      <List dense disablePadding>
        {SUBSTANCES.map((ht) => (
          <TypeItem key={ht.id} config={ht} selected={selectedId === ht.id} onSelect={onSelect} />
        ))}
      </List>
      <Typography variant="overline" color="text.secondary" sx={{ px: 1, mt: 1, display: "block" }}>
        {t("habitTypes.groups.behaviours")}
      </Typography>
      <List dense disablePadding>
        {BEHAVIOURS.map((ht) => (
          <TypeItem key={ht.id} config={ht} selected={selectedId === ht.id} onSelect={onSelect} />
        ))}
      </List>
    </Box>
  );
}
