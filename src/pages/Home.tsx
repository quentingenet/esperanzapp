import { useState } from "react";
import Box from "@mui/material/Box";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import { useTranslation } from "react-i18next";
import { BuildHabitsTab, ReduceHabitsTab } from "@/components/home";
import { useHomeTabStore } from "@/store/homeTabStore";

export function Home() {
  const { t } = useTranslation();
  // Lazy initializer: consumed once per mount, so a notification tap that requested the
  // "build" sub-tab opens directly on it without a flash of the default "reduce" tab first.
  const [tab, setTab] = useState(() =>
    useHomeTabStore.getState().consumePendingTab() === "build" ? 1 : 0,
  );

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

      {tab === 0 && <ReduceHabitsTab />}
      {tab === 1 && <BuildHabitsTab />}
    </Box>
  );
}
