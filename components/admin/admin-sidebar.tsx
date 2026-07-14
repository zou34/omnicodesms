"use client";

import {
  ArrowLeft,
  LayoutDashboard,
  Phone,
  Receipt,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { SignOutButton } from "@/components/auth/sign-out-button";

const NAV_ITEMS = [
  { href: "/admin", label: "Vue d'ensemble", icon: LayoutDashboard },
  { href: "/admin/users", label: "Utilisateurs", icon: Users },
  { href: "/admin/transactions", label: "Transactions", icon: Receipt },
  { href: "/admin/numbers", label: "Numéros Actifs", icon: Phone },
  { href: "/admin/settings", label: "Paramètres", icon: Settings },
] as const;

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col bg-slate-950 text-white">
      <div className="px-6 py-6">
        <span className="text-lg font-bold tracking-tight">OmniCodeSMS</span>
        <p className="mt-0.5 text-xs text-slate-500">Panneau d&apos;administration</p>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:bg-slate-900 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-3 border-t border-slate-900 px-3 py-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-slate-900 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au site
        </Link>
        <div className="px-3">
          <SignOutButton />
        </div>
      </div>
    </aside>
  );
}
