import { Loader2 } from "lucide-react";

// Applies to any segment without its own more specific loading.tsx (e.g.
// /dashboard) while it's fetching data server-side. app/admin has its own
// (lighter-themed) loading.tsx since it renders inside a light content area.
export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
    </div>
  );
}
