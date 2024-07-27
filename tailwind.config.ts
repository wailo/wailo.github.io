import type { Config } from "tailwindcss";

export default {
  purge: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  content: [],
  theme: {
    extend: {
      fontSize: {
        panel: '0.65rem',
      },
      fontFamily: {
        panel: ["Orbitron", "Courier New", "Courier", "monospace"], // Adds a new `font-display` class
      },
      fontWeight: {
        light: 300,
        medium: 500,
        bold: 700,
        black: 900,
      },
    },
  },
  plugins: [],
} satisfies Config;
