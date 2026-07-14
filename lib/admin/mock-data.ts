// Mock data layer for the admin dashboard.
//
// Every getter is `async` and returns a plain typed shape, even though the
// data is hardcoded today — that's deliberate. When this gets wired to
// Supabase/Prisma, each function's *body* changes (e.g. `getStats` becomes
// a few `prisma.transaction.aggregate(...)` / `prisma.user.count(...)`
// calls) but the call sites in `app/admin/**` stay exactly the same.

export interface AdminStats {
  totalRevenue: { amountFcfa: number; growthPercent: number };
  registeredUsers: { count: number; growthPercent: number };
  numbersGenerated: { count: number; growthPercent: number };
}

export type UserStatus = "Actif" | "En attente" | "Suspendu";

export interface RecentUser {
  id: string;
  email: string;
  registeredAt: string; // ISO date
  status: UserStatus;
}

export type PaymentMethod = "Wave" | "Orange Money" | "MTN MoMo" | "Carte";
export type TransactionStatus = "Payé" | "Échoué";

export interface RecentTransaction {
  id: string;
  userEmail: string;
  amountFcfa: number;
  paymentMethod: PaymentMethod;
  date: string; // ISO date
  status: TransactionStatus;
}

// TODO(supabase): replace with real aggregates once the admin dashboard is
// wired to production data, e.g.:
//   const revenue = await prisma.transaction.aggregate({
//     where: { type: "PURCHASE", status: "SUCCESS" },
//     _sum: { amount: true },
//   });
export async function getStats(): Promise<AdminStats> {
  return {
    totalRevenue: { amountFcfa: 145_000, growthPercent: 12 },
    registeredUsers: { count: 1248, growthPercent: 8 },
    numbersGenerated: { count: 8430, growthPercent: 21 },
  };
}

// TODO(supabase): replace with `prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 5 })`
export async function getRecentUsers(): Promise<RecentUser[]> {
  return [
    { id: "usr_1", email: "amina.diallo@example.com", registeredAt: "2026-01-12", status: "Actif" },
    { id: "usr_2", email: "kouassi.n@example.com", registeredAt: "2026-01-11", status: "Actif" },
    { id: "usr_3", email: "fatou.sow@example.com", registeredAt: "2026-01-11", status: "En attente" },
    { id: "usr_4", email: "ibrahima.k@example.com", registeredAt: "2026-01-10", status: "Actif" },
    { id: "usr_5", email: "chidinma.o@example.com", registeredAt: "2026-01-09", status: "Suspendu" },
  ];
}

// TODO(supabase): replace with `prisma.transaction.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { user: true } })`
export async function getRecentTransactions(): Promise<RecentTransaction[]> {
  return [
    {
      id: "txn_1",
      userEmail: "amina.diallo@example.com",
      amountFcfa: 3000,
      paymentMethod: "Wave",
      date: "2026-01-12",
      status: "Payé",
    },
    {
      id: "txn_2",
      userEmail: "kouassi.n@example.com",
      amountFcfa: 15000,
      paymentMethod: "Orange Money",
      date: "2026-01-11",
      status: "Payé",
    },
    {
      id: "txn_3",
      userEmail: "fatou.sow@example.com",
      amountFcfa: 1000,
      paymentMethod: "Carte",
      date: "2026-01-11",
      status: "Échoué",
    },
    {
      id: "txn_4",
      userEmail: "ibrahima.k@example.com",
      amountFcfa: 5000,
      paymentMethod: "MTN MoMo",
      date: "2026-01-10",
      status: "Payé",
    },
    {
      id: "txn_5",
      userEmail: "chidinma.o@example.com",
      amountFcfa: 3000,
      paymentMethod: "Wave",
      date: "2026-01-09",
      status: "Payé",
    },
  ];
}
