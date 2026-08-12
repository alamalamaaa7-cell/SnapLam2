"use client";

import * as React from "react";
import { io, Socket } from "socket.io-client";

interface SocketCtx {
  socket: Socket | null;
  connected: boolean;
  socketId: string | null;
  onlineCount: number;
}

const Ctx = React.createContext<SocketCtx>({
  socket: null,
  connected: false,
  socketId: null,
  onlineCount: 0,
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = React.useState<Socket | null>(null);
  const [connected, setConnected] = React.useState(false);
  const [socketId, setSocketId] = React.useState<string | null>(null);
  const [onlineCount, setOnlineCount] = React.useState(0);

  React.useEffect(() => {
    // Connect to the same origin; cookies carry the session for auth.
    const s = io({
      path: "/socket.io",
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    s.on("connect", () => {
      setConnected(true);
      setSocketId(s.id ?? null);
    });
    s.on("disconnect", () => setConnected(false));
    s.on("presence:update", (p: { count: number }) => setOnlineCount(p.count));

    setSocket(s);
    return () => {
      s.close();
    };
  }, []);

  return (
    <Ctx.Provider value={{ socket, connected, socketId, onlineCount }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSocket() {
  return React.useContext(Ctx);
}
