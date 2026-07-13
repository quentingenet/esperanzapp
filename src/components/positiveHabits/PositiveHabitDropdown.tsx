import Box from "@mui/material/Box";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import SvgIcon from "@mui/material/SvgIcon";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import type { PositiveHabitDropdownProps, PositiveHabitTypeConfig, PositiveHabitTypeId } from "@/types";
import { POSITIVE_HABIT_TYPES } from "@/utils/positiveHabitTypes";

const CHECKMARK = "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z";

interface TypeItemProps {
  config: PositiveHabitTypeConfig;
  selected: boolean;
  onSelect: (id: PositiveHabitTypeId) => void;
}

function TypeItem({ config, selected, onSelect }: TypeItemProps) {
  const { t } = useTranslation();
  return (
    <ListItemButton
      selected={selected}
      onClick={() => {
        onSelect(config.id);
      }}
      aria-label={t(`positiveHabitTypes.${config.id}.label`)}
      sx={{ borderRadius: 2, mb: 0.5, minHeight: 56 }}
    >
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: 1.5,
          bgcolor: config.bgColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          mr: 1.5,
          flexShrink: 0,
        }}
      >
        <SvgIcon aria-hidden="true" sx={{ width: 20, height: 20, color: config.color }}>
          <path d={config.svgPath} />
        </SvgIcon>
      </Box>
      <ListItemText
        primary={t(`positiveHabitTypes.${config.id}.label`)}
        secondary={config.id === "custom" ? t(`positiveHabitTypes.${config.id}.desc`) : undefined}
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

const ACTIVITIES = POSITIVE_HABIT_TYPES.filter((h) => h.group === "activities");
const CUSTOM_CONFIG = POSITIVE_HABIT_TYPES.find((h) => h.id === "custom");

export function PositiveHabitDropdown({
  selectedId,
  customLabel,
  onSelect,
  onCustomChange,
}: PositiveHabitDropdownProps) {
  const { t } = useTranslation();
  return (
    <Box>
      <Typography variant="overline" color="text.secondary" sx={{ px: 1 }}>
        {t("positiveHabitTypes.groups.custom")}
      </Typography>
      {CUSTOM_CONFIG && (
        <TypeItem config={CUSTOM_CONFIG} selected={selectedId === "custom"} onSelect={onSelect} />
      )}
      {selectedId === "custom" && (
        <Box sx={{ px: 1, mt: 1, mb: 1 }}>
          <TextField
            fullWidth
            autoFocus
            value={customLabel}
            onChange={(e) => {
              onCustomChange(e.target.value);
            }}
            placeholder={t("positiveHabits.form.namePlaceholder")}
            slotProps={{
              htmlInput: { "aria-label": t("positiveHabitTypes.groups.custom"), maxLength: 60 },
            }}
          />
        </Box>
      )}
      <Typography variant="overline" color="text.secondary" sx={{ px: 1, mt: 1, display: "block" }}>
        {t("positiveHabitTypes.groups.activities")}
      </Typography>
      <List dense disablePadding>
        {ACTIVITIES.map((ht) => (
          <TypeItem key={ht.id} config={ht} selected={selectedId === ht.id} onSelect={onSelect} />
        ))}
      </List>
    </Box>
  );
}
