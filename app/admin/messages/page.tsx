import { Mail, MessageSquare, Reply } from "lucide-react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { Pagination } from "@/components/admin/pagination";
import { getContactMessagesPage } from "@/lib/admin/queries";
import { authOptions } from "@/lib/auth";

// Toujours lu en direct : un nouveau message doit apparaître sans attendre.
export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Africa/Abidjan",
});

export default async function AdminMessagesPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  // Double contrôle : app/admin/layout.tsx protège déjà la section, mais un
  // layout n'est pas réexécuté à chaque navigation côté client. Cette page
  // expose des coordonnées de visiteurs : elle vérifie elle-même le rôle.
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const page = Number(searchParams.page ?? "1") || 1;
  const { messages, totalPages, totalCount } = await getContactMessagesPage(page);

  return (
    <div className="px-4 py-8 sm:px-8 sm:py-10">
      <h1 className="text-2xl font-extrabold text-slate-900">Messages de contact</h1>
      <p className="mt-1 text-sm text-slate-500">
        {totalCount === 0
          ? "Messages envoyés depuis le formulaire /contact."
          : `${totalCount} message${totalCount > 1 ? "s" : ""} reçu${totalCount > 1 ? "s" : ""}, du plus récent au plus ancien.`}
      </p>

      {messages.length === 0 ? (
        <div className="mt-8 flex flex-col items-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <MessageSquare className="h-6 w-6" />
          </span>
          <p className="mt-4 font-semibold text-slate-700">Aucun message pour le moment</p>
          <p className="mt-1 text-sm text-slate-500">Les messages du formulaire de contact apparaîtront ici.</p>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {messages.map((message) => (
            <article key={message.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
              <header className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold uppercase text-blue-600">
                    {message.name.trim().charAt(0) || "?"}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{message.name}</p>
                    <a
                      href={`mailto:${message.email}`}
                      className="flex items-center gap-1.5 truncate text-sm text-slate-500 hover:text-blue-600"
                    >
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      {message.email}
                    </a>
                  </div>
                </div>
                <time dateTime={message.createdAt} className="shrink-0 text-xs text-slate-400">
                  {dateFormatter.format(new Date(message.createdAt))}
                </time>
              </header>

              <p className="mt-4 whitespace-pre-wrap break-words rounded-xl bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-700">
                {message.message}
              </p>

              <div className="mt-4 flex justify-end">
                <a
                  href={`mailto:${message.email}?subject=${encodeURIComponent("Re : votre message à FlashCodeSMS")}`}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-blue-300 hover:text-blue-600"
                >
                  <Reply className="h-3.5 w-3.5" />
                  Répondre
                </a>
              </div>
            </article>
          ))}

          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
            <Pagination basePath="/admin/messages" page={page} totalPages={totalPages} totalCount={totalCount} />
          </div>
        </div>
      )}
    </div>
  );
}
