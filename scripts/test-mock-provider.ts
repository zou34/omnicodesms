// Quick manual smoke test for the MockProvider, run with:
//   npm run provider:test
import { getSmsProvider } from "@/lib/providers";

function log(label: string, data: unknown) {
  console.log(`\n${label}`);
  console.log(JSON.stringify(data, null, 2));
}

async function main() {
  const provider = getSmsProvider();
  console.log(`Provider actif: "${provider.name}"`);

  const balance = await provider.getBalance();
  log("getBalance()", balance);

  const price = await provider.getPrices("US", "whatsapp");
  log('getPrices("US", "whatsapp")', price);

  const rental = await provider.rentNumber("US", "whatsapp");
  log('rentNumber("US", "whatsapp")', rental);

  console.log("\nEn attente du SMS (polling toutes les 1.5s)...");
  let sms = await provider.getSms(rental.providerOrderId);
  while (sms.status === "PENDING") {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    sms = await provider.getSms(rental.providerOrderId);
    process.stdout.write(".");
  }
  log("\ngetSms() — résultat final", sms);

  // Demonstrate cancellation on a second, freshly rented number.
  const secondRental = await provider.rentNumber("FR", "telegram");
  log('rentNumber("FR", "telegram") — pour test d\'annulation', secondRental);

  const cancelResult = await provider.cancelOrder(secondRental.providerOrderId);
  log("cancelOrder()", cancelResult);
}

main()
  .then(() => {
    console.log("\nTerminé.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Erreur:", error);
    process.exit(1);
  });
