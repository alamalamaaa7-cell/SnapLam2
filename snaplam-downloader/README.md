# SnapLam — Downloader v1.3

> **Download Semua Video & Ngobrol Santai**
> Downloader multi-platform (TikTok, YouTube, Instagram, CapCut, Facebook, Pinterest, SnackVideo, Spotify, Terabox) dengan chat global real-time, dashboard admin, dan tema yang bisa diganti 1 klik. Ringan, cepat, dan siap deploy 1 klik ke **Railway.app**.

---

## Fitur Utama

- **Downloader multi-platform** — auto-detect platform dari URL, ambil thumbnail/judul/durasi, tombol download MP4/MP3/Image.
- **Progress real-time** via Socket.io (staged: fetch → proses → siap).
- **Chat global real-time** — emoji, link, "sedang mengetik…", badge ADMIN, pin & hapus pesan, anti-spam (10 pesan/menit) + filter kata kasar, simpan 200 pesan terakhir.
- **Dashboard Admin** (`/admin`, khusus `lamzy103@gmail.com`) dengan 4 tab: Overview, Log Monitoring (search/filter/export CSV), Broadcast Notifikasi, Theme & Settings.
- **Theme Switcher** 1 klik: Abu / Biru / Putih / Orange / Emas — berlaku real-time untuk semua user. Plus toggle Dark/Light per user.
- **Auth Google-only** (NextAuth v5). Email admin otomatis jadi role ADMIN.
- **Rate limit** 30 request/jam per IP, **limit download** 20/hari per user (dapat diubah admin), **cache** hasil API 30 menit di Redis.
- **Maintenance mode**, **ban/kick user**, **healthcheck** `/api/health`, SEO (metadata, sitemap, robots, manifest).

---

## Tech Stack

| Layer      | Teknologi                                             |
|------------|-------------------------------------------------------|
| Frontend   | Next.js 14 (App Router) · TypeScript · TailwindCSS · shadcn/ui · Framer Motion |
| Backend    | Next.js API Routes · custom server (Node http) · Socket.io |
| Queue      | BullMQ + Upstash Redis (opsional, fallback inline)    |
| Database   | MongoDB Atlas + Prisma                                |
| Auth       | NextAuth.js v5 — Google OAuth only                    |

### Kenapa ringan (< 512MB di Railway)?

- **Satu proses** (`server.js`) menjalankan Next.js + Socket.io + worker BullMQ. Tidak ada service tambahan.
- **File tidak di-proxy lewat server** — link CDN langsung diberikan ke browser, jadi server tidak pernah buffer video besar.
- Heap Node dibatasi `--max-old-space-size=460` (lihat `nixpacks.toml`).
- Prisma & Redis dijadikan singleton; koneksi di-reuse.

---

## Struktur Folder

```
snaplam-downloader/
├── server.js                 # Custom server: Next + Socket.io + BullMQ worker
├── railway.json              # Konfigurasi deploy Railway
├── nixpacks.toml             # Build config (heap cap, start command)
├── Dockerfile                # Opsional (deploy Docker)
├── .env.example              # Template environment variables
├── prisma/
│   └── schema.prisma         # Model MongoDB (User, Download, ChatMessage, Broadcast, Settings…)
└── src/
    ├── middleware.ts         # Fast-guard /admin
    ├── app/
    │   ├── layout.tsx        # Root layout + Providers + SEO metadata
    │   ├── page.tsx          # Workspace (Chat | Downloader | History)
    │   ├── globals.css       # Glassmorphism + tema CSS variables
    │   ├── admin/page.tsx    # Gate server-side → AdminDashboard
    │   ├── sitemap.ts · robots.ts · manifest.ts · not-found.tsx
    │   └── api/
    │       ├── auth/[...nextauth]/route.ts
    │       ├── health/route.ts          # Healthcheck Railway
    │       ├── me/route.ts              # Bootstrap user + settings + unread broadcast
    │       ├── preview/route.ts         # Fetch metadata (tanpa mencatat)
    │       ├── download/route.ts        # Buat job download (queue/inline)
    │       ├── history/route.ts         # Riwayat user
    │       ├── chat/messages/route.ts   # 200 pesan terakhir
    │       ├── internal/process/route.ts# Dipanggil worker (token internal)
    │       └── admin/{stats,logs,broadcast,settings,users}/route.ts
    ├── components/
    │   ├── ui/               # Primitives shadcn-style (button, card, tabs, …)
    │   ├── providers/        # Auth, Theme, Socket, App context
    │   ├── admin/            # overview / logs / broadcast / settings / dashboard
    │   ├── workspace.tsx · navbar.tsx · chat-panel.tsx · downloader.tsx · history-panel.tsx
    └── lib/
        ├── prisma.ts · redis.ts · auth.ts · admin-guard.ts
        ├── platforms.ts · fetcher.ts · processor.ts · queue.ts
        ├── socket.ts · ratelimit.ts · moderation.ts · settings.ts · themes.ts
        └── utils.ts · request.ts
```

---

## Setup Lokal

### 1. Prasyarat
- Node.js ≥ 18.17
- Akun **MongoDB Atlas** (gratis), **Google Cloud** (OAuth), opsional **Upstash Redis**.

### 2. Install
```bash
npm install
cp .env.example .env    # lalu isi nilainya
```

### 3. Isi `.env`
Lihat bagian **Environment Variables**. Wajib: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `MONGODB_URI`, `ADMIN_EMAIL`. `UPSTASH_REDIS_URL` opsional.

### 4. Siapkan database
```bash
npm run db:push        # sinkron schema Prisma ke MongoDB
```

### 5. Jalankan
```bash
npm run dev            # http://localhost:3000
```

---

## Google OAuth (cara cepat)

1. Buka [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services → Credentials**.
2. **Create Credentials → OAuth client ID → Web application**.
3. **Authorized JavaScript origins**: `http://localhost:3000` dan domain Railway kamu.
4. **Authorized redirect URIs**:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://<domain-railway>/api/auth/callback/google`
5. Salin **Client ID** & **Client Secret** ke `.env`.

`NEXTAUTH_SECRET` bisa dibuat dengan:
```bash
openssl rand -base64 32
```

---

## Deploy ke Railway (1 klik-ish)

1. Push project ini ke GitHub.
2. Di [Railway](https://railway.app): **New Project → Deploy from GitHub repo** → pilih repo ini.
3. Railway otomatis mendeteksi **Nixpacks** (`nixpacks.toml`) dan `railway.json`.
4. Buka tab **Variables**, tambahkan semua env dari `.env.example`:
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL` → set ke domain Railway (mis. `https://snaplam.up.railway.app`)
   - `MONGODB_URI`
   - `UPSTASH_REDIS_URL` (opsional)
   - `ADMIN_EMAIL=lamzy103@gmail.com`
   > `PORT` **tidak perlu** diisi — Railway meng-inject otomatis dan `server.js` sudah membaca `process.env.PORT`.
5. Setelah domain aktif, update **Authorized redirect URI** Google dengan domain tersebut.
6. Healthcheck sudah dikonfigurasi ke `/api/health` (lihat `railway.json`).

> **Catatan MongoDB Atlas:** izinkan akses dari mana saja (`0.0.0.0/0`) di Network Access, atau tambahkan IP egress Railway.

### Build & Start
- Build: `prisma generate && next build`
- Start: `node server.js` (membaca `PORT`, bind `0.0.0.0`)

---

## Environment Variables

| Variable              | Wajib | Deskripsi                                             |
|-----------------------|:----:|-------------------------------------------------------|
| `GOOGLE_CLIENT_ID`    | ✅   | Google OAuth client id                                |
| `GOOGLE_CLIENT_SECRET`| ✅   | Google OAuth client secret                            |
| `NEXTAUTH_SECRET`     | ✅   | Secret sesi NextAuth (`openssl rand -base64 32`)      |
| `NEXTAUTH_URL`        | ✅   | URL publik app (domain Railway / `http://localhost:3000`) |
| `MONGODB_URI`         | ✅   | Connection string MongoDB Atlas (termasuk nama DB)    |
| `UPSTASH_REDIS_URL`   | ⛔   | `rediss://…` untuk queue + cache + rate-limit. Kalau kosong → mode inline. |
| `ADMIN_EMAIL`         | ✅   | Email admin (default `lamzy103@gmail.com`)            |
| `PORT`                | ⛔   | Otomatis dari Railway; default `3000` lokal           |

---

## Provider API Downloader

Aplikasi memakai endpoint publik `https://api.ikyyxd.my.id/download/...`:

| Platform   | Endpoint                          | Param |
|------------|-----------------------------------|-------|
| TikTok     | `/tiktokv3`                       | `url` |
| Instagram  | `/igv2`                           | `url` |
| YouTube    | `/ytmp4`                          | `q`   |
| CapCut     | `/capcut`                         | `url` |
| Facebook   | `/facebook`                       | `url` |
| Spotify    | `/spotifydl`                      | `url` |
| Terabox    | `/terabox`                        | `url` |
| Pinterest / SnackVideo | best-effort slug      | `url` |

> Respons provider di-parse secara **defensif** (`src/lib/fetcher.ts`) karena bentuk JSON tiap endpoint bisa berbeda — kode menelusuri payload untuk menemukan URL media (MP4/MP3/Image), judul, thumbnail, durasi, dan author. Bila provider mengubah format atau sebuah endpoint tidak tersedia, error ditangani rapi ("Video Tidak Ditemukan" / "Link Private").

---

## Arsitektur Real-time

```
Browser ──HTTP──> Next API Routes ──> MongoDB (Prisma)
   │                     │
   │                     └── emit lewat globalThis.__snaplamIO
   └──WebSocket──> Socket.io (server.js, proses yang sama)
                         │
                         └── BullMQ Worker ──> /api/internal/process ──> provider
```

- Chat, progress download, broadcast, dan perubahan tema semuanya lewat satu koneksi Socket.io.
- Identitas socket diverifikasi dari **cookie sesi NextAuth** di server (bukan dari klaim klien).

---

## Catatan Keamanan & Batasan

- Endpoint `/api/internal/process` dilindungi token acak per-boot (`INTERNAL_WORKER_TOKEN`) dan hanya dipanggil dari worker di localhost.
- Admin gating dilakukan **server-side** (`/admin/page.tsx` + tiap route admin memakai `requireAdmin`). `middleware.ts` hanya redirect cepat.
- Filter kata kasar (`src/lib/moderation.ts`) sengaja ringan; tambahkan kata sesuai kebutuhan.
- Provider pihak ketiga di luar kendali aplikasi; ketersediaan/format bisa berubah sewaktu-waktu.

---

## Script

```bash
npm run dev        # jalankan server (custom) mode dev
npm run build      # prisma generate + next build
npm run start      # jalankan produksi (node server.js)
npm run db:push    # push schema Prisma ke MongoDB
npm run lint       # eslint
```

---

Dibuat untuk deploy cepat & hemat memori. Selamat nge-download & ngobrol santai! 🎬💬
