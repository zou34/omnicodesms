import { ChevronDown } from "lucide-react";

/**
 * Chaque réponse décrit le comportement réel de la plateforme — remboursement
 * automatique, durée de validité, moyens de paiement. Si l'une de ces règles
 * change dans le code, cette liste doit changer avec elle : une FAQ qui promet
 * autre chose que ce que fait le produit est pire que pas de FAQ du tout.
 */
const QUESTIONS = [
  {
    question: "Que se passe-t-il si je ne reçois pas le SMS ?",
    answer:
      "Vous êtes remboursé automatiquement, sans avoir à le demander. Si aucun code n'arrive avant l'expiration du numéro, la commande passe en « expirée » et le montant est recrédité intégralement sur votre solde. Le remboursement est déclenché dès que vous consultez votre tableau de bord, et une tâche automatique s'en charge même si vous avez fermé l'onglet.",
  },
  {
    question: "Combien de temps le numéro reste-t-il valide ?",
    answer:
      "Entre 10 et 20 minutes selon le fournisseur, ce qui est largement suffisant : un code de vérification arrive en général en quelques secondes. Le compte à rebours démarre à l'achat, et le statut de la commande est visible en temps réel sur votre tableau de bord.",
  },
  {
    question: "Les numéros sont-ils réutilisables ?",
    answer:
      "Non, et c'est volontaire. Chaque numéro est à usage unique : il vous est attribué le temps de recevoir un seul code, puis il est libéré. C'est ce qui garantit qu'un numéro que vous utilisez n'a pas déjà servi à quelqu'un d'autre pour le même service, ce qui provoquerait un refus à l'inscription.",
  },
  {
    question: "Quels moyens de paiement acceptez-vous ?",
    answer:
      "Les recharges passent par SasPay, qui accepte le Mobile Money (Orange Money, MTN MoMo, Moov Money, Wave, Djamo), la carte bancaire et les stablecoins. Le Mobile Money reste le moyen le moins coûteux en frais. La carte et la crypto exigent un montant minimum d'environ 1 USD, elles ne sont donc pas proposées sur la plus petite recharge.",
  },
  {
    question: "Pourquoi certains services refusent-ils les numéros virtuels ?",
    answer:
      "Des plateformes comme WhatsApp ou Google détectent parfois les plages de numéros connues pour être utilisées en vérification et les bloquent. C'est indépendant de notre volonté. Si le code n'arrive pas, vous êtes remboursé : essayez alors un autre pays, où la plage de numéros est souvent acceptée sans difficulté.",
  },
  {
    question: "Dois-je fournir des documents ou une pièce d'identité ?",
    answer:
      "Non. Une adresse e-mail suffit pour créer un compte. Nous ne demandons ni pièce d'identité, ni justificatif, ni numéro personnel : c'est précisément ce que le service vous évite de communiquer.",
  },
  {
    question: "Mon solde expire-t-il ?",
    answer:
      "Jamais. Le crédit rechargé reste acquis sans limite de durée et sans frais de tenue de compte. Vous pouvez recharger 1 000 FCFA aujourd'hui et les utiliser dans six mois.",
  },
  {
    question: "Puis-je choisir le pays du numéro ?",
    answer:
      "Oui, parmi près de 90 pays réellement disponibles. Seules les combinaisons pays/service effectivement en stock chez nos fournisseurs vous sont proposées : si une option apparaît dans la liste, c'est qu'elle est achetable à cet instant.",
  },
  {
    question: "Le prix affiché est-il le prix final ?",
    answer:
      "Oui. Le montant indiqué avant l'achat est exactement celui débité de votre solde, en FCFA, sans frais caché ni conversion de dernière minute. Seule la recharge elle-même peut comporter des frais, appliqués par votre moyen de paiement et affichés avant validation.",
  },
  {
    question: "Que faire si le code arrive après l'expiration ?",
    answer:
      "Le code reste visible dans l'historique de votre commande s'il a été reçu avant la fermeture du numéro. Si la commande a déjà été remboursée, le montant vous a été rendu : relancez simplement un achat pour obtenir un numéro actif.",
  },
] as const;

export function Faq() {
  return (
    <section className="bg-slate-50 px-6 py-24 sm:px-10">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-col items-center text-center">
          <span aria-hidden className="mb-5 h-2.5 w-2.5 rounded-sm bg-blue-500" />

          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Questions fréquentes
          </h2>

          <p className="mt-5 max-w-2xl text-base text-slate-600 sm:text-lg">
            Tout ce qu&apos;il faut savoir avant votre première vérification.
          </p>
        </div>

        <div className="mt-14 space-y-3">
          {QUESTIONS.map((item) => (
            /* <details> natif : l'accordéon fonctionne sans JavaScript, reste
               accessible au clavier et aux lecteurs d'écran, et la page peut
               rester un composant serveur. */
            <details
              key={item.question}
              className="group rounded-2xl border border-slate-200 bg-white px-6 shadow-sm transition-colors open:border-blue-200 open:shadow-md hover:border-slate-300"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left text-base font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
                {item.question}
                <ChevronDown
                  aria-hidden
                  className="h-5 w-5 shrink-0 text-slate-400 transition-transform duration-300 group-open:rotate-180 group-open:text-blue-600 motion-reduce:transition-none"
                />
              </summary>

              {/* L'astuce grid-rows 0fr -> 1fr permet d'animer l'ouverture sans
                  connaître la hauteur du texte à l'avance, ce qu'une simple
                  transition sur `height` ne permet pas. */}
              <div className="grid grid-rows-[0fr] transition-all duration-300 ease-out group-open:grid-rows-[1fr] motion-reduce:transition-none">
                <div className="overflow-hidden">
                  <p className="pb-5 pr-9 text-sm leading-relaxed text-slate-600">{item.answer}</p>
                </div>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
