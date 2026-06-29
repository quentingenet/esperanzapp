import Paper from "@mui/material/Paper";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import SvgIcon from "@mui/material/SvgIcon";
import { useTranslation } from "react-i18next";
import type { BottomNavProps, NavTab } from "@/types";

const TABS: NavTab[] = ["home", "milestones", "treatments", "history", "settings"];

const ICON_PATHS: Record<NavTab, string> = {
  home:       "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z",
  milestones: "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z",
  treatments: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z",
  history:    "M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z",
  settings:   "M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.57 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z",
};

function TabIcon({ tab }: { tab: NavTab }) {
  return (
    <SvgIcon aria-hidden="true">
      <path d={ICON_PATHS[tab]} />
    </SvgIcon>
  );
}

export function BottomNav({ activeTab, onChange }: BottomNavProps) {
  const { t } = useTranslation();
  return (
    <Paper elevation={3} sx={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 1100, pb: "max(env(safe-area-inset-bottom), 28px)" }}>
      <BottomNavigation
        value={activeTab}
        onChange={(_, tab: NavTab) => onChange(tab)}
        sx={{ height: 64 }}
      >
        {TABS.map((tab) => (
          <BottomNavigationAction
            key={tab}
            value={tab}
            label={t(`nav.${tab}`)}
            icon={<TabIcon tab={tab} />}
            aria-label={t(`nav.${tab}`)}
            sx={{ minWidth: 44 }}
          />
        ))}
      </BottomNavigation>
    </Paper>
  );
}
