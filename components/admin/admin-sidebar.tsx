"use client";

import {
  ArrowLeft,
  LayoutDashboard,
  Menu,
  Phone,
  Receipt,
  Settings,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { SignOutButton } from "@/components/auth/sign-out-button";

const NAV_ITEMS = [
  { href: "/admin", label: "Vue d'ensemble", icon: LayoutDashboard },
  { href: "/admin/users", label: "Utilisateurs", icon: Users },
  { href: "/admin/transactions", label: "Transactions", icon: Receipt },
  { href: "/admin/numbers", label: "Numéros Actifs", icon: Phone },
  { href: "/admin/settings", label: "Paramètres", icon: Settings },
] as const;

// Static, always-visible column on large screens (lg:static lg:translate-x-0
// below cancels every mobile-only class); a slide-in drawer over a backdrop
// on anything smaller, triggered by the fixed top bar's burger button.
export function AdminSidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // A nav link click changes the route, which is also our cue to close the
  // drawer — no need for every <Link> to remember to do it individually.
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <>
      {/* Mobile-only top bar; the desktop sidebar has its own always-visible
          brand header below, so this is hidden from lg: up. */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-slate-800 bg-slate-950 px-4 text-white lg:hidden">
        <span className="text-base font-bold tracking-tight">OmniCodeSMS</span>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="rounded-lg p-2 text-slate-300 transition hover:bg-slate-900 hover:text-white"
          aria-label="Ouvrir le menu d'administration"
          aria-expanded={isOpen}
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-64 shrink-0 flex-col bg-slate-950 text-white transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-900 hover:text-white lg:hidden"
          aria-label="Fermer le menu d'administration"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="px-6 py-6">
          <span className="text-lg font-bold tracking-tight">OmniCodeSMS</span>
          <p className="mt-0.5 text-xs text-slate-500">Panneau d&apos;administration</p>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = href === "/admin" ? pathname === "/admin" : (pathname ?? "").startsWith(href);

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
    </>
  );
}
