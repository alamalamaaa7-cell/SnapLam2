import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;

// Auth needs the Node runtime (Prisma adapter).
export const runtime = "nodejs";
