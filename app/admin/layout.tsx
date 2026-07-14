import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { authOptions } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  // Role-based, not email-based: the User model already carries a `role`
  // (USER/ADMIN) set up back in the auth chantier, and it's already on the
  // session via the jwt/session callbacks — no extra env var needed, and it
  // supports more than one admin account out of the box. Promote an
  // account with `npm run make-admin -- <email>`.
  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
