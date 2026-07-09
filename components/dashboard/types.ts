import type { OrderStatus } from "@prisma/client";

export interface CountryVM {
  id: string;
  code: string;
  name: string;
}

export interface ServiceVM {
  id: string;
  slug: string;
  name: string;
}

export interface PricingVM {
  countryId: string;
  serviceId: string;
  price: string;
  currency: string;
}

export interface OrderVM {
  id: string;
  phoneNumber: string | null;
  status: OrderStatus;
  smsCode: string | null;
  fullSms: string | null;
  price: string;
  createdAt: string;
  expiresAt: string | null;
  countryName: string;
  countryCode: string;
  serviceName: string;
}
