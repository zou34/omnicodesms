-- Verrouille l'accès direct à la base par l'API REST de Supabase.
--
-- Supabase expose publiquement https://<projet>.supabase.co/rest/v1 et accorde
-- par défaut tous les droits aux rôles "anon" et "authenticated" sur les tables
-- du schéma public. Nos tables étant créées par Prisma, elles héritaient de ces
-- droits, sans aucune politique RLS : la clé "anon" — qui est publique par
-- conception — suffisait alors à lire tous les comptes et à réécrire n'importe
-- quel solde.
--
-- L'application n'utilise jamais ces rôles : elle se connecte via Prisma avec
-- le rôle "postgres" (rolbypassrls = true). Ce verrouillage est donc sans effet
-- sur son fonctionnement.

-- 1. Retirer tous les droits existants aux rôles publics.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;
REVOKE USAGE ON SCHEMA public FROM anon, authenticated;

-- 2. Empêcher les futures tables (prochaines migrations Prisma) de réhériter
--    de ces droits.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;

-- 3. Défense en profondeur : RLS activé sans aucune politique = tout est refusé
--    à quiconque ne contourne pas RLS, même si des droits étaient réaccordés
--    par erreur depuis le tableau de bord Supabase.
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VerificationToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Transaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Country" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Service" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CountryService" ENABLE ROW LEVEL SECURITY;
