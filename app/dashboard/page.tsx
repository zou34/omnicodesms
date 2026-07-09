import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { SignOutButton } from "@/components/auth/sign-out-button";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Tableau de bord</h1>
          <SignOutButton />
        </div>

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <p className="text-sm text-slate-400">Connecté en tant que</p>
          <p className="mt-1 text-lg font-medium">
            {session?.user?.name ?? session?.user?.email}
          </p>
          <p className="text-sm text-slate-500">{session?.user?.email}</p>
        </div>
      </div>
    </div>
  );
}
