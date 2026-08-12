import { auth, isAdminEmail } from "./auth";

export interface AdminGuardResult {
  ok: boolean;
  userId?: string;
  email?: string;
}

// Reusable guard for admin API routes. Returns ok:false when not an admin.
export async function requireAdmin(): Promise<AdminGuardResult> {
  const session = await auth();
  const email = session?.user?.email;
  const role = (session?.user as any)?.role;
  if (!session?.user?.id) return { ok: false };
  if (role !== "ADMIN" && !isAdminEmail(email)) return { ok: false };
  return { ok: true, userId: session.user.id, email: email ?? undefined };
}
