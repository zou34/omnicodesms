# Audit complet — OmniCodeSMS

**Date** : 2026-07-15
**Périmètre** : intégralité du dépôt (`app/`, `components/`, `lib/`, `prisma/`, `scripts/`) à l'issue de 17 chantiers de développement.
**Méthode** : reconnaissance en trois axes parallèles (architecture & inventaire, sécurité & logique métier, front-end/UX/SEO/performance) suivie d'une correction immédiate du constat le plus critique.

---

## 1. Résumé exécutif

Le site est fonctionnellement riche et cohérent — authentification, achat de numéros, portefeuille FCFA, passerelle de paiement, panneau admin, landing page complète — construit avec une architecture globalement saine (séparation claire routes/lib/components, validation Zod systématique, résolution des prix toujours côté serveur). Deux lacunes structurelles dominent néanmoins le tableau : **aucun test automatisé** n'existe dans tout le projet, et plusieurs pans du produit sont des **façades non branchées** (panneau admin sur données mockées, formulaire de contact sans backend, provider SMS et passerelle de paiement en mode "squelette" en attendant de vraies clés API).

**Constat le plus grave, corrigé dans le cadre de cet audit** : le webhook de confirmation de paiement (`app/api/webhooks/payment/route.ts`) pouvait créditer un solde **deux fois** si la passerelle livrait le même événement en concurrence (comportement documenté et attendu des passerelles réelles) — la vérification d'idempotence n'était pas atomique, contrairement au flux de débit (achat de numéro) qui utilisait déjà le bon pattern ailleurs dans le même projet. **✅ Corrigé** (voir §3.1).

**Mise à jour — Chantier 18** : les 3 constats "Élevé" les plus urgents pour un lancement public ont été corrigés — pages de résilience App Router (`error.tsx`/`not-found.tsx`/`loading.tsx`), SEO de base (`robots.ts`/`sitemap.ts`/Open Graph), et `metadata` par page sur `/login` et `/register` (voir §4, constats #1-3, et §6). Portée volontairement limitée : la suite de tests automatisés (constat élevé restant, §5) est repoussée à un chantier dédié à la demande explicite du produit.

**Top 5 des points restants à traiter en priorité** (mis à jour) :
1. Absence totale de rate limiting / anti-bruteforce (inscription, connexion, checkout).
2. Aucun test automatisé (unitaire, intégration, e2e) — **chantier séparé prévu**.
3. Panneau admin entièrement sur données mockées — aucun accès réel aux utilisateurs/transactions/commandes.
4. Sidebar admin non responsive (illisible sur mobile).
5. Incohérence de devise (`$` dans la carte de parrainage vs FCFA partout ailleurs) et modale de recharge sans sémantique de dialogue accessible.

**Ce qui est déjà bien fait** (à ne pas casser en corrigeant le reste) : débit de solde atomique et race-safe sur l'achat de numéro, vérification HMAC solide avec comparaison en temps constant sur le webhook, résolution des prix toujours côté serveur (jamais confiance au client), protection IDOR sur `GET /api/orders/[id]`, `.env` correctement ignoré par Git, promotion admin confinée à un script CLI hors-web, nettoyage de cohérence visuelle (indigo→bleu) complet, cohérence linguistique française, animations 100 % CSS respectant `prefers-reduced-motion`.

---

## 2. Architecture & inventaire

### 2.1 Structure du projet

```
app/                    Pages (App Router) + routes API
  about/, contact/, privacy/, terms/, api-docs/   pages statiques/marketing
  login/, register/                                pages d'authentification
  dashboard/                                        tableau de bord utilisateur (protégé)
  admin/                                             panneau admin (protégé, rôle ADMIN)
  api/                                               route handlers (voir 2.2)
components/
  admin/       sidebar, cartes de stats, tableaux (inscriptions/transactions récentes)
  auth/        AuthShell, bouton Google, bouton de déconnexion
  dashboard/   header, shell, panneau d'achat, commandes actives, modale de recharge, bannière de statut paiement
  landing/     hero, showcase téléphone, fonctionnalités, tarifs, moyens de paiement, parrainage, footer
  marketing/   en-tête partagé des pages statiques
  providers/   wrapper SessionProvider NextAuth
  ui/          GlowingButton (effet CTA partagé)
lib/
  admin/mock-data.ts   données mockées du panneau admin (3 TODO explicites de branchement Supabase)
  auth.ts               config NextAuth (Credentials + Google, JWT, rôle propagé en session)
  packs.ts              source unique des packs de recharge FCFA
  prisma.ts             singleton PrismaClient
  providers/            abstraction SmsProvider (base, MockProvider, RealSmsProvider, factory)
prisma/
  schema.prisma          modèle de données complet
  migrations/             5 migrations (init → relation Order/Transaction → devise FCFA → provider MOCK → provider GATEWAY)
  seed.ts                 seed pays/services/tarifs en FCFA
scripts/
  credit-balance.ts, make-admin.ts, test-mock-provider.ts   utilitaires CLI de dev
```

### 2.2 Inventaire des routes

**Pages publiques** : `/` (landing), `/about`, `/contact`, `/privacy`, `/terms`, `/api-docs`
**Authentification** : `/login`, `/register`
**Protégées** : `/dashboard` (session requise), `/admin` + `/admin/{users,numbers,transactions,settings}` (session + rôle ADMIN requis)

**Routes API** :
| Route | Méthode | Rôle |
|---|---|---|
| `/api/auth/[...nextauth]` | GET/POST | Handler NextAuth (Credentials bcrypt + Google OAuth) |
| `/api/register` | POST | Création de compte |
| `/api/orders` | POST | Achat d'un numéro (débit atomique + appel provider) |
| `/api/orders/[id]` | GET | Poll du statut SMS (avec vérification de propriété) |
| `/api/payments/checkout` | POST | Initiation d'une session de paiement (recharge) |
| `/api/webhooks/payment` | POST | Confirmation de paiement signée HMAC |

### 2.3 Modèle de données (`prisma/schema.prisma`)

- **Auth (NextAuth adapter)** : `Account`, `Session`, `VerificationToken`.
- **`User`** : email/mot de passe (optionnel, OAuth), `role` (USER/ADMIN), `balance` (Decimal 10,2).
- **`Country`** / **`Service`** : catalogue pays/services actifs.
- **`CountryService`** : tarif FCFA par paire (pays, service), unique.
- **`Order`** : numéro loué (téléphone, `providerId`, code SMS, statut, expiration).
- **`Transaction`** : grand livre signé (DEPOSIT/PURCHASE/REFUND × PENDING/SUCCESS/FAILED × provider STRIPE/FLUTTERWAVE/WALLET/MOCK/GATEWAY), montant signé, lien optionnel vers `Order`.

### 2.4 Stack technique

Next.js 14.2 (App Router) · React 18 · TypeScript 5 · Prisma 6 / PostgreSQL (Supabase) · NextAuth 4 · Tailwind CSS 3 + `@tailwindcss/typography` · Zod · bcryptjs · lucide-react.

**Dépendances installées mais jamais importées dans le code** : `stripe` (^22.3.0) et `flutterwave-node-v3` (^1.4.1) — présentes dans `package.json`, dans `.env.example`, et représentées dans l'enum `PaymentProvider`, mais **aucune route n'importe l'un ou l'autre SDK**. L'intégration de paiement réelle est un appel `fetch` générique de forme "Moneroo/PayTech", explicitement documenté comme squelette non vérifié. À trancher : soit finaliser le choix de passerelle et retirer le SDK non utilisé, soit réécrire `payments/checkout` pour réellement utiliser l'un des deux SDK installés.

### 2.5 Historique

23 commits sur une branche unique (`master`), un seul auteur, progression chronologique cohérente (rebranding → auth → provider mock → achat → dashboard → landing → admin → FCFA → recharge → passerelle de paiement → provider SMS réel).

---

## 3. Sécurité & logique métier

### 3.1 Correctif appliqué — race condition de double-crédit sur le webhook

**Fichier** : `app/api/webhooks/payment/route.ts`

**Avant** : la confirmation lisait la transaction (`findFirst`), vérifiait `status !== "PENDING"` en dehors de toute transaction Prisma, puis exécutait un `update` inconditionnel. Deux livraisons concurrentes du même webhook (comportement réel et documenté des passerelles de paiement) pouvaient toutes deux passer le contrôle avant que l'une ne commit, et créditer le solde deux fois.

**Après** : la transition PENDING → SUCCESS/FAILED se fait désormais via un `updateMany` avec garde `status: "PENDING"` dans la clause `where`, à l'intérieur d'un `prisma.$transaction` — exactement le pattern déjà utilisé pour le débit du solde dans `app/api/orders/route.ts` (`updateMany` + `gte`). Seule la requête qui obtient `count === 1` est autorisée à créditer le solde ; toute livraison concurrente ou dupliquée obtient `count === 0` et ne fait rien (la route continue de répondre `200` dans tous les cas, pour ne pas déclencher de tempête de retry côté passerelle).

**Statut de vérification** : ✅ **validé en conditions réelles** (base Supabase de nouveau accessible après la pause initiale). Scénario testé sur un compte réel via `/api/payments/checkout` puis deux appels `fetch` envoyés en véritable concurrence (`Promise.all`, sans `await` entre les deux) vers `/api/webhooks/payment` avec la même référence et une signature HMAC valide :

| Scénario | Résultat |
|---|---|
| 2 livraisons concurrentes du même webhook (SUCCESS, 5000 FCFA) | Les deux répondent `200`, mais un seul crédit appliqué — logs serveur : `duplicate delivery ignored for checkout_...` sur la requête perdante |
| Signature invalide | `401`, transaction non touchée |
| Montant falsifié (999999 au lieu de 1000) | `200` (pas de retry déclenché côté passerelle), transaction laissée `PENDING`, aucun crédit |
| Règlement correct de cette même transaction ensuite | Crédit appliqué normalement (1000 FCFA) |
| Rejeu séquentiel du webhook déjà réglé | `200`, aucun second crédit |

Solde final du compte de test : **6000 FCFA**, exactement la somme des deux transactions réglées une seule fois chacune (5000 + 1000) — grand livre et solde parfaitement synchronisés, aucune régression sur les cas déjà couverts avant ce correctif.

### 3.2 Autres constats (non corrigés dans ce chantier)

| # | Constat | Fichier | Sévérité |
|---|---|---|---|
| 1 | Aucun rate limiting / CAPTCHA nulle part (inscription, connexion, checkout) — endpoint d'inscription et provider Credentials sans throttling, exploitable pour du bourrage de comptes ou du bruteforce | `app/api/register/route.ts`, `lib/auth.ts` | **Notable** |
| 2 | `Transaction.providerRef` n'a pas de contrainte d'unicité en base (simple colonne indexée par `userId`/`orderId` seulement) — rien n'empêche au niveau DB deux lignes avec la même référence | `prisma/schema.prisma` | Mineur (contribue au risque déjà corrigé en 3.1) |
| 3 | Panneau admin à 100 % sur données mockées — `/admin` et les 4 sous-pages ne font aucun appel Prisma ; un admin ne peut ni voir ni agir sur de vraies données aujourd'hui | `app/admin/**`, `lib/admin/mock-data.ts` | **Notable** (fonctionnel, pas sécurité) |
| 4 | `request.json()` non protégé par try/catch dans la route d'inscription — un corps JSON malformé plante en 500 au lieu d'un 400 propre (incohérent avec les deux autres routes POST qui gardent cet appel) | `app/api/register/route.ts:14` | Mineur |
| 5 | Le rollback d'annulation côté fournisseur (`provider.cancelOrder(...).catch(() => {})`) avale silencieusement les échecs — pas de retry ni de file de dead-letter si l'annulation échoue elle-même | `app/api/orders/route.ts:162` | Mineur |
| 6 | Une transaction webhook avec montant incohérent reste bloquée `PENDING` indéfiniment, sans job de réconciliation | `app/api/webhooks/payment/route.ts` | Mineur |
| 7 | Le middleware ne couvre que `/dashboard` et `/admin` (pages) ; aucune route sous `/api/**` n'est couverte par un garde-fou middleware — chaque route fait sa propre vérification `getServerSession` (cohérent aujourd'hui, mais fragile si une future route admin oublie ce contrôle) | `middleware.ts` | Informationnel |
| 8 | `RealSmsProvider` est un squelette non vérifié contre une vraie API (5sim/SMS-Activate/DaisySMS cités en exemple seulement) — le flux d'achat de numéro n'est aujourd'hui exercé que via `MockProvider` | `lib/providers/RealSmsProvider.ts` | Informationnel (attendu, documenté comme tel) |
| 9 | `MockProvider` garde son état en mémoire (process-local) — sans risque en dev, mais à ne surtout pas laisser actif par erreur sur un déploiement multi-instance/serverless en production | `lib/providers/MockProvider.ts` | Informationnel |

**Points positifs à conserver** : débit de solde atomique via `updateMany`/`gte` (le pattern de référence, désormais répliqué sur le webhook) ; vérification HMAC avec `timingSafeEqual` et lecture du corps brut avant parsing ; prix toujours résolus côté serveur (`orders`, `payments/checkout`) ; contrôle de propriété (IDOR) sur `GET /api/orders/[id]` ; `.env` ignoré par Git et absent de l'historique ; promotion admin confinée au script CLI `make-admin.ts`, sans surface web d'escalade de privilèges.

---

## 4. Front-end : UX, accessibilité, SEO, performance

| # | Constat | Fichier | Sévérité |
|---|---|---|---|
| 1 | ✅ *Corrigé au Chantier 18* — ~~Aucun `robots.txt`, `sitemap.xml`, ni métadonnées Open Graph/Twitter nulle part~~ ; `app/robots.ts` (exclut `/dashboard`, `/admin`, `/api/`) et `app/sitemap.ts` ajoutés, `metadataBase` + `openGraph` + `twitter` sur `app/layout.tsx` | `app/robots.ts`, `app/sitemap.ts`, `app/layout.tsx` | ~~**Élevé**~~ |
| 2 | ✅ *Corrigé au Chantier 18* — ~~`/login` et `/register` ne peuvent pas exporter `metadata`~~ ; séparés en wrapper serveur (`page.tsx`, exporte `metadata`) + composant client (`login-form.tsx`/`register-form.tsx`, logique inchangée) | `app/login/page.tsx`+`login-form.tsx`, `app/register/page.tsx`+`register-form.tsx` | ~~**Élevé**~~ |
| 3 | ✅ *Corrigé au Chantier 18* — ~~Aucun `loading.tsx`, `error.tsx`, `not-found.tsx`~~ ; `app/error.tsx`, `app/not-found.tsx`, `app/loading.tsx`, `app/admin/loading.tsx` ajoutés (thème dark premium cohérent), vérifiés en conditions réelles (route de test qui lève une erreur, puis supprimée) | `app/error.tsx`, `app/not-found.tsx`, `app/loading.tsx`, `app/admin/loading.tsx` | ~~**Élevé**~~ |
| 4 | Sidebar admin (`w-64` fixe, sans hamburger/collapse) — le panneau admin est essentiellement inutilisable sous ~768px de large | `components/admin/admin-sidebar.tsx`, `app/admin/layout.tsx` | **Élevé** (usage admin) |
| 5 | Polices Geist chargées via `next/font/local` mais jamais appliquées : `globals.css` force `font-family: Arial, Helvetica, sans-serif` sur `body`, et aucune config Tailwind ne référence les variables `--font-geist-*` — poids mort téléchargé à chaque page sans effet visuel | `app/layout.tsx`, `app/globals.css`, `tailwind.config.ts` | Moyen |
| 6 | Boutons icône-seule sans `aria-label` en dessous du breakpoint `sm` (le texte est caché, l'icône reste seule, sans nom accessible) | `components/dashboard/dashboard-header.tsx` (bouton Recharger), `components/auth/sign-out-button.tsx` | Moyen |
| 7 | Modale de recharge sans sémantique de dialogue (`role="dialog"`/`aria-modal`), sans piège de focus, sans restauration du focus au déclencheur à la fermeture | `components/dashboard/recharge-modal.tsx` | Moyen |
| 8 | Incohérence de devise : la carte de parrainage affiche des montants en `$` alors que tout le reste du site (tarifs, solde, admin) est en FCFA | `components/landing/referral-code-card.tsx` | Moyen |
| 9 | Le formulaire de contact ne persiste nulle part et n'envoie aucun email — le message de succès affiché est purement local/simulé | `app/contact/contact-form.tsx` | Moyen |
| 10 | Aucune page (`about`, `terms`, `privacy`, `api-docs`) ne définit de `description` propre, seulement un `title` — pas de doublon problématique mais un manque à gagner SEO facile | pages statiques | Faible |
| 11 | Trois thèmes visuels distincts cohabitent (pages légales claires / app + auth sombres / landing dégradé bleu) — vraisemblablement voulu (marketing vs. produit) mais à confirmer | ensemble du site | Informationnel |

**Points positifs à conserver** : nettoyage indigo→bleu totalement terminé (zéro résidu) ; landing page et header du dashboard réellement bien testés en responsive (breakpoints `sm/md/lg` cohérents, nav mobile dédiée) ; tous les champs de formulaire échantillonnés ont un `label`/`id` correctement associés ; toutes les animations sont 100 % CSS (aucune boucle JS), avec `motion-reduce:animate-none` respecté sur l'effet de lueur principal ; aucune image raster non optimisée (le site n'utilise que des icônes SVG/emoji, donc pas de dette `next/image` actuelle).

---

## 5. Absence de tests

Aucun fichier de test (`*.test.ts(x)`, `*.spec.ts(x)`, dossier `__tests__`) ni configuration (`jest`, `vitest`, `playwright`, `cypress`) n'existe dans le projet — confirmé par `package.json` (aucun test runner en dépendance, aucun script `test`). **Sévérité : élevée** pour un projet de cette taille : c'est le principal facteur de risque pour tout refactor futur, puisque rien ne garantit qu'un changement ne casse pas silencieusement un flux déjà validé (achat, paiement, auth).

À ce stade, la seule "couverture" existante est la vérification manuelle systématique effectuée à chaque chantier (scripts CLI ad hoc + tests Playwright ponctuels non conservés). Une suite minimale (Vitest pour la logique métier pure comme `lib/packs.ts`/`lib/providers/*`, Playwright pour 2-3 parcours critiques : inscription→achat, recharge→webhook) apporterait le plus de valeur immédiate.

---

## 6. Recommandations priorisées

**Quick wins (peu d'effort, fort impact)** :
1. ~~Ajouter `robots.txt` + `sitemap.ts` + métadonnées Open Graph de base.~~ ✅ Fait au Chantier 18.
2. Corriger l'incohérence `$` → FCFA dans `referral-code-card.tsx`.
3. Ajouter `aria-label` aux boutons icône-seule (`dashboard-header.tsx`, `sign-out-button.tsx`).
4. Protéger `request.json()` par try/catch dans `app/api/register/route.ts`.
5. Wire les polices Geist dans `tailwind.config.ts` (ou les retirer si le design final ne les utilise pas).

**Chantiers dédiés à planifier** :
1. **Rate limiting** sur `/api/register`, `/api/auth/*` (Credentials), `/api/payments/checkout` — probablement via un middleware Edge (Upstash Ratelimit ou équivalent).
2. **Brancher le panneau admin sur les vraies données** (remplacer `lib/admin/mock-data.ts` par de vraies requêtes Prisma — les 3 TODO du fichier documentent déjà précisément quoi faire).
3. **Rendre la sidebar admin responsive** (drawer/hamburger sous `md`).
4. ~~Mettre en place `loading.tsx`/`error.tsx`/`not-found.tsx` sur les segments clés.~~ ✅ Fait au Chantier 18 (`app/error.tsx`, `app/not-found.tsx`, `app/loading.tsx`, `app/admin/loading.tsx`).
5. **Démarrer une suite de tests minimale** (Vitest sur `lib/`, Playwright sur les parcours critiques) — **chantier séparé prévu, portée volontairement exclue du Chantier 18**.
6. **Trancher la passerelle de paiement définitive** (Stripe vs. Flutterwave vs. Moneroo/PayTech) et retirer le SDK installé mais inutilisé ; finaliser `RealSmsProvider` contre un vrai fournisseur.
7. **Ajouter la contrainte d'unicité** sur `(provider, providerRef)` dans `Transaction` pour renforcer au niveau base ce que le correctif applicatif de ce chantier garantit déjà au niveau logique.
8. **Brancher le formulaire de contact** à un vrai envoi (email transactionnel ou table `ContactMessage`).
9. **Ajouter une modale accessible** (`role="dialog"`, piège de focus) — envisager d'extraire un composant `Modal` réutilisable si d'autres modales sont ajoutées.

---

*Ce rapport documente l'état du site au HEAD du commit `74b94ec` + le correctif webhook (§3.1), désormais validé de bout en bout en conditions réelles. Aucune autre correction de code n'a été appliquée — tous les autres constats listés ci-dessus sont volontairement laissés en l'état, en attente d'un chantier dédié.*
