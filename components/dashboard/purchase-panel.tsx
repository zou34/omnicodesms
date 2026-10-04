"use client";

import { Loader2, PlusCircle, ShoppingCart } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { CountryVM, OrderVM, PricingVM, ServiceVM } from "@/components/dashboard/types";

// Dernier choix pays/service du client. La recharge passe par une redirection
// pleine page vers SasPay : sans cette sauvegarde, le client qui rechargeait
// pour acheter « WhatsApp France » revenait sur les valeurs par défaut.
const SELECTION_KEY = "flashcodesms:last-selection";

interface SavedSelection {
  countryCode?: string;
  serviceSlug?: string;
}

function readSelection(): SavedSelection {
  try {
    return JSON.parse(localStorage.getItem(SELECTION_KEY) ?? "{}") as SavedSelection;
  } catch {
    // Stockage indisponible (navigation privée stricte) ou valeur corrompue.
    return {};
  }
}

function saveSelection(update: SavedSelection) {
  try {
    localStorage.setItem(SELECTION_KEY, JSON.stringify({ ...readSelection(), ...update }));
  } catch {
    // Pas de sauvegarde : le sélecteur fonctionne quand même.
  }
}

interface PurchasePanelProps {
  /** Solde affiché, pour proposer la recharge avant l'achat plutôt qu'après un refus. */
  balance: number;
  countries: CountryVM[];
  services: ServiceVM[];
  pricing: PricingVM[];
  onOrderCreated: (order: OrderVM) => void;
  onInsufficientBalance: () => void;
}

export function PurchasePanel({
  balance,
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

  // Restauré après l'hydratation (pas dans l'initialiseur de useState) : le
  // rendu serveur ne connaît pas le localStorage, un écart casserait
  // l'hydratation des <select>.
  useEffect(() => {
    const saved = readSelection();
    const country = countries.find((c) => c.code === saved.countryCode);
    const service = services.find((s) => s.slug === saved.serviceSlug);
    if (country) setCountryId(country.id);
    if (service) setServiceId(service.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const priorityCountries = useMemo(() => countries.filter((c) => c.isPriority), [countries]);
  const otherCountries = useMemo(() => countries.filter((c) => !c.isPriority), [countries]);

  // Only services actually sellable in the selected country are offered: the
  // catalog sync (scripts/sync-catalog.ts) deactivates pairs the provider
  // doesn't stock (e.g. WhatsApp/Telegram in Venezuela), which used to show up
  // here as a dead "Indisponible" choice.
  const availableServices = useMemo(() => {
    const available = new Set(
      pricing.filter((p) => p.countryId === countryId).map((p) => p.serviceId)
    );
    return services.filter((s) => available.has(s.id));
  }, [pricing, services, countryId]);

  // Keeps the user's choice while it stays available in the new country;
  // otherwise falls back to the first service sold there.
  const effectiveServiceId = availableServices.some((s) => s.id === serviceId)
    ? serviceId
    : (availableServices[0]?.id ?? "");

  const selectedCountry = countries.find((c) => c.id === countryId);
  const selectedService = availableServices.find((s) => s.id === effectiveServiceId);

  const selectedPricing = useMemo(
    () =>
      pricing.find((p) => p.countryId === countryId && p.serviceId === effectiveServiceId) ?? null,
    [pricing, countryId, effectiveServiceId]
  );

  const needsRecharge = selectedPricing !== null && balance < Number(selectedPricing.price);

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

      // Réponse non JSON = requête coupée par l'hébergeur (délai dépassé).
      // L'achat a pu aboutir côté serveur avant la coupure : inviter à
      // vérifier plutôt qu'à racheter, sous peine de payer deux fois.
      const data = await response.json().catch(() => null);
      if (!data) {
        setError(
          "La réponse du serveur n'a pas pu être lue. Rechargez la page et vérifiez « Mes numéros actifs » avant de réessayer."
        );
        return;
      }

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
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-6">
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
            onChange={(e) => {
              setCountryId(e.target.value);
              saveSelection({ countryCode: countries.find((c) => c.id === e.target.value)?.code });
            }}
            className="field-glow w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2.5 text-base text-white outline-none sm:text-sm"
          >
            {/* Les destinations à fort volume sont regroupées en tête : la
                liste complète compte près de 90 pays, et un client qui doit la
                parcourir pour trouver les États-Unis ou la France conclut
                qu'ils ne sont pas proposés. */}
            {priorityCountries.length > 0 && (
              <optgroup label="Les plus demandés">
                {priorityCountries.map((country) => (
                  <option key={country.id} value={country.id}>
                    {country.name} ({country.code})
                  </option>
                ))}
              </optgroup>
            )}
            <optgroup label="Tous les pays">
              {otherCountries.map((country) => (
                <option key={country.id} value={country.id}>
                  {country.name} ({country.code})
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        <div>
          <label htmlFor="service" className="mb-1.5 block text-sm text-slate-300">
            Service
          </label>
          <select
            id="service"
            value={effectiveServiceId}
            onChange={(e) => {
              setServiceId(e.target.value);
              saveSelection({ serviceSlug: services.find((s) => s.id === e.target.value)?.slug });
            }}
            className="field-glow w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2.5 text-base text-white outline-none sm:text-sm"
          >
            {availableServices.map((service) => (
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
              className="btn-glow btn-glow-rose shrink-0 rounded-full bg-rose-500 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-400"
            >
              Recharger
            </button>
          )}
        </div>
      )}

      {needsRecharge ? (
        // Solde trop bas, connu d'avance : on propose la recharge tout de suite
        // plutôt que de laisser le client essuyer un refus « Solde insuffisant ».
        // Le serveur revérifie de toute façon le solde à l'achat.
        <>
          <p className="mt-4 text-center text-sm text-slate-400">
            Votre solde ({balance.toLocaleString("fr-FR")} FCFA) ne suffit pas pour ce numéro.
          </p>
          <button
            type="button"
            onClick={onInsufficientBalance}
            className="btn-glow mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500"
          >
            <PlusCircle className="h-5 w-5" />
            Recharger pour acheter ce numéro
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={handleBuy}
          disabled={isBuying || !selectedPricing}
          className="btn-glow mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isBuying ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShoppingCart className="h-5 w-5" />}
          Acheter ce numéro
        </button>
      )}
    </section>
  );
}
