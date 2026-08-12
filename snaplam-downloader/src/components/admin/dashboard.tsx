"use client";

import * as React from "react";
import Link from "next/link";
import { LayoutDashboard, ScrollText, Megaphone, Settings2, ArrowLeft, Shield } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OverviewTab } from "./overview-tab";
import { LogsTab } from "./logs-tab";
import { BroadcastTab } from "./broadcast-tab";
import { SettingsTab } from "./settings-tab";
import { useApp } from "@/components/providers/app-provider";

export function AdminDashboard() {
  const { user } = useApp();

  return (
    <div className="mx-auto min-h-screen w-full max-w-7xl px-3 py-4 sm:px-6">
      {/* Header */}
      <div className="glass mb-4 flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl btn-grad">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Admin Dashboard</h1>
            <p className="text-xs text-muted-foreground">
              SnapLam v1.3 · {user?.email}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="admin">ADMIN</Badge>
          <Button asChild variant="outline" size="sm">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" /> Kembali
            </Link>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
          <TabsTrigger value="overview">
            <LayoutDashboard className="h-4 w-4" /> Overview
          </TabsTrigger>
          <TabsTrigger value="logs">
            <ScrollText className="h-4 w-4" /> Log Monitoring
          </TabsTrigger>
          <TabsTrigger value="broadcast">
            <Megaphone className="h-4 w-4" /> Broadcast
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings2 className="h-4 w-4" /> Theme &amp; Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab />
        </TabsContent>
        <TabsContent value="logs">
          <LogsTab />
        </TabsContent>
        <TabsContent value="broadcast">
          <BroadcastTab />
        </TabsContent>
        <TabsContent value="settings">
          <SettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
