// Manually credits a user's wallet balance for local testing, e.g.:
//   npm run credit-balance -- you@example.com 15000
import { prisma } from "@/lib/prisma";

const [, , email, amountArg] = process.argv;

if (!email || !amountArg) {
  console.error("Usage: npm run credit-balance -- <email> <amount>");
  process.exit(1);
}

const amount = Number(amountArg);

if (!Number.isFinite(amount) || amount <= 0) {
  console.error("Le montant doit être un nombre positif (ex: 15000).");
  process.exit(1);
}

async function main() {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    console.error(`Aucun utilisateur trouvé avec l'email: ${email}`);
    process.exitCode = 1;
    return;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({
      where: { email },
      data: { balance: { increment: amount } },
    });

    // Logged as a DEPOSIT so the ledger stays consistent — the balance
    // always equals the sum of the user's transactions.
    await tx.transaction.create({
      data: {
        userId: updatedUser.id,
        type: "DEPOSIT",
        status: "SUCCESS",
        provider: "WALLET",
        providerRef: "manual-credit-script",
        amount,
        currency: "FCFA",
      },
    });

    return updatedUser;
  });

  console.log(`Nouveau solde de ${updated.email}: ${updated.balance.toString()} FCFA`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
