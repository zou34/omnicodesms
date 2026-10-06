import typography from "@tailwindcss/typography";
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-14px)" },
        },
        // Défilement infini des témoignages : la piste contient deux copies
        // identiques de la liste, donc translater de -50 % ramène exactement
        // la seconde copie là où était la première — la boucle est invisible.
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "toast-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        // Démo « Comment ça marche » (components/landing/how-it-works.tsx).
        // Uniquement opacity/transform : composités par le GPU, fluides sur
        // les Android d'entrée de gamme.
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-out": {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
        "step-progress": {
          "0%": { transform: "scaleX(0)" },
          "100%": { transform: "scaleX(1)" },
        },
        tap: {
          "0%": { opacity: "0.7", transform: "scale(0.4)" },
          "100%": { opacity: "0", transform: "scale(1.6)" },
        },
      },
      animation: {
        float: "float 4.5s ease-in-out infinite",
        "float-slow": "float 6s ease-in-out infinite",
        "float-slower": "float 7.5s ease-in-out infinite",
        "spin-glow": "spin 3.5s linear infinite",
        marquee: "marquee 70s linear infinite",
        "toast-in": "toast-in 0.2s ease-out",
        "fade-up": "fade-up 0.5s ease-out both",
        "fade-out": "fade-out 0.25s ease-out forwards",
        "step-progress": "step-progress linear forwards",
        tap: "tap 1.1s ease-out 2",
      },
    },
  },
  plugins: [typography],
};
export default config;
