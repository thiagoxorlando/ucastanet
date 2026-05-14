export const theme = {
  colors: {
    primary:     "#1ABC9C",
    primaryDark: "#0E7C86",
    cyan:        "#27C1D6",
    accent:      "#F5A623",
    accentSoft:  "#FFD166",
    dark:        "#081217",
    surface:     "#0F1720",
    border:      "#1D2A35",
    text:        "#F4F7FA",
    muted:       "#7FA9A8",
  },
  radius: {
    card:   "28px",
    button: "12px",
    badge:  "999px",
  },
  shadow: {
    card:   "0 12px 34px rgba(15,23,42,0.05)",
    button: "0 8px 20px rgba(26,188,156,0.28)",
    modal:  "0 24px 64px rgba(0,0,0,0.4)",
  },
  gradient: {
    primary: "linear-gradient(to right, #1ABC9C, #27C1D6)",
    accent:  "linear-gradient(to right, #F5A623, #FFD166)",
    dark:    "linear-gradient(180deg, #081718 0%, #041012 100%)",
  },
} as const;

export type Theme = typeof theme;
