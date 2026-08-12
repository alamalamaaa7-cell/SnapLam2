import type { Server as IOServer } from "socket.io";

// The custom server (server.js) attaches the Socket.io instance to
// globalThis so Next.js API routes running in the SAME process can emit
// realtime events without opening a second connection.
const g = globalThis as unknown as { __snaplamIO?: IOServer };

export function getIO(): IOServer | null {
  return g.__snaplamIO ?? null;
}

export function setIO(io: IOServer) {
  g.__snaplamIO = io;
}

// Convenience emitters used across API routes.
export function emitDownloadProgress(payload: {
  downloadId: string;
  stage: string;
  percent: number;
  socketId?: string;
  status?: string;
  result?: unknown;
  error?: string;
}) {
  const io = getIO();
  if (!io) return;
  if (payload.socketId) {
    io.to(payload.socketId).emit("download:progress", payload);
  } else {
    io.emit("download:progress", payload);
  }
}

export function emitBroadcast(payload: {
  id: string;
  title: string;
  message: string;
  type: string;
  createdAt: string;
}) {
  const io = getIO();
  io?.emit("broadcast:new", payload);
}

export function emitChat(event: string, payload: unknown) {
  const io = getIO();
  io?.emit(event, payload);
}

// Force-disconnect / kick a user from chat by email (admin action).
export function kickUser(email: string) {
  const io = getIO();
  if (!io) return;
  io.emit("chat:kick", { email });
}
