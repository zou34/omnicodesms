import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";

/**
 * À appeler en tête de CHAQUE page admin, en plus de app/admin/layout.tsx.
 *
 * Un layout n'est pas une frontière de sécurité dans l'App Router : une
 * requête RSC forgée (en-tête Next-Router-State-Tree) peut faire rendre une
 * page sans réexécuter son layout. Chaque page qui lit des données sensibles
 * (e-mails, soldes, transactions, messages) vérifie donc elle-même le rôle.
 */
export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");
  return session;
}
