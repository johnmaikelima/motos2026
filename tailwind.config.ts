import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Paleta da RunMotos
        ink: {
          DEFAULT: "#0a0c0f",
          900: "#0d1014",
          800: "#13171c",
          700: "#1a1f26",
          600: "#232932",
        },
        lime: {
          DEFAULT: "#c4f000",
          400: "#d2ff2e",
          500: "#c4f000",
          600: "#a6cc00",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-inter)", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
