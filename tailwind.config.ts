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
      },
      animation: {
        float: "float 4.5s ease-in-out infinite",
        "float-slow": "float 6s ease-in-out infinite",
        "float-slower": "float 7.5s ease-in-out infinite",
        "spin-glow": "spin 3.5s linear infinite",
      },
    },
  },
  plugins: [typography],
};
export default config;
