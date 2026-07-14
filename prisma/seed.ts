import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const countries = [
  { name: "United States", code: "US", dialCode: "+1" },
  { name: "United Kingdom", code: "GB", dialCode: "+44" },
  { name: "France", code: "FR", dialCode: "+33" },
  { name: "Germany", code: "DE", dialCode: "+49" },
  { name: "Nigeria", code: "NG", dialCode: "+234" },
  { name: "Côte d'Ivoire", code: "CI", dialCode: "+225" },
  { name: "Indonesia", code: "ID", dialCode: "+62" },
  { name: "Brazil", code: "BR", dialCode: "+55" },
];

const services = [
  { name: "WhatsApp", slug: "whatsapp" },
  { name: "Telegram", slug: "telegram" },
  { name: "Google", slug: "google" },
  { name: "Facebook", slug: "facebook" },
  { name: "Instagram", slug: "instagram" },
  { name: "Twitter / X", slug: "twitter" },
  { name: "Discord", slug: "discord" },
  { name: "TikTok", slug: "tiktok" },
];

// Base price (FCFA) per service; countries apply a small multiplier so
// pricing looks realistic across the grid without being random. Roughly
// matches the per-activation range shown on the public pricing page
// (~86-100 FCFA).
const basePriceByService: Record<string, number> = {
  whatsapp: 100,
  telegram: 60,
  google: 90,
  facebook: 85,
  instagram: 85,
  twitter: 75,
  discord: 55,
  tiktok: 85,
};

const priceMultiplierByCountry: Record<string, number> = {
  US: 1.4,
  GB: 1.3,
  FR: 1.25,
  DE: 1.25,
  NG: 0.8,
  CI: 0.85,
  ID: 0.9,
  BR: 1.0,
};

async function main() {
  console.log("Seeding countries...");
  const createdCountries = await Promise.all(
    countries.map((country) =>
      prisma.country.upsert({
        where: { code: country.code },
        update: country,
        create: country,
      })
    )
  );

  console.log("Seeding services...");
  const createdServices = await Promise.all(
    services.map((service) =>
      prisma.service.upsert({
        where: { slug: service.slug },
        update: service,
        create: service,
      })
    )
  );

  console.log("Seeding country/service pricing...");
  for (const country of createdCountries) {
    for (const service of createdServices) {
      const basePrice = basePriceByService[service.slug] ?? 75;
      const multiplier = priceMultiplierByCountry[country.code] ?? 1;
      const price = Math.round(basePrice * multiplier);

      await prisma.countryService.upsert({
        where: {
          countryId_serviceId: {
            countryId: country.id,
            serviceId: service.id,
          },
        },
        update: { price, currency: "FCFA" },
        create: {
          countryId: country.id,
          serviceId: service.id,
          price,
          currency: "FCFA",
        },
      });
    }
  }

  console.log(
    `Seed complete: ${createdCountries.length} countries, ${createdServices.length} services, ` +
      `${createdCountries.length * createdServices.length} pricing entries.`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
