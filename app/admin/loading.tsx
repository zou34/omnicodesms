import { Loader2 } from "lucide-react";

// Renders inside app/admin/layout.tsx's content area (sidebar stays put),
// so this only needs to fill that area — not the full viewport — and
// matches the admin panel's light theme instead of the app-wide dark one.
export default function AdminLoading() {
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    </div>
  );
}
