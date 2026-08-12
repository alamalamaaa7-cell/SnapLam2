import { prisma } from "./prisma";

export interface AppSettings {
  theme: string;
  dailyLimit: number;
  maintenanceMode: boolean;
}

const DEFAULTS: AppSettings = {
  theme: "abu",
  dailyLimit: 20,
  maintenanceMode: false,
};

// Ensure the single global settings row exists, then return it.
export async function getSettings(): Promise<AppSettings> {
  // No DB configured (e.g. during build-time prerender) → safe defaults.
  if (!process.env.MONGODB_URI) return DEFAULTS;
  try {
    const row = await prisma.settings.upsert({
      where: { key: "global" },
      update: {},
      create: { key: "global", ...DEFAULTS },
    });
    return {
      theme: row.theme,
      dailyLimit: row.dailyLimit,
      maintenanceMode: row.maintenanceMode,
    };
  } catch {
    return DEFAULTS;
  }
}

export async function updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const row = await prisma.settings.upsert({
    where: { key: "global" },
    update: patch,
    create: { key: "global", ...DEFAULTS, ...patch },
  });
  return {
    theme: row.theme,
    dailyLimit: row.dailyLimit,
    maintenanceMode: row.maintenanceMode,
  };
}
