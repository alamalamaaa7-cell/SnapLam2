"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";
import { Users, Download, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const PIE_COLORS = ["#ec4899", "#ef4444", "#f59e0b", "#3b82f6", "#10b981", "#8b5cf6", "#06b6d4", "#f97316"];

interface Stats {
  cards: { totalUsers: number; totalDownloads: number; success: number; failed: number };
  daily: { date: string; count: number }[];
  byPlatform: { name: string; value: number }[];
}

export function OverviewTab() {
  const [stats, setStats] = React.useState<Stats | null>(null);

  React.useEffect(() => {
    fetch("/api/admin/stats", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => d.ok && setStats(d))
      .catch(() => {});
  }, []);

  if (!stats) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <Skeleton className="h-16 w-full" />
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    { label: "Total User", value: stats.cards.totalUsers, icon: Users, color: "from-blue-500 to-indigo-600" },
    { label: "Total Download", value: stats.cards.totalDownloads, icon: Download, color: "from-fuchsia-500 to-purple-600" },
    { label: "Sukses", value: stats.cards.success, icon: CheckCircle2, color: "from-emerald-500 to-green-600" },
    { label: "Gagal", value: stats.cards.failed, icon: XCircle, color: "from-red-500 to-rose-600" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label} className="relative overflow-hidden">
              <div className={`absolute -right-4 -top-4 h-20 w-20 rounded-full bg-gradient-to-br ${c.color} opacity-20 blur-xl`} />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{c.label}</p>
                  <p className="text-3xl font-extrabold">{c.value.toLocaleString("id-ID")}</p>
                </div>
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${c.color}`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Download 30 Hari Terakhir</CardTitle>
          </CardHeader>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.daily} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} interval={4} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 12,
                  }}
                />
                <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="url(#grad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Per Platform</CardTitle>
          </CardHeader>
          <div className="h-64 w-full">
            {stats.byPlatform.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Belum ada data.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.byPlatform}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {stats.byPlatform.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {stats.byPlatform.map((p, i) => (
              <span key={p.name} className="flex items-center gap-1 text-xs text-muted-foreground">
                <span className="h-2 w-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                {p.name} ({p.value})
              </span>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
