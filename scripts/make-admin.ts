// Promotes a user to the ADMIN role so they can access /admin, e.g.:
//   npm run make-admin -- you@example.com
import { prisma } from "@/lib/prisma";

const [, , email] = process.argv;

if (!email) {
  console.error("Usage: npm run make-admin -- <email>");
  process.exit(1);
}

async function main() {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    console.error(`Aucun utilisateur trouvé avec l'email: ${email}`);
    process.exitCode = 1;
    return;
  }

  const updated = await prisma.user.update({
    where: { email },
    data: { role: "ADMIN" },
  });

  console.log(`${updated.email} est maintenant ADMIN. Reconnectez-vous pour rafraîchir la session.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
