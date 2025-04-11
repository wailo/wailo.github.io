import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
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
      colors_: {
        primary: "#ffffff",
        secondary: "#130f0c",
        openglCanvasBackground: "#130f0c",
        panelBorder: "#7b8079",
        panelHeaderBackground: "#dfe4e2",
        panelStatusBackground: "#130f0c",
        panelContentBackground: "#f7f7f7",
        simElementBorder: "#130f0c",
        simInputBackground: "#e6e6e6",
        panelActive: "#b9391b",
        simBackground: "#f7f7f7",
        simActiveButton: "#b9391b",
      },
      colors: {
        primary: "#191919",
        secondary: "#d6d6d6",
        openglCanvasBackground: "#130f0c",
        panelBorder: "#8a8a8a",
        panelHeaderBackground: "#191919",
        panelStatusBackground: "#dfe4e2",
        panelContentBackground: "#000000",
        simElementBorder: "#595959",
        simInputBackground: "#191919",
        panelActive: "#b9391b",
        simBackground: "#000000",
        simActiveButton: "#1bb95e",
      },
    },
  },
  plugins: [],
} satisfies Config;
