import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "krx-bg":      "#050810",
        "krx-surface": "#0a0f1e",
        "krx-border":  "#1a2540",
        "krx-cyan":    "#00e5ff",
        "krx-purple":  "#7b2fff",
        "krx-green":   "#00ff88",
        "krx-red":     "#ff2d6b",
        "krx-text":    "#c8d8f0",
        "krx-muted":   "#4a6080",
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "Courier New", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
