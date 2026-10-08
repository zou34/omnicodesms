import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { isPriorityCountry, sortCountriesForDisplay, toFrenchCountryName } from "@/lib/countries";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getRechargeAmountById } from "@/lib/packs";
import { prisma } from "@/lib/prisma";

/**
 * Palier choisi sur la page d'accueil avant l'inscription. Il arrive soit en
 * clair (?pack=, inscription par e-mail ou client déjà connecté), soit niché
 * dans le ?callbackUrl= que NextAuth ajoute à pages.newUser après une première
 * connexion Google. Toujours revalidé contre lib/packs.ts.
 */
function resolvePackId(searchParams: { pack?: string; callbackUrl?: string }): string | null {
  let candidate = searchParams.pack;
  if (!candidate && searchParams.callbackUrl) {
    try {
      candidate = new URL(searchParams.callbackUrl, "http://localhost").searchParams.get("pack") ?? undefined;
    } catch {
      // callbackUrl illisible : pas de palier présélectionné.
    }
  }
  return getRechargeAmountById(candidate ?? "")?.id ?? null;
}

const NEW_ACCOUNT_WINDOW_MS = 30 * 60 * 1000;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { pack?: string; callbackUrl?: string; welcome?: string };
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const [user, countries, services, pricing, orders] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true, balance: true, createdAt: true },
    }),
    prisma.country.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.service.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.countryService.findMany({ where: { isActive: true } }),
    prisma.order.findMany({
      where: { userId: session.user.id },
      include: { country: true, service: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  if (!user) {
    redirect("/login");
  }

  return (
    <DashboardShell
      userName={user.name}
      userEmail={user.email}
      initialBalance={user.balance.toString()}
      initialPackId={resolvePackId(searchParams)}
      // ?welcome=1 seul ne prouve rien (lien rouvert, retapé à la main) :
      // la conversion « inscription » envoyée à Meta exige un compte créé à
      // l'instant, pour ne compter que de vraies inscriptions.
      isNewUser={searchParams.welcome === "1" && Date.now() - user.createdAt.getTime() < NEW_ACCOUNT_WINDOW_MS}
      countries={sortCountriesForDisplay(
        countries.map((country) => ({
          id: country.id,
          code: country.code,
          // Nom français dérivé du code ISO : la base stocke des noms anglais,
          // introuvables pour un client francophone (voir lib/countries.ts).
          name: toFrenchCountryName(country.code, country.name),
          isPriority: isPriorityCountry(country.code),
        }))
      )}
      services={services.map((service) => ({
        id: service.id,
        slug: service.slug,
        name: service.name,
      }))}
      pricing={pricing.map((entry) => ({
        countryId: entry.countryId,
        serviceId: entry.serviceId,
        price: entry.price.toString(),
        currency: entry.currency,
      }))}
      initialOrders={orders.map((order) => ({
        id: order.id,
        phoneNumber: order.phoneNumber,
        status: order.status,
        smsCode: order.smsCode,
        fullSms: order.fullSms,
        price: order.price.toString(),
        createdAt: order.createdAt.toISOString(),
        expiresAt: order.expiresAt ? order.expiresAt.toISOString() : null,
        countryName: toFrenchCountryName(order.country.code, order.country.name),
        countryCode: order.country.code,
        serviceName: order.service.name,
      }))}
    />
  );
}
