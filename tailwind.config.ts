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
        background: "#0B0E14",
        panel: "#121722",
        inset: "#0E1219",
        line: "#222A38",
        foreground: "#E8ECF4",
        muted: "#8B94A7",
        primary: "#7C6CFF",
        good: "#34D399",
        bad: "#F87171",
        warn: "#FBBF24",
        info: "#38BDF8",
        // Legacy aliases — old classes render sensibly on the dark theme
        // until every straggler is migrated.
        card: "#121722",
      },
      borderRadius: {
        bento: "16px",
      },
      boxShadow: {
        bento: "0 0 0 1px #222A38",
        glow: "0 0 24px rgba(124, 108, 255, 0.25)",
      },
      fontFamily: {
        display: ["var(--font-grotesk)", "system-ui", "sans-serif"],
        body: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
