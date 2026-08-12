"use client";

import * as React from "react";
import Link from "next/link";
import { signIn, signOut } from "next-auth/react";
import { LogIn, LogOut, Moon, Sun, Shield, Download, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/components/providers/app-provider";
import { useTheme } from "@/components/providers/theme-provider";
import { useSocket } from "@/components/providers/socket-provider";

export function Navbar() {
  const { user, authenticated, settings } = useApp();
  const { mode, toggleMode } = useTheme();
  const { connected } = useSocket();

  return (
    <header className="sticky top-0 z-40 glass-soft mx-auto mb-4 flex w-full items-center justify-between rounded-none border-x-0 border-t-0 px-4 py-3 sm:rounded-2xl sm:border-x sm:border-t">
      <Link href="/" className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl btn-grad shadow-lg">
          <Download className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-bold">
            SnapLam <span className="text-muted-foreground">v1.3</span>
          </p>
          <p className="hidden text-[10px] text-muted-foreground sm:block">
            Download Semua Video &amp; Ngobrol Santai
          </p>
        </div>
      </Link>

      <div className="flex items-center gap-2">
        {settings.maintenanceMode && (
          <Badge variant="warning" className="hidden items-center gap-1 sm:inline-flex">
            <Wrench className="h-3 w-3" /> Maintenance
          </Badge>
        )}
        <span
          className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-400" : "bg-red-400"}`}
          title={connected ? "Terhubung" : "Terputus"}
        />

        <Button size="icon" variant="ghost" onClick={toggleMode} title="Ganti mode">
          {mode === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>

        {user?.isAdmin && (
          <Button asChild size="sm" variant="outline">
            <Link href="/admin">
              <Shield className="h-4 w-4" /> Admin
            </Link>
          </Button>
        )}

        {authenticated ? (
          <div className="flex items-center gap-2">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-medium leading-tight">{user?.name}</p>
              <p className="text-[10px] text-muted-foreground">{user?.totalDownloads ?? 0} unduhan</p>
            </div>
            <Avatar src={user?.image} name={user?.name} />
            <Button size="icon" variant="ghost" onClick={() => signOut()} title="Keluar">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        ) : (
          <Button size="sm" onClick={() => signIn("google")}>
            <LogIn className="h-4 w-4" /> Masuk dengan Google
          </Button>
        )}
      </div>
    </header>
  );
}
