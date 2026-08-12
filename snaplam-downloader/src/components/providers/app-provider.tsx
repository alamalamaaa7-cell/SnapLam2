"use client";

import * as React from "react";
import { toast } from "sonner";
import { useSocket } from "./socket-provider";
import { useTheme } from "./theme-provider";

export interface MeUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role: "USER" | "ADMIN";
  totalDownloads: number;
  isAdmin: boolean;
  createdAt: string;
}

export interface AppSettings {
  theme: string;
  dailyLimit: number;
  maintenanceMode: boolean;
}

interface AppCtx {
  user: MeUser | null;
  authenticated: boolean;
  settings: AppSettings;
  loading: boolean;
  refresh: () => Promise<void>;
}

const Ctx = React.createContext<AppCtx | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { socket } = useSocket();
  const { setTheme } = useTheme();
  const [user, setUser] = React.useState<MeUser | null>(null);
  const [authenticated, setAuthenticated] = React.useState(false);
  const [settings, setSettings] = React.useState<AppSettings>({
    theme: "abu",
    dailyLimit: 20,
    maintenanceMode: false,
  });
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    try {
      const res = await fetch("/api/me", { cache: "no-store" });
      const data = await res.json();
      setAuthenticated(!!data.authenticated);
      setUser(data.user ?? null);
      if (data.settings) {
        setSettings(data.settings);
        setTheme(data.settings.theme);
      }
      // Show unread broadcasts (offline delivery).
      if (Array.isArray(data.unread) && data.unread.length) {
        data.unread.forEach((b: any) => {
          toast(b.title, { description: b.message, duration: 8000 });
          fetch("/api/me", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ id: b.id }),
          }).catch(() => {});
        });
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [setTheme]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  // Realtime: settings changes (theme/maintenance) + broadcasts + kick.
  React.useEffect(() => {
    if (!socket) return;

    const onSettings = (s: AppSettings) => {
      setSettings(s);
      setTheme(s.theme);
      toast.info("Tampilan diperbarui oleh admin.");
    };
    const onBroadcast = (b: any) => {
      const icon = b.type === "MAINTENANCE" ? "🛠️" : b.type === "UPDATE" ? "🚀" : "📢";
      toast(`${icon} ${b.title}`, { description: b.message, duration: 9000 });
    };
    const onKick = ({ email }: { email: string }) => {
      if (user?.email && email === user.email) {
        toast.error("Kamu dikeluarkan dari chat oleh admin.");
        refresh();
      }
    };

    socket.on("settings:update", onSettings);
    socket.on("broadcast:new", onBroadcast);
    socket.on("broadcast:unread", (list: any[]) =>
      list.forEach((b) => toast(b.title, { description: b.message }))
    );
    socket.on("chat:kick", onKick);

    return () => {
      socket.off("settings:update", onSettings);
      socket.off("broadcast:new", onBroadcast);
      socket.off("broadcast:unread");
      socket.off("chat:kick", onKick);
    };
  }, [socket, setTheme, user?.email, refresh]);

  return (
    <Ctx.Provider value={{ user, authenticated, settings, loading, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export function useApp() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
