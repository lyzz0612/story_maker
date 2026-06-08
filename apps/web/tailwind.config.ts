import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#162033",
        paper: "#fff9ef",
        honey: "#f6b44b",
        berry: "#e36b7c",
        mint: "#89c9b8"
      },
      boxShadow: {
        soft: "0 20px 60px rgba(22, 32, 51, 0.10)"
      }
    }
  },
  plugins: []
} satisfies Config;
