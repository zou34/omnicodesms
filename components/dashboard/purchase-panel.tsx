"use client";

import { Loader2, ShoppingCart } from "lucide-react";
import { useMemo, useState } from "react";

import type { CountryVM, OrderVM, PricingVM, ServiceVM } from "@/components/dashboard/types";

interface PurchasePanelProps {
  countries: CountryVM[];
  services: ServiceVM[];
  pricing: PricingVM[];
  onOrderCreated: (order: OrderVM) => void;
  onInsufficientBalance: () => void;
}

export function PurchasePanel({
  countries,
  services,
  pricing,
  onOrderCreated,
  onInsufficientBalance,
}: PurchasePanelProps) {
  const [countryId, setCountryId] = useState(countries[0]?.id ?? "");
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [isBuying, setIsBuying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Only true for a 402 with code INSUFFICIENT_BALANCE — the user's own
  // wallet, checked before any provider call. A 502 with the same code
  // means our own provider account is short, which recharging the user's
  // wallet does nothing to fix, so that case keeps the plain error banner.
  const [isOwnBalanceLow, setIsOwnBalanceLow] = useState(false);

  const selectedCountry = countries.find((c) => c.id === countryId);
  const selectedService = services.find((s) => s.id === serviceId);

  const selectedPricing = useMemo(
    () => pricing.find((p) => p.countryId === countryId && p.serviceId === serviceId) ?? null,
    [pricing, countryId, serviceId]
  );

  async function handleBuy() {
    if (!selectedCountry || !selectedService || !selectedPricing) return;

    setIsBuying(true);
    setError(null);
    setIsOwnBalanceLow(false);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country: selectedCountry.code, service: selectedService.slug }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Impossible de créer la commande.");
        setIsOwnBalanceLow(response.status === 402 && data.code === "INSUFFICIENT_BALANCE");
        return;
      }

      onOrderCreated({
        id: data.id,
        phoneNumber: data.phoneNumber,
        status: data.status,
        smsCode: data.smsCode,
        fullSms: data.fullSms,
        price: data.price,
        createdAt: data.createdAt,
        expiresAt: data.expiresAt,
        countryName: selectedCountry.name,
        countryCode: selectedCountry.code,
        serviceName: selectedService.name,
      });
    } catch {
      setError("Une erreur réseau est survenue.");
    } finally {
      setIsBuying(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      <h2 className="text-lg font-semibold text-white">Louer un numéro</h2>
      <p className="mt-1 text-sm text-slate-400">
        Choisissez un pays et un service pour recevoir un code par SMS.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="country" className="mb-1.5 block text-sm text-slate-300">
            Pays
          </label>
          <select
            id="country"
            value={countryId}
            onChange={(e) => setCountryId(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
          >
            {countries.map((country) => (
              <option key={country.id} value={country.id}>
                {country.name} ({country.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="service" className="mb-1.5 block text-sm text-slate-300">
            Service
          </label>
          <select
            id="service"
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
          >
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/50 px-4 py-3">
        <span className="text-sm text-slate-400">Prix</span>
        <span className="text-lg font-semibold text-white">
          {selectedPricing
            ? `${Number(selectedPricing.price).toLocaleString("fr-FR")} ${selectedPricing.currency}`
            : "Indisponible"}
        </span>
      </div>

      {error && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
          <span>{error}</span>
          {isOwnBalanceLow && (
            <button
              type="button"
              onClick={onInsufficientBalance}
              className="shrink-0 rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-300 transition hover:bg-red-500/30"
            >
              Recharger
            </button>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={handleBuy}
        disabled={isBuying || !selectedPricing}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isBuying ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShoppingCart className="h-5 w-5" />}
        Acheter ce numéro
      </button>
    </section>
  );
}
