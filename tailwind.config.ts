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
        primary: "#ffffff",
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
      colors_: {
        primary: "#000000", // Black (for primary background)
        secondary: "#f5f5f5", // Very Light Grey (for text and highlights)
        openglCanvasBackground: "#000000", // Black (matching the primary background)
        panelBorder: "#4d4d4d", // Dark Grey (for panel borders)
        panelHeaderBackground: "#2e2e2e", // Dark Grey (for panel headers)
        panelContentBackground: "#1e1e1e", // Slightly darker than panel header for content
        simElementBorder: "#ff5733", // Very Light Grey (for simulation element borders)
        panelActive: "#ff5733", // Vivid Orange (for active panel elements)
        simBackground: "#1e1e1e", // Dark Grey (for simulation background)
        simText: "#f5f5f5", // Very Light Grey (for text in the simulation)
        simActiveButton: "#ff5733", // Vivid Orange (for active buttons in the simulation)
      },
    },
  },
  plugins: [],
} satisfies Config;
