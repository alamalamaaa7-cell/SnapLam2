// Theme palette definitions. The admin "Theme Switcher" persists a theme id
// in Settings; the ThemeProvider applies the matching CSS variables.
// Each theme sets HSL values consumed by tailwind.config.ts tokens.

export interface ThemeDef {
  id: string;
  label: string;
  swatch: string; // hex used for the admin preview dot
  vars: Record<string, string>; // CSS custom properties (HSL triplets)
}

export const THEMES: ThemeDef[] = [
  {
    id: "abu",
    label: "Abu Default",
    swatch: "#111827",
    vars: {
      "--background": "222 30% 8%",
      "--foreground": "210 20% 96%",
      "--card": "222 24% 12%",
      "--card-foreground": "210 20% 96%",
      "--primary": "217 33% 24%",
      "--primary-foreground": "210 40% 98%",
      "--secondary": "215 25% 20%",
      "--secondary-foreground": "210 20% 92%",
      "--muted": "217 24% 16%",
      "--muted-foreground": "215 15% 65%",
      "--accent": "217 33% 30%",
      "--accent-foreground": "210 40% 98%",
      "--border": "216 20% 22%",
      "--input": "216 20% 22%",
      "--ring": "215 20% 40%",
      "--destructive": "0 63% 45%",
      "--destructive-foreground": "0 0% 98%",
      "--radius": "1rem",
    },
  },
  {
    id: "biru",
    label: "Biru",
    swatch: "#2563eb",
    vars: {
      "--background": "222 47% 10%",
      "--foreground": "210 40% 98%",
      "--card": "222 40% 14%",
      "--card-foreground": "210 40% 98%",
      "--primary": "221 83% 53%",
      "--primary-foreground": "210 40% 98%",
      "--secondary": "217 40% 22%",
      "--secondary-foreground": "210 40% 96%",
      "--muted": "217 33% 18%",
      "--muted-foreground": "215 20% 70%",
      "--accent": "221 70% 40%",
      "--accent-foreground": "210 40% 98%",
      "--border": "217 33% 24%",
      "--input": "217 33% 24%",
      "--ring": "221 83% 53%",
      "--destructive": "0 63% 45%",
      "--destructive-foreground": "0 0% 98%",
      "--radius": "1rem",
    },
  },
  {
    id: "putih",
    label: "Putih",
    swatch: "#f8fafc",
    vars: {
      "--background": "210 40% 98%",
      "--foreground": "222 47% 11%",
      "--card": "0 0% 100%",
      "--card-foreground": "222 47% 11%",
      "--primary": "221 83% 53%",
      "--primary-foreground": "210 40% 98%",
      "--secondary": "210 40% 92%",
      "--secondary-foreground": "222 47% 15%",
      "--muted": "210 40% 94%",
      "--muted-foreground": "215 16% 40%",
      "--accent": "210 40% 90%",
      "--accent-foreground": "222 47% 15%",
      "--border": "214 32% 88%",
      "--input": "214 32% 88%",
      "--ring": "221 83% 53%",
      "--destructive": "0 72% 50%",
      "--destructive-foreground": "0 0% 98%",
      "--radius": "1rem",
    },
  },
  {
    id: "orange",
    label: "Orange",
    swatch: "#f97316",
    vars: {
      "--background": "20 30% 9%",
      "--foreground": "30 40% 96%",
      "--card": "20 26% 13%",
      "--card-foreground": "30 40% 96%",
      "--primary": "24 95% 53%",
      "--primary-foreground": "20 40% 10%",
      "--secondary": "20 30% 20%",
      "--secondary-foreground": "30 40% 94%",
      "--muted": "20 26% 16%",
      "--muted-foreground": "25 20% 68%",
      "--accent": "24 80% 40%",
      "--accent-foreground": "30 40% 98%",
      "--border": "20 26% 24%",
      "--input": "20 26% 24%",
      "--ring": "24 95% 53%",
      "--destructive": "0 63% 45%",
      "--destructive-foreground": "0 0% 98%",
      "--radius": "1rem",
    },
  },
  {
    id: "emas",
    label: "Emas",
    swatch: "#facc15",
    vars: {
      "--background": "45 30% 8%",
      "--foreground": "48 40% 96%",
      "--card": "45 26% 12%",
      "--card-foreground": "48 40% 96%",
      "--primary": "48 96% 53%",
      "--primary-foreground": "45 40% 10%",
      "--secondary": "45 30% 20%",
      "--secondary-foreground": "48 40% 94%",
      "--muted": "45 26% 15%",
      "--muted-foreground": "46 20% 68%",
      "--accent": "48 80% 42%",
      "--accent-foreground": "45 40% 10%",
      "--border": "45 26% 24%",
      "--input": "45 26% 24%",
      "--ring": "48 96% 53%",
      "--destructive": "0 63% 45%",
      "--destructive-foreground": "0 0% 98%",
      "--radius": "1rem",
    },
  },
];

export const THEME_IDS = THEMES.map((t) => t.id);

export function getTheme(id?: string): ThemeDef {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
