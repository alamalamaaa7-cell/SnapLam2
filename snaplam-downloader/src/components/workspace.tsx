"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { MessageCircle, Download, History } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { ChatPanel } from "@/components/chat-panel";
import { Downloader } from "@/components/downloader";
import { HistoryPanel, HistoryHandle } from "@/components/history-panel";
import { useApp } from "@/components/providers/app-provider";
import { cn } from "@/lib/utils";

type MobileTab = "chat" | "download" | "history";

export function Workspace() {
  const { authenticated } = useApp();
  const [chatCollapsed, setChatCollapsed] = React.useState(false);
  const [mobileTab, setMobileTab] = React.useState<MobileTab>("download");
  const historyRef = React.useRef<HistoryHandle>(null);

  const refreshHistory = React.useCallback(() => {
    historyRef.current?.reload();
  }, []);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col px-2 sm:px-4">
      <Navbar />

      {/* Desktop 3-column grid */}
      <div className="hidden flex-1 gap-4 pb-4 lg:flex">
        {/* Left: Chat */}
        <motion.aside
          animate={{ width: chatCollapsed ? 64 : 320 }}
          transition={{ type: "spring", stiffness: 200, damping: 26 }}
          className="glass h-[calc(100vh-90px)] shrink-0 overflow-hidden p-3"
        >
          <ChatPanel collapsed={chatCollapsed} onToggle={() => setChatCollapsed((c) => !c)} />
        </motion.aside>

        {/* Center: Downloader */}
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <Downloader onHistoryChange={refreshHistory} />
        </main>

        {/* Right: History */}
        <aside className="glass h-[calc(100vh-90px)] w-80 shrink-0 overflow-hidden p-3">
          {authenticated ? (
            <HistoryPanel ref={historyRef} />
          ) : (
            <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
              Login untuk melihat riwayat.
            </div>
          )}
        </aside>
      </div>

      {/* Mobile: single panel + bottom tabs */}
      <div className="flex flex-1 flex-col pb-20 lg:hidden">
        <div className="glass min-h-[calc(100vh-160px)] p-3">
          {mobileTab === "chat" && (
            <div className="h-[calc(100vh-190px)]">
              <ChatPanel collapsed={false} onToggle={() => {}} />
            </div>
          )}
          {mobileTab === "download" && <Downloader onHistoryChange={refreshHistory} />}
          {mobileTab === "history" && (
            <div className="h-[calc(100vh-190px)]">
              {authenticated ? (
                <HistoryPanel ref={historyRef} />
              ) : (
                <p className="text-center text-sm text-muted-foreground">Login untuk riwayat.</p>
              )}
            </div>
          )}
        </div>

        {/* Bottom tab bar */}
        <nav className="fixed inset-x-0 bottom-0 z-40 glass-soft mx-2 mb-2 flex items-center justify-around rounded-2xl py-2">
          {[
            { id: "chat", label: "Chat", icon: MessageCircle },
            { id: "download", label: "Download", icon: Download },
            { id: "history", label: "Riwayat", icon: History },
          ].map((t) => {
            const Icon = t.icon;
            const active = mobileTab === (t.id as MobileTab);
            return (
              <button
                key={t.id}
                onClick={() => setMobileTab(t.id as MobileTab)}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1 text-xs transition",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className={cn("h-5 w-5", active && "scale-110")} />
                {t.label}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
