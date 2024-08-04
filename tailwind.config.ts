import type { Config } from "tailwindcss";

export default {
  purge: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  content: [],
  theme: {
    extend: {
      fontSize: {
        panelFont: "0.65rem",
      },
      fontFamily: {
        panelFont: ["Orbitron", "Courier New", "Courier", "monospace"], // Adds a new `font-display` class
      },
      fontWeight: {
        light: "300",
        medium: "500",
        bold: "700",
        black: "900",
      },
      colors: {
        primary: "#000000",
        secondary: "#ffffff",
        accent: "#000000", // Black
        panelBorder: "#000000", // Black
        panelHeaderBackground: "#00000000", // Light Grey
        panelContentBackground: "#00000000", // White
        panelActive: "#4b00ff",
        simBackground: "#f5f5f5", // White
        simText: "#000000", // Black
        simSeparatorLine: "#e0e0e0", // Light Grey
        simActiveButton: "#ffffff", // white
      },
    },
  },
  plugins: [],
} satisfies Config;
