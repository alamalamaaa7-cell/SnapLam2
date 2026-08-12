"use client";

import * as React from "react";
import { getTheme, THEMES } from "@/lib/themes";

type Mode = "dark" | "light";

interface ThemeCtx {
  theme: string; // palette id (abu/biru/...)
  mode: Mode; // dark/light toggle for the user
  setTheme: (id: string) => void;
  toggleMode: () => void;
}

const Ctx = React.createContext<ThemeCtx | null>(null);

// Apply a palette by writing CSS variables onto <html>.
function applyPalette(id: string) {
  const t = getTheme(id);
  const root = document.documentElement;
  Object.entries(t.vars).forEach(([k, v]) => root.style.setProperty(k, v));
  root.dataset.theme = id;
}

export function ThemeProvider({
  initialTheme = "abu",
  children,
}: {
  initialTheme?: string;
  children: React.ReactNode;
}) {
  const [theme, setThemeState] = React.useState(initialTheme);
  const [mode, setMode] = React.useState<Mode>("dark");

  // Apply palette whenever it changes.
  React.useEffect(() => {
    applyPalette(theme);
  }, [theme]);

  // Load user's local dark/light preference on mount.
  React.useEffect(() => {
    const saved = (typeof window !== "undefined" && localStorage.getItem("snaplam-mode")) as Mode | null;
    if (saved === "light" || saved === "dark") setMode(saved);
  }, []);

  React.useEffect(() => {
    const root = document.documentElement;
    if (mode === "light") root.classList.remove("dark");
    else root.classList.add("dark");
    localStorage.setItem("snaplam-mode", mode);
  }, [mode]);

  const setTheme = React.useCallback((id: string) => {
    if (THEMES.some((t) => t.id === id)) setThemeState(id);
  }, []);

  const toggleMode = React.useCallback(() => {
    setMode((m) => (m === "dark" ? "light" : "dark"));
  }, []);

  return (
    <Ctx.Provider value={{ theme, mode, setTheme, toggleMode }}>{children}</Ctx.Provider>
  );
}

export function useTheme() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
