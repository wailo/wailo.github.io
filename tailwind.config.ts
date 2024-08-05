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
        primary: "#dfe4e2",
        secondary: "#130f0c",
        openglCanvasBackground: "#130f0c",
        panelBorder: "#7b8079",
        panelHeaderBackground: "#dfe4e2",
        panelContentBackground: "#f7f7f7",
        simElementBorder: "#130f0c",
        panelActive: "#b9391b",
        simBackground: "#f7f7f7",
        simActiveButton: "#b9391b",
      },
      colors_black_white: {
        primary: "#ffffff", // White
        secondary: "#000000", // Black
        openglCanvasBackground: "#000000", // Preferable black or very dark,
        panelBorder: "#000000", // Black
        panelHeaderBackground: "#00000000", // Black
        panelContentBackground: "#00000000", // Black
        simElementBorder: "rgb(71 85 105)", // Dark grey
        panelActive: "#4b00ff",
        simBackground: "#f5f5f5", // Off White
        simActiveButton: "#555555", // white
      },
    },
  },
  plugins: [],
} satisfies Config;
