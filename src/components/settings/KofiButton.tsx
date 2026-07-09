import Button from "@mui/material/Button";
import SvgIcon from "@mui/material/SvgIcon";
import type { SxProps, Theme } from "@mui/material/styles";
import { useTranslation } from "react-i18next";
import { COFFEE_PATH } from "@/utils/svgPaths";

const KOFI_URL = "https://ko-fi.com/quentingenet";

export function KofiButton({ sx }: { sx?: SxProps<Theme> }) {
  const { t } = useTranslation();
  return (
    <Button
      variant="outlined"
      component="a"
      href={KOFI_URL}
      target="_blank"
      rel="noopener noreferrer"
      startIcon={
        <SvgIcon fontSize="small">
          <path d={COFFEE_PATH} />
        </SvgIcon>
      }
      sx={[
        {
          borderRadius: 3,
          border: "1.5px solid",
          borderColor: "secondary.main",
          color: "secondary.main",
          fontWeight: 500,
          textTransform: "none",
          justifyContent: "center",
          "&:hover": {
            border: "1.5px solid",
            borderColor: "secondary.main",
            bgcolor: "rgba(90,170,126,0.07)",
          },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {t("settings.kofi")}
    </Button>
  );
}
