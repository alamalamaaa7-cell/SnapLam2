"use client";

import * as React from "react";
import { Send, Megaphone } from "lucide-react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

interface BroadcastRow {
  id: string;
  title: string;
  message: string;
  type: "INFO" | "UPDATE" | "MAINTENANCE";
  createdAt: string;
}

const typeVariant = (t: string) =>
  t === "MAINTENANCE" ? "warning" : t === "UPDATE" ? "default" : "secondary";

export function BroadcastTab() {
  const [title, setTitle] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [type, setType] = React.useState<"INFO" | "UPDATE" | "MAINTENANCE">("INFO");
  const [sending, setSending] = React.useState(false);
  const [history, setHistory] = React.useState<BroadcastRow[]>([]);

  const load = React.useCallback(async () => {
    const res = await fetch("/api/admin/broadcast", { cache: "no-store" });
    const data = await res.json();
    if (data.ok) setHistory(data.items);
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const send = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error("Judul & pesan wajib diisi.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, message, type }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success("Notifikasi terkirim ke semua user online!");
        setTitle("");
        setMessage("");
        setType("INFO");
        load();
      } else {
        toast.error(data.error || "Gagal mengirim.");
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" /> Kirim Broadcast
          </CardTitle>
          <CardDescription>
            Notifikasi pop-up real-time ke semua user online. User offline melihat saat login.
          </CardDescription>
        </CardHeader>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Judul</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul notifikasi" maxLength={120} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Pesan</label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Tulis pesan…" maxLength={1000} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Tipe</label>
            <div className="flex gap-2">
              {(["INFO", "UPDATE", "MAINTENANCE"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`rounded-xl px-3 py-1.5 text-sm transition ${
                    type === t ? "btn-grad" : "glass-soft"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={send} disabled={sending} className="w-full">
            <Send className="h-4 w-4" /> {sending ? "Mengirim…" : "Kirim Sekarang"}
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Broadcast</CardTitle>
        </CardHeader>
        <div className="scrollbar-thin max-h-[420px] space-y-2 overflow-y-auto pr-1">
          {history.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Belum ada broadcast.</p>
          ) : (
            history.map((b) => (
              <div key={b.id} className="glass-soft p-3">
                <div className="flex items-center justify-between">
                  <b className="text-sm">{b.title}</b>
                  <Badge variant={typeVariant(b.type) as any} className="text-[10px]">
                    {b.type}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{b.message}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">{formatDate(b.createdAt)}</p>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
