import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const [user, countries, services, pricing, orders] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true, balance: true },
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
      countries={countries.map((country) => ({
        id: country.id,
        code: country.code,
        name: country.name,
      }))}
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
        countryName: order.country.name,
        countryCode: order.country.code,
        serviceName: order.service.name,
      }))}
    />
  );
}
