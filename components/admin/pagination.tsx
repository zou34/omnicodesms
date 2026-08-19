import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

interface PaginationProps {
  basePath: string;
  page: number;
  totalPages: number;
  totalCount: number;
}

export function Pagination({ basePath, page, totalPages, totalCount }: PaginationProps) {
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
      <p className="text-xs text-slate-500">
        Page {page} / {totalPages} &middot; {totalCount.toLocaleString("fr-FR")} au total
      </p>

      <div className="flex items-center gap-2">
        <Link
          href={hasPrev ? `${basePath}?page=${page - 1}` : "#"}
          aria-disabled={!hasPrev}
          className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
            hasPrev
              ? "text-slate-700 hover:bg-slate-100"
              : "pointer-events-none text-slate-300"
          }`}
        >
          <ChevronLeft className="h-4 w-4" />
          Précédent
        </Link>
        <Link
          href={hasNext ? `${basePath}?page=${page + 1}` : "#"}
          aria-disabled={!hasNext}
          className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
            hasNext
              ? "text-slate-700 hover:bg-slate-100"
              : "pointer-events-none text-slate-300"
          }`}
        >
          Suivant
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
