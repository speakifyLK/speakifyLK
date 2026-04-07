import type { RaThemeOptions } from "react-admin";

export const speakifyTheme: RaThemeOptions = {
  palette: {
    primary: {
      main: "#22c55e",
      light: "#4ade80",
      dark: "#15803d",
      contrastText: "#fff",
    },
    secondary: {
      main: "#16a34a",
      light: "#4ade80",
      dark: "#166534",
      contrastText: "#fff",
    },
    background: {
      default: "#f8fafc",
    },
    error: {
      main: "#ef4444",
    },
  },
  typography: {
    fontFamily: "'Nunito', sans-serif",
  },
};
