import type { OrderStatus, PaymentProvider, TransactionStatus, TransactionType, UserRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 20;

function startOfMonth(monthsAgo: number) {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
}

// (current - previous) / previous, as a rounded percent. `undefined` when
// there's no prior-month baseline to compare against — the UI omits the
// growth badge entirely rather than showing a misleading 0%/100%.
function growthPercent(current: number, previous: number): number | undefined {
  if (previous === 0) return undefined;
  return Math.round(((current - previous) / previous) * 100);
}

export interface AdminStats {
  totalRevenue: { amountFcfa: number; growthPercent?: number };
  registeredUsers: { count: number; growthPercent?: number };
  numbersGenerated: { count: number; growthPercent?: number };
}

export async function getStats(): Promise<AdminStats> {
  const thisMonth = startOfMonth(0);
  const lastMonth = startOfMonth(1);

  const [
    revenueThisMonth,
    revenueLastMonth,
    usersTotal,
    usersThisMonth,
    usersLastMonth,
    ordersTotal,
    ordersThisMonth,
    ordersLastMonth,
  ] = await Promise.all([
    prisma.transaction.aggregate({
      where: { type: "DEPOSIT", status: "SUCCESS", createdAt: { gte: thisMonth } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { type: "DEPOSIT", status: "SUCCESS", createdAt: { gte: lastMonth, lt: thisMonth } },
      _sum: { amount: true },
    }),
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: thisMonth } } }),
    prisma.user.count({ where: { createdAt: { gte: lastMonth, lt: thisMonth } } }),
    prisma.order.count(),
    prisma.order.count({ where: { createdAt: { gte: thisMonth } } }),
    prisma.order.count({ where: { createdAt: { gte: lastMonth, lt: thisMonth } } }),
  ]);

  return {
    totalRevenue: {
      amountFcfa: Number(revenueThisMonth._sum.amount ?? 0),
      growthPercent: growthPercent(Number(revenueThisMonth._sum.amount ?? 0), Number(revenueLastMonth._sum.amount ?? 0)),
    },
    registeredUsers: {
      count: usersTotal,
      growthPercent: growthPercent(usersThisMonth, usersLastMonth),
    },
    numbersGenerated: {
      count: ordersTotal,
      growthPercent: growthPercent(ordersThisMonth, ordersLastMonth),
    },
  };
}

export interface RecentUser {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
  balanceFcfa: number;
  registeredAt: string; // ISO date
}

export async function getRecentUsers(limit = 5): Promise<RecentUser[]> {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, name: true, email: true, role: true, balance: true, createdAt: true },
  });

  return users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    balanceFcfa: Number(user.balance),
    registeredAt: user.createdAt.toISOString(),
  }));
}

export interface PaginatedUsers {
  users: RecentUser[];
  page: number;
  totalPages: number;
  totalCount: number;
}

export async function getUsersPage(page: number): Promise<PaginatedUsers> {
  const safePage = Math.max(1, page);
  const [users, totalCount] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      skip: (safePage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, name: true, email: true, role: true, balance: true, createdAt: true },
    }),
    prisma.user.count(),
  ]);

  return {
    users: users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      balanceFcfa: Number(user.balance),
      registeredAt: user.createdAt.toISOString(),
    })),
    page: safePage,
    totalPages: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)),
    totalCount,
  };
}

export interface RecentTransaction {
  id: string;
  userEmail: string;
  amountFcfa: number;
  type: TransactionType;
  provider: PaymentProvider;
  status: TransactionStatus;
  date: string; // ISO date
}

export async function getRecentTransactions(limit = 5): Promise<RecentTransaction[]> {
  const transactions = await prisma.transaction.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { user: { select: { email: true } } },
  });

  return transactions.map((txn) => ({
    id: txn.id,
    userEmail: txn.user.email,
    amountFcfa: Number(txn.amount),
    type: txn.type,
    provider: txn.provider,
    status: txn.status,
    date: txn.createdAt.toISOString(),
  }));
}

export interface PaginatedTransactions {
  transactions: RecentTransaction[];
  page: number;
  totalPages: number;
  totalCount: number;
}

export async function getTransactionsPage(page: number): Promise<PaginatedTransactions> {
  const safePage = Math.max(1, page);
  const [transactions, totalCount] = await Promise.all([
    prisma.transaction.findMany({
      orderBy: { createdAt: "desc" },
      skip: (safePage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { user: { select: { email: true } } },
    }),
    prisma.transaction.count(),
  ]);

  return {
    transactions: transactions.map((txn) => ({
      id: txn.id,
      userEmail: txn.user.email,
      amountFcfa: Number(txn.amount),
      type: txn.type,
      provider: txn.provider,
      status: txn.status,
      date: txn.createdAt.toISOString(),
    })),
    page: safePage,
    totalPages: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)),
    totalCount,
  };
}

export interface RecentOrder {
  id: string;
  userEmail: string;
  countryName: string;
  serviceName: string;
  phoneNumber: string | null;
  status: OrderStatus;
  priceFcfa: number;
  createdAt: string; // ISO date
}

export interface PaginatedOrders {
  orders: RecentOrder[];
  page: number;
  totalPages: number;
  totalCount: number;
}

export async function getOrdersPage(page: number): Promise<PaginatedOrders> {
  const safePage = Math.max(1, page);
  const [orders, totalCount] = await Promise.all([
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      skip: (safePage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        user: { select: { email: true } },
        country: { select: { name: true } },
        service: { select: { name: true } },
      },
    }),
    prisma.order.count(),
  ]);

  return {
    orders: orders.map((order) => ({
      id: order.id,
      userEmail: order.user.email,
      countryName: order.country.name,
      serviceName: order.service.name,
      phoneNumber: order.phoneNumber,
      status: order.status,
      priceFcfa: Number(order.price),
      createdAt: order.createdAt.toISOString(),
    })),
    page: safePage,
    totalPages: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)),
    totalCount,
  };
}
