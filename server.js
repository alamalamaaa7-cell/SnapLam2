/* eslint-disable @typescript-eslint/no-var-requires */
// ─────────────────────────────────────────────────────────────
// SnapLam - Downloader v1.3 — Custom single-process server
// Next.js (HTTP) + Socket.io (realtime chat & progress) + BullMQ worker
// One process keeps Railway memory well under 512MB.
// ─────────────────────────────────────────────────────────────
const { createServer } = require("http");
const { parse } = require("url");
const crypto = require("crypto");
const next = require("next");

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

// Internal token so the BullMQ worker can call back into the app securely.
const WORKER_TOKEN = crypto.randomBytes(24).toString("hex");
process.env.INTERNAL_WORKER_TOKEN = WORKER_TOKEN;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Lazy singletons (loaded after Next is ready).
let prisma = null;

async function main() {
  await app.prepare();

  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  // ── Socket.io ──────────────────────────────────────────────
  const { Server } = require("socket.io");
  const io = new Server(server, {
    path: "/socket.io",
    cors: { origin: true, credentials: true },
    // Small ping to detect disconnects; keeps presence accurate.
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  // Expose IO to Next API routes (same process) via globalThis.
  globalThis.__snaplamIO = io;

  prisma = getPrisma();

  registerSocketHandlers(io);
  startWorker(io);

  server.listen(port, hostname, () => {
    console.log(`▶ SnapLam v1.3 ready on http://${hostname}:${port} (dev=${dev})`);
  });
}

// ── Prisma (CommonJS require of generated client) ────────────
function getPrisma() {
  if (globalThis.prisma) return globalThis.prisma;
  const { PrismaClient } = require("@prisma/client");
  const client = new PrismaClient({ log: ["error"] });
  globalThis.prisma = client;
  return client;
}

// ── Session validation from NextAuth DB cookie ───────────────
// Placeholder — implemented below.
async function getUserFromCookie(cookieHeader) {
  return resolveUser(cookieHeader);
}

// ── Socket handlers (chat + presence + progress rooms) ───────
function registerSocketHandlers(io) {
  attachSocketLogic(io);
}

// ── BullMQ worker (delegates processing to internal API) ─────
function startWorker(io) {
  attachWorker(io);
}

main().catch((err) => {
  console.error("Fatal server error:", err);
  process.exit(1);
});

// The heavy implementations live below to keep main() readable.
// They are hoisted function declarations.

// Resolve the logged-in user from the NextAuth database session cookie.
// We validate against the Session table rather than trusting the client.
async function resolveUser(cookieHeader) {
  try {
    if (!cookieHeader) return null;
    const cookies = Object.fromEntries(
      cookieHeader.split(";").map((c) => {
        const idx = c.indexOf("=");
        return [c.slice(0, idx).trim(), decodeURIComponent(c.slice(idx + 1))];
      })
    );
    // NextAuth v5 session cookie names (secure prefix in production).
    const token =
      cookies["authjs.session-token"] ||
      cookies["__Secure-authjs.session-token"] ||
      cookies["next-auth.session-token"] ||
      cookies["__Secure-next-auth.session-token"];
    if (!token) return null;

    const session = await prisma.session.findUnique({
      where: { sessionToken: token },
      include: { user: true },
    });
    if (!session || session.expires < new Date()) return null;
    if (session.user?.isBanned) return null;
    return session.user;
  } catch (e) {
    return null;
  }
}
// Simple in-memory anti-spam window: 10 messages / 60s per user.
const chatWindows = new Map(); // email -> number[] (timestamps)
const BAD_WORDS = [
  "anjing", "babi", "bangsat", "kontol", "memek", "ngentot", "jancok",
  "tolol", "goblok", "bajingan", "brengsek", "asu", "kampret", "pepek",
  "fuck", "shit", "bitch", "asshole", "dick", "pussy", "cunt", "bastard",
];
const BAD_RE = new RegExp(`\\b(${BAD_WORDS.join("|")})\\b`, "gi");
function maskProfanity(t) {
  return t.replace(BAD_RE, (m) => m[0] + "*".repeat(Math.max(1, m.length - 1)));
}

function allowChat(email) {
  const now = Date.now();
  const arr = (chatWindows.get(email) || []).filter((t) => now - t < 60_000);
  if (arr.length >= 10) {
    chatWindows.set(email, arr);
    return false;
  }
  arr.push(now);
  chatWindows.set(email, arr);
  return true;
}

function attachSocketLogic(io) {
  // Track online users: email -> Set(socketId)
  const online = new Map();

  const emitPresence = () => {
    io.emit("presence:update", { count: online.size, emails: [...online.keys()] });
  };

  io.on("connection", async (socket) => {
    const cookieHeader = socket.handshake.headers.cookie || "";
    const user = await resolveUser(cookieHeader);

    // Anonymous sockets can still receive progress on their own room,
    // but cannot chat.
    socket.data.user = user
      ? {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        }
      : null;

    if (user) {
      const set = online.get(user.email) || new Set();
      set.add(socket.id);
      online.set(user.email, set);
      emitPresence();

      // Deliver unread broadcasts on login.
      try {
        const reads = await prisma.broadcastRead.findMany({
          where: { userId: user.id },
          select: { broadcastId: true },
        });
        const readIds = new Set(reads.map((r) => r.broadcastId));
        const recent = await prisma.broadcast.findMany({
          orderBy: { createdAt: "desc" },
          take: 10,
        });
        const unread = recent.filter((b) => !readIds.has(b.id));
        if (unread.length) socket.emit("broadcast:unread", unread);
      } catch {}
    }

    // Client asks to join its personal progress room (by socket id — trivial).
    socket.on("progress:subscribe", () => {
      socket.emit("progress:subscribed", { socketId: socket.id });
    });

    // ── Chat send ───────────────────────────────────────────
    socket.on("chat:send", async (payload, ack) => {
      try {
        const u = socket.data.user;
        if (!u) return ack?.({ ok: false, error: "Harus login untuk chat." });

        // Re-check ban status live.
        const fresh = await prisma.user.findUnique({ where: { id: u.id } });
        if (!fresh || fresh.isBanned) {
          return ack?.({ ok: false, error: "Kamu telah dibanned dari chat." });
        }

        let content = String(payload?.content || "").replace(/\s+/g, " ").trim().slice(0, 500);
        if (!content) return ack?.({ ok: false, error: "Pesan kosong." });
        if (!allowChat(u.email)) {
          return ack?.({ ok: false, error: "Terlalu cepat! Maks 10 pesan/menit." });
        }
        content = maskProfanity(content);

        const msg = await prisma.chatMessage.create({
          data: {
            userId: u.id,
            email: u.email,
            name: u.name,
            image: u.image,
            role: u.role,
            content,
          },
        });

        io.emit("chat:message", serializeMsg(msg));

        // Keep only the last 200 messages (prune older, non-pinned).
        pruneChat().catch(() => {});
        ack?.({ ok: true });
      } catch (e) {
        ack?.({ ok: false, error: "Gagal mengirim pesan." });
      }
    });

    // ── Typing indicator ────────────────────────────────────
    socket.on("chat:typing", (isTyping) => {
      const u = socket.data.user;
      if (!u) return;
      socket.broadcast.emit("chat:typing", { name: u.name, typing: !!isTyping });
    });

    // ── Admin: pin / unpin ──────────────────────────────────
    socket.on("chat:pin", async ({ id, pinned }, ack) => {
      const u = socket.data.user;
      if (!u || u.role !== "ADMIN") return ack?.({ ok: false });
      const msg = await prisma.chatMessage.update({
        where: { id },
        data: { pinned: !!pinned },
      });
      io.emit("chat:updated", serializeMsg(msg));
      ack?.({ ok: true });
    });

    // ── Admin: delete message ───────────────────────────────
    socket.on("chat:delete", async ({ id }, ack) => {
      const u = socket.data.user;
      if (!u || u.role !== "ADMIN") return ack?.({ ok: false });
      const msg = await prisma.chatMessage.update({
        where: { id },
        data: { deleted: true, content: "[dihapus admin]" },
      });
      io.emit("chat:updated", serializeMsg(msg));
      ack?.({ ok: true });
    });

    socket.on("disconnect", () => {
      const u = socket.data.user;
      if (u) {
        const set = online.get(u.email);
        if (set) {
          set.delete(socket.id);
          if (set.size === 0) online.delete(u.email);
        }
        emitPresence();
      }
    });
  });

  // Admin kick: server-side listener triggered from API via globalThis IO.
  io.on("__internal_kick", () => {});
}

function serializeMsg(m) {
  return {
    id: m.id,
    email: m.email,
    name: m.name,
    image: m.image,
    role: m.role,
    content: m.content,
    pinned: m.pinned,
    deleted: m.deleted,
    createdAt: m.createdAt,
  };
}

async function pruneChat() {
  const total = await prisma.chatMessage.count();
  if (total <= 200) return;
  const excess = total - 200;
  const old = await prisma.chatMessage.findMany({
    where: { pinned: false },
    orderBy: { createdAt: "asc" },
    take: excess,
    select: { id: true },
  });
  if (old.length) {
    await prisma.chatMessage.deleteMany({ where: { id: { in: old.map((o) => o.id) } } });
  }
}
// BullMQ worker. Only runs when Redis is configured. Each job triggers the
// internal processing route (which contains the shared TS logic + Socket.io
// emits). Concurrency is kept low to protect the memory budget.
function attachWorker(io) {
  const url = process.env.UPSTASH_REDIS_URL;
  if (!url) {
    console.log("ℹ Redis not configured — downloads run inline (no queue worker).");
    return;
  }
  try {
    const { Worker } = require("bullmq");
    const IORedis = require("ioredis");
    const connection = new IORedis(url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
    connection.on("error", (e) => console.error("[worker redis]", e?.message));

    const worker = new Worker(
      "snaplam-downloads",
      async (job) => {
        const { downloadId, url: target, socketId } = job.data;
        const res = await fetch(
          `http://127.0.0.1:${port}/api/internal/process`,
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-worker-token": process.env.INTERNAL_WORKER_TOKEN,
            },
            body: JSON.stringify({ downloadId, url: target, socketId }),
          }
        );
        if (!res.ok) throw new Error(`process route ${res.status}`);
        return await res.json();
      },
      { connection, concurrency: 3 }
    );

    worker.on("failed", (job, err) => {
      console.error(`✗ job ${job?.id} failed:`, err?.message);
    });
    console.log("✔ BullMQ worker started (concurrency=3).");
  } catch (e) {
    console.error("Failed to start worker:", e?.message);
  }
}
