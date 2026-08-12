"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  Send,
  Smile,
  Pin,
  Trash2,
  Users,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { useSocket } from "@/components/providers/socket-provider";
import { useApp } from "@/components/providers/app-provider";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ChatMessage {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  role: "USER" | "ADMIN";
  content: string;
  pinned: boolean;
  deleted: boolean;
  createdAt: string;
}

const EMOJIS = ["😀", "😂", "🥳", "🔥", "❤️", "👍", "🙏", "😎", "🎉", "😅", "😭", "👏"];

// Turn URLs in message text into clickable links.
function renderContent(text: string) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return parts.map((p, i) =>
    /^https?:\/\//.test(p) ? (
      <a
        key={i}
        href={p}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline underline-offset-2 break-all"
      >
        {p}
      </a>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}

export function ChatPanel({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const { socket, onlineCount } = useSocket();
  const { user, authenticated } = useApp();
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [typingUser, setTypingUser] = React.useState<string | null>(null);
  const [showEmoji, setShowEmoji] = React.useState(false);
  const listRef = React.useRef<HTMLDivElement>(null);
  const typingTimeout = React.useRef<ReturnType<typeof setTimeout>>();

  const scrollToBottom = React.useCallback(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    });
  }, []);

  // Initial load of last 200 messages.
  React.useEffect(() => {
    if (!authenticated) return;
    fetch("/api/chat/messages", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          setMessages(d.items);
          scrollToBottom();
        }
      })
      .catch(() => {});
  }, [authenticated, scrollToBottom]);

  // Realtime handlers.
  React.useEffect(() => {
    if (!socket) return;
    const onMessage = (m: ChatMessage) => {
      setMessages((prev) => [...prev, m].slice(-200));
      scrollToBottom();
    };
    const onUpdated = (m: ChatMessage) => {
      setMessages((prev) => prev.map((x) => (x.id === m.id ? m : x)));
    };
    const onTyping = ({ name, typing }: { name: string; typing: boolean }) => {
      setTypingUser(typing ? name : null);
      if (typing) {
        clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => setTypingUser(null), 2500);
      }
    };
    socket.on("chat:message", onMessage);
    socket.on("chat:updated", onUpdated);
    socket.on("chat:typing", onTyping);
    return () => {
      socket.off("chat:message", onMessage);
      socket.off("chat:updated", onUpdated);
      socket.off("chat:typing", onTyping);
    };
  }, [socket, scrollToBottom]);

  const send = () => {
    const content = input.trim();
    if (!content || !socket) return;
    socket.emit("chat:send", { content }, (ack: { ok: boolean; error?: string }) => {
      if (!ack?.ok) toast.error(ack?.error || "Gagal mengirim.");
    });
    setInput("");
    setShowEmoji(false);
  };

  const onInputChange = (v: string) => {
    setInput(v);
    socket?.emit("chat:typing", true);
  };

  const pinMsg = (m: ChatMessage) =>
    socket?.emit("chat:pin", { id: m.id, pinned: !m.pinned }, () => {});
  const deleteMsg = (m: ChatMessage) => socket?.emit("chat:delete", { id: m.id }, () => {});

  const pinned = messages.filter((m) => m.pinned && !m.deleted);

  return (
    <div
      className={cn(
        "flex h-full flex-col transition-all duration-300",
        collapsed ? "items-center" : ""
      )}
    >
      {/* Header */}
      <div className="mb-3 flex w-full items-center justify-between">
        {!collapsed && (
          <div>
            <h2 className="flex items-center gap-2 font-semibold">
              <MessageCircle className="h-4 w-4" /> SnapLam Chat
            </h2>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" /> {onlineCount} online
            </p>
          </div>
        )}
        <Button size="icon" variant="ghost" onClick={onToggle} title="Collapse">
          <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
        </Button>
      </div>

      {collapsed ? (
        <div className="mt-4 flex flex-col items-center gap-2">
          <MessageCircle className="h-5 w-5 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">{messages.length}</span>
        </div>
      ) : (
        <>
          {/* Pinned messages */}
          {pinned.length > 0 && (
            <div className="mb-2 space-y-1">
              {pinned.map((m) => (
                <div
                  key={m.id}
                  className="glass-soft flex items-start gap-2 border-amber-400/30 bg-amber-500/10 p-2 text-xs"
                >
                  <Pin className="mt-0.5 h-3 w-3 shrink-0 text-amber-400" />
                  <span className="flex-1">
                    <b>{m.name}:</b> {m.content}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Messages */}
          <div ref={listRef} className="scrollbar-thin flex-1 space-y-3 overflow-y-auto pr-1">
            {!authenticated ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-sm text-muted-foreground">
                <MessageCircle className="mb-2 h-8 w-8 opacity-50" />
                Login untuk ikut ngobrol.
              </div>
            ) : (
              messages
                .filter((m) => !m.pinned || m.deleted)
                .concat([]) // keep all in stream too
                .length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Belum ada pesan. Sapa yang lain! 👋
                </div>
              ) : (
                messages.map((m) => {
                  const mine = m.email && m.email === user?.email;
                  return (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn("group flex gap-2", mine && "flex-row-reverse")}
                    >
                      <Avatar src={m.image} name={m.name} className="h-7 w-7" />
                      <div className={cn("max-w-[75%]", mine && "items-end text-right")}>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium">{mine ? "Kamu" : m.name}</span>
                          {m.role === "ADMIN" && <Badge variant="admin" className="text-[9px]">ADMIN</Badge>}
                        </div>
                        <div
                          className={cn(
                            "mt-0.5 inline-block break-words rounded-2xl px-3 py-1.5 text-sm",
                            m.deleted
                              ? "bg-muted italic text-muted-foreground"
                              : mine
                              ? "btn-grad"
                              : "glass-soft"
                          )}
                        >
                          {renderContent(m.content)}
                        </div>
                        {/* Admin controls */}
                        {user?.isAdmin && !m.deleted && (
                          <div className="mt-0.5 flex gap-1 opacity-0 transition group-hover:opacity-100">
                            <button
                              onClick={() => pinMsg(m)}
                              className="text-[10px] text-muted-foreground hover:text-amber-400"
                            >
                              <Pin className="inline h-3 w-3" /> {m.pinned ? "unpin" : "pin"}
                            </button>
                            <button
                              onClick={() => deleteMsg(m)}
                              className="text-[10px] text-muted-foreground hover:text-red-400"
                            >
                              <Trash2 className="inline h-3 w-3" /> hapus
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              )
            )}
            {/* Typing indicator */}
            <AnimatePresence>
              {typingUser && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-xs italic text-muted-foreground"
                >
                  {typingUser} sedang mengetik…
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Emoji picker */}
          <AnimatePresence>
            {showEmoji && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="glass-soft mt-2 flex flex-wrap gap-1 p-2"
              >
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    onClick={() => setInput((v) => v + e)}
                    className="rounded-lg p-1 text-lg hover:bg-accent/40"
                  >
                    {e}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Composer */}
          {authenticated && (
            <div className="mt-2 flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowEmoji((s) => !s)}
                title="Emoji"
              >
                <Smile className="h-5 w-5" />
              </Button>
              <Input
                value={input}
                onChange={(e) => onInputChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Ketik pesan…"
                className="h-10"
                maxLength={500}
              />
              <Button size="icon" onClick={send} disabled={!input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
