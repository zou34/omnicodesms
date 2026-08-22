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

  // --- Expanded coverage (real countries/ISO codes/dial codes) — not
  // backed by real provider inventory yet (MockProvider prices/rents all
  // of them), added so the country picker reflects the "170+ pays"
  // marketing claim on the landing page rather than just the original 8. ---

  // Europe
  { name: "Spain", code: "ES", dialCode: "+34" },
  { name: "Italy", code: "IT", dialCode: "+39" },
  { name: "Portugal", code: "PT", dialCode: "+351" },
  { name: "Netherlands", code: "NL", dialCode: "+31" },
  { name: "Belgium", code: "BE", dialCode: "+32" },
  { name: "Switzerland", code: "CH", dialCode: "+41" },
  { name: "Austria", code: "AT", dialCode: "+43" },
  { name: "Sweden", code: "SE", dialCode: "+46" },
  { name: "Norway", code: "NO", dialCode: "+47" },
  { name: "Denmark", code: "DK", dialCode: "+45" },
  { name: "Finland", code: "FI", dialCode: "+358" },
  { name: "Poland", code: "PL", dialCode: "+48" },
  { name: "Czech Republic", code: "CZ", dialCode: "+420" },
  { name: "Slovakia", code: "SK", dialCode: "+421" },
  { name: "Hungary", code: "HU", dialCode: "+36" },
  { name: "Romania", code: "RO", dialCode: "+40" },
  { name: "Bulgaria", code: "BG", dialCode: "+359" },
  { name: "Greece", code: "GR", dialCode: "+30" },
  { name: "Ireland", code: "IE", dialCode: "+353" },
  { name: "Iceland", code: "IS", dialCode: "+354" },
  { name: "Ukraine", code: "UA", dialCode: "+380" },
  { name: "Russia", code: "RU", dialCode: "+7" },
  { name: "Turkey", code: "TR", dialCode: "+90" },
  { name: "Croatia", code: "HR", dialCode: "+385" },
  { name: "Serbia", code: "RS", dialCode: "+381" },
  { name: "Slovenia", code: "SI", dialCode: "+386" },
  { name: "Estonia", code: "EE", dialCode: "+372" },
  { name: "Latvia", code: "LV", dialCode: "+371" },
  { name: "Lithuania", code: "LT", dialCode: "+370" },
  { name: "Luxembourg", code: "LU", dialCode: "+352" },

  // Americas
  { name: "Canada", code: "CA", dialCode: "+1" },
  { name: "Mexico", code: "MX", dialCode: "+52" },
  { name: "Argentina", code: "AR", dialCode: "+54" },
  { name: "Chile", code: "CL", dialCode: "+56" },
  { name: "Colombia", code: "CO", dialCode: "+57" },
  { name: "Peru", code: "PE", dialCode: "+51" },
  { name: "Venezuela", code: "VE", dialCode: "+58" },
  { name: "Ecuador", code: "EC", dialCode: "+593" },
  { name: "Bolivia", code: "BO", dialCode: "+591" },
  { name: "Paraguay", code: "PY", dialCode: "+595" },
  { name: "Uruguay", code: "UY", dialCode: "+598" },
  { name: "Costa Rica", code: "CR", dialCode: "+506" },
  { name: "Panama", code: "PA", dialCode: "+507" },
  { name: "Guatemala", code: "GT", dialCode: "+502" },
  { name: "Honduras", code: "HN", dialCode: "+504" },
  { name: "El Salvador", code: "SV", dialCode: "+503" },
  { name: "Nicaragua", code: "NI", dialCode: "+505" },
  { name: "Dominican Republic", code: "DO", dialCode: "+1" },
  { name: "Cuba", code: "CU", dialCode: "+53" },
  { name: "Jamaica", code: "JM", dialCode: "+1" },

  // Asia & Middle East
  { name: "China", code: "CN", dialCode: "+86" },
  { name: "Japan", code: "JP", dialCode: "+81" },
  { name: "South Korea", code: "KR", dialCode: "+82" },
  { name: "India", code: "IN", dialCode: "+91" },
  { name: "Pakistan", code: "PK", dialCode: "+92" },
  { name: "Bangladesh", code: "BD", dialCode: "+880" },
  { name: "Sri Lanka", code: "LK", dialCode: "+94" },
  { name: "Nepal", code: "NP", dialCode: "+977" },
  { name: "Vietnam", code: "VN", dialCode: "+84" },
  { name: "Thailand", code: "TH", dialCode: "+66" },
  { name: "Philippines", code: "PH", dialCode: "+63" },
  { name: "Malaysia", code: "MY", dialCode: "+60" },
  { name: "Singapore", code: "SG", dialCode: "+65" },
  { name: "Myanmar", code: "MM", dialCode: "+95" },
  { name: "Cambodia", code: "KH", dialCode: "+855" },
  { name: "Laos", code: "LA", dialCode: "+856" },
  { name: "Taiwan", code: "TW", dialCode: "+886" },
  { name: "Hong Kong", code: "HK", dialCode: "+852" },
  { name: "Mongolia", code: "MN", dialCode: "+976" },
  { name: "Kazakhstan", code: "KZ", dialCode: "+7" },
  { name: "Uzbekistan", code: "UZ", dialCode: "+998" },
  { name: "Israel", code: "IL", dialCode: "+972" },
  { name: "Saudi Arabia", code: "SA", dialCode: "+966" },
  { name: "United Arab Emirates", code: "AE", dialCode: "+971" },
  { name: "Qatar", code: "QA", dialCode: "+974" },
  { name: "Kuwait", code: "KW", dialCode: "+965" },
  { name: "Bahrain", code: "BH", dialCode: "+973" },
  { name: "Oman", code: "OM", dialCode: "+968" },
  { name: "Jordan", code: "JO", dialCode: "+962" },
  { name: "Lebanon", code: "LB", dialCode: "+961" },
  { name: "Iraq", code: "IQ", dialCode: "+964" },
  { name: "Iran", code: "IR", dialCode: "+98" },
  { name: "Yemen", code: "YE", dialCode: "+967" },
  { name: "Azerbaijan", code: "AZ", dialCode: "+994" },
  { name: "Georgia", code: "GE", dialCode: "+995" },

  // Africa
  { name: "South Africa", code: "ZA", dialCode: "+27" },
  { name: "Egypt", code: "EG", dialCode: "+20" },
  { name: "Morocco", code: "MA", dialCode: "+212" },
  { name: "Algeria", code: "DZ", dialCode: "+213" },
  { name: "Tunisia", code: "TN", dialCode: "+216" },
  { name: "Kenya", code: "KE", dialCode: "+254" },
  { name: "Tanzania", code: "TZ", dialCode: "+255" },
  { name: "Uganda", code: "UG", dialCode: "+256" },
  { name: "Ghana", code: "GH", dialCode: "+233" },
  { name: "Senegal", code: "SN", dialCode: "+221" },
  { name: "Cameroon", code: "CM", dialCode: "+237" },
  { name: "Ethiopia", code: "ET", dialCode: "+251" },
  { name: "Rwanda", code: "RW", dialCode: "+250" },
  { name: "Zambia", code: "ZM", dialCode: "+260" },
  { name: "Mali", code: "ML", dialCode: "+223" },
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
