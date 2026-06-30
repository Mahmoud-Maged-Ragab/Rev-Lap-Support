import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial"],
      },
      colors: {
        ink: {
          900: "#0f172a",
          700: "#334155",
          500: "#64748b",
          300: "#cbd5e1",
          100: "#f1f5f9",
        },
        accent: {
          DEFAULT: "#1f6feb",
          hover: "#1858c4",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,23,42,.06), 0 1px 1px rgba(15,23,42,.04)",
      },
    },
  },
  plugins: [],
};

export default config;
