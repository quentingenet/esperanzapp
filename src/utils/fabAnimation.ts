export const FAB_SX = {
  boxShadow: "0 4px 14px rgba(0,0,0,0.28)",
};

export const FAB_PULSE_SX = {
  ...FAB_SX,
  "@keyframes fabPulseZoom": {
    "0%, 100%": { transform: "scale(1)" },
    "50%": { transform: "scale(1.05)" },
  },
  animation: "fabPulseZoom 1.2s ease-in-out infinite",
};
