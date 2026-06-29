import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#5b9ec9",
    },
    secondary: {
      main: "#5aaa7e",
    },
    background: {
      default: "#f3f8fc",
      paper: "#ffffff",
    },
    error: {
      main: "#e8a0a0",
    },
    warning: {
      main: "#b8956a",
    },
  },
  shape: {
    borderRadius: 12,
  },
  shadows: [
    "none",
    "none",
    "none",
    "none",
    "none",
    "none",
    "none",
    "none",
    "none",
    "none",
    "none",
    "none",
    "none",
    "none",
    "none",
    "none",
    "none",
    "none",
    "none",
    "none",
    "none",
    "none",
    "none",
    "none",
    "none",
  ],
  typography: {
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: "0.5px solid #c5ddf0",
          boxShadow: "none",
        },
      },
    },
  },
});
