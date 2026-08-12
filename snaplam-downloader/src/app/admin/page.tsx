import { redirect } from "next/navigation";
import { auth, isAdminEmail } from "@/lib/auth";
import { AdminDashboard } from "@/components/admin/dashboard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin Dashboard", robots: { index: false } };

// Server-side gate: only lamzy103@gmail.com (or role ADMIN) may enter.
export default async function AdminPage() {
  const session = await auth();
  const email = session?.user?.email;
  const role = (session?.user as any)?.role;

  if (!session?.user?.id) redirect("/");
  if (role !== "ADMIN" && !isAdminEmail(email)) redirect("/");

  return <AdminDashboard />;
}
