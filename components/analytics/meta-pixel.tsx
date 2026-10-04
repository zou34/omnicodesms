"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect, useRef } from "react";

import { META_PIXEL_ID, trackMetaEvent } from "@/lib/meta-pixel";

// Monté une seule fois dans le layout racine : charge le Pixel Meta sur tout
// le site et compte une PageView par page vue. Le snippet de base ne compte
// que le premier chargement ; les navigations internes de l'App Router ne
// rechargent pas la page, d'où le suivi des changements de chemin ci-dessous.
// Les conversions (inscription, recharge, paiement) sont envoyées là où
// elles se produisent, via lib/meta-pixel.ts.
export function MetaPixel() {
  const pathname = usePathname();
  const lastPathname = useRef<string | null>(null);

  useEffect(() => {
    // Premier rendu : la PageView est déjà envoyée par le snippet de base.
    if (lastPathname.current !== null && lastPathname.current !== pathname) {
      trackMetaEvent("PageView");
    }
    lastPathname.current = pathname;
  }, [pathname]);

  // Pas de repli <noscript><img> : React le rend aussi avec JavaScript actif,
  // ce qui comptait chaque visite deux fois. Inscription et recharge exigent
  // JavaScript de toute façon — une visite sans JS ne peut rien convertir.
  return (
    <Script id="meta-pixel" strategy="afterInteractive">
      {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${META_PIXEL_ID}');
fbq('track','PageView');`}
    </Script>
  );
}
