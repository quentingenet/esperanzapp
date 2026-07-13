import { useState } from "react";
import Box from "@mui/material/Box";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import { useTranslation } from "react-i18next";
import { BuildMilestonesTab, ReduceMilestonesTab } from "@/components/home";

export function Milestones() {
  const { t } = useTranslation();
  const [tab, setTab] = useState(0);

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: "background.default" }}>
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          bgcolor: "background.default",
          borderBottom: 1,
          borderColor: "divider",
          pt: "env(safe-area-inset-top)",
        }}
      >
        <Tabs
          value={tab}
          onChange={(_, v: number) => {
            setTab(v);
          }}
          variant="fullWidth"
        >
          <Tab label={t("common.tabs.reduce")} aria-label={t("common.tabs.reduce")} />
          <Tab label={t("common.tabs.build")} aria-label={t("common.tabs.build")} />
        </Tabs>
      </Box>

      {tab === 0 && <ReduceMilestonesTab />}
      {tab === 1 && <BuildMilestonesTab />}
    </Box>
  );
}
