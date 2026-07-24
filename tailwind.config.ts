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
        background: "#F2F2F7",
        foreground: "#000000",
        primary: "#007AFF",
        card: "#FFFFFF",
      },
      borderRadius: {
        bento: "24px",
      },
      boxShadow: {
        bento: "0px 10px 30px rgba(0, 0, 0, 0.08)",
      },
      fontFamily: {
        display: ['"SF Pro Display"', '"Inter"', 'system-ui', 'sans-serif'],
        body: ['"SF Pro Text"', '"Inter"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
