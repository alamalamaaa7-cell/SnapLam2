"use client";

import * as React from "react";
import { toast } from "sonner";
import { Check, Palette, Gauge, Power, Ban, UserX, Search } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { THEMES } from "@/lib/themes";
import { useApp } from "@/components/providers/app-provider";
import { useTheme } from "@/components/providers/theme-provider";
import { cn } from "@/lib/utils";

interface UserRow {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role: "USER" | "ADMIN";
  totalDownloads: number;
  isBanned: boolean;
}

export function SettingsTab() {
  const { settings, refresh } = useApp();
  const { setTheme } = useTheme();
  const [theme, setThemeId] = React.useState(settings.theme);
  const [dailyLimit, setDailyLimit] = React.useState(settings.dailyLimit);
  const [maintenance, setMaintenance] = React.useState(settings.maintenanceMode);
  const [saving, setSaving] = React.useState(false);

  const [users, setUsers] = React.useState<UserRow[]>([]);
  const [userSearch, setUserSearch] = React.useState("");

  React.useEffect(() => {
    setThemeId(settings.theme);
    setDailyLimit(settings.dailyLimit);
    setMaintenance(settings.maintenanceMode);
  }, [settings]);

  const loadUsers = React.useCallback(async () => {
    const params = userSearch ? `?search=${encodeURIComponent(userSearch)}` : "";
    const res = await fetch(`/api/admin/users${params}`, { cache: "no-store" });
    const data = await res.json();
    if (data.ok) setUsers(data.items);
  }, [userSearch]);

  React.useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const patch = async (body: Record<string, unknown>, msg: string) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(msg);
        refresh();
      } else {
        toast.error("Gagal menyimpan.");
      }
    } finally {
      setSaving(false);
    }
  };

  const applyTheme = (id: string) => {
    setThemeId(id);
    setTheme(id); // instant preview
    patch({ theme: id }, "Tema diperbarui untuk semua user.");
  };

  const userAction = async (userId: string, action: "ban" | "unban" | "kick") => {
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId, action }),
    });
    const data = await res.json();
    if (data.ok) {
      toast.success(
        action === "ban" ? "User dibanned." : action === "unban" ? "Ban dicabut." : "User dikeluarkan."
      );
      loadUsers();
    } else {
      toast.error(data.error || "Gagal.");
    }
  };

  return (
    <div className="space-y-4">
      {/* Theme Switcher */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" /> Theme Switcher
          </CardTitle>
          <CardDescription>Ganti tema global 1 klik. Berlaku real-time untuk semua user.</CardDescription>
        </CardHeader>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => applyTheme(t.id)}
              className={cn(
                "group relative flex flex-col items-center gap-2 rounded-2xl border p-3 transition",
                theme === t.id ? "border-primary ring-2 ring-primary" : "border-white/10 hover:border-white/30"
              )}
            >
              <span
                className="h-10 w-10 rounded-full ring-2 ring-white/20"
                style={{ background: t.swatch }}
              />
              <span className="text-xs font-medium">{t.label}</span>
              {theme === t.id && (
                <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </span>
              )}
            </button>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Daily limit */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-5 w-5" /> Limit Download
            </CardTitle>
            <CardDescription>Batas unduhan per user per hari.</CardDescription>
          </CardHeader>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              max={1000}
              value={dailyLimit}
              onChange={(e) => setDailyLimit(parseInt(e.target.value || "0", 10))}
              className="w-28"
            />
            <span className="text-sm text-muted-foreground">/ hari</span>
            <Button
              className="ml-auto"
              disabled={saving}
              onClick={() => patch({ dailyLimit }, `Limit diset ke ${dailyLimit}/hari.`)}
            >
              Simpan
            </Button>
          </div>
        </Card>

        {/* Maintenance mode */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Power className="h-5 w-5" /> Maintenance Mode
            </CardTitle>
            <CardDescription>Blokir download untuk non-admin.</CardDescription>
          </CardHeader>
          <div className="flex items-center justify-between">
            <Badge variant={maintenance ? "warning" : "success"}>
              {maintenance ? "AKTIF" : "NONAKTIF"}
            </Badge>
            <button
              onClick={() => {
                const next = !maintenance;
                setMaintenance(next);
                patch({ maintenanceMode: next }, `Maintenance ${next ? "diaktifkan" : "dimatikan"}.`);
              }}
              className={cn(
                "relative h-7 w-12 rounded-full transition",
                maintenance ? "bg-amber-500" : "bg-muted"
              )}
            >
              <span
                className={cn(
                  "absolute top-1 h-5 w-5 rounded-full bg-white transition-all",
                  maintenance ? "left-6" : "left-1"
                )}
              />
            </button>
          </div>
        </Card>
      </div>

      {/* Ban / Kick users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ban className="h-5 w-5" /> Kelola User (Ban / Kick)
          </CardTitle>
          <CardDescription>Ban memblokir chat + download. Kick memutus koneksi chat.</CardDescription>
        </CardHeader>
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            placeholder="Cari nama / email…"
            className="pl-9"
          />
        </div>
        <div className="scrollbar-thin max-h-80 space-y-2 overflow-y-auto pr-1">
          {users.map((u) => (
            <div key={u.id} className="glass-soft flex items-center gap-3 p-2">
              <Avatar src={u.image} name={u.name} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                  {u.name}
                  {u.role === "ADMIN" && <Badge variant="admin" className="text-[9px]">ADMIN</Badge>}
                  {u.isBanned && <Badge variant="danger" className="text-[9px]">BANNED</Badge>}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {u.email} · {u.totalDownloads} unduhan
                </p>
              </div>
              {u.role !== "ADMIN" && (
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => userAction(u.id, "kick")}>
                    <UserX className="h-4 w-4" /> Kick
                  </Button>
                  {u.isBanned ? (
                    <Button size="sm" variant="outline" onClick={() => userAction(u.id, "unban")}>
                      Unban
                    </Button>
                  ) : (
                    <Button size="sm" variant="destructive" onClick={() => userAction(u.id, "ban")}>
                      <Ban className="h-4 w-4" /> Ban
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
          {users.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">Tidak ada user.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
