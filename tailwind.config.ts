import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: "#080c14",
          "bg-2": "#0f1520",
          "bg-3": "#1a2235",
          accent: "#00d4ff",
          "accent-2": "#7c3aed",
          text: "#f0f4ff",
          "text-muted": "#8892a4",
          like: "#22c55e",
          skip: "#ef4444",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
