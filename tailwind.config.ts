import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      fontSize: {
        panelFont: "0.65rem",
      },
      fontFamily: {
        panelFont: ["Orbitron", "Courier New", "Courier", "monospace"],
      },
      fontWeight: {
        light: "300",
        medium: "500",
        bold: "700",
        black: "900",
      },
      colors: {
        primary: "rgb(var(--color-primary) / <alpha-value>)",
        secondary: "rgb(var(--color-secondary) / <alpha-value>)",
        openglCanvasBackground: "#000000",
        panelBorder: "rgb(var(--color-panelBorder) / <alpha-value>)",
        panelHeaderBackground: "rgb(var(--color-panelHeaderBackground) / <alpha-value>)",
        panelStatusBackground: "rgb(var(--color-panelStatusBackground) / <alpha-value>)",
        panelContentBackground: "rgb(var(--color-panelContentBackground) / <alpha-value>)",
        simElementBorder: "rgb(var(--color-simElementBorder) / <alpha-value>)",
        simInputBackground: "rgb(var(--color-simInputBackground) / <alpha-value>)",
        panelActive: "#b9391b",
        simBackground: "rgb(var(--color-simBackground) / <alpha-value>)",
        simActiveButton: "rgb(var(--color-simActiveButton) / <alpha-value>)",
      },
    },
  },
  plugins: [],
} satisfies Config;
