import { heroui } from "@heroui/react";

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Existing brand palettes
        ranch: {
          50: "#f3e8ff",
          100: "#e9d5ff",
          200: "#d4aaff",
          300: "#be7fff",
          400: "#a855ff",
          500: "#6b46c1",
          600: "#5635a1",
          700: "#412581",
          800: "#2c1461",
          900: "#170441",
        },
        pasture: {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          800: "#065f46",
          900: "#064e3b",
        },
        // SON palette
        son: {
          primaryDark: "#1a1b3a",
          primaryMedium: "#2d2f5f",
          primaryLight: "#4a4d7a",
          accent: "#6366f1",
          white: "#ffffff",
          lightGray: "#f8f9fa",
          mediumGray: "#6b7280",
          darkGray: "#374151",
          black: "#111827",
          success: "#10b981",
          warning: "#f59e0b",
          error: "#ef4444",
          info: "#3b82f6",
        },
      },
      backgroundImage: {
        "son-gradient-purple":
          "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        "son-gradient-pink":
          "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
        "son-gradient-orange":
          "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
        "son-gradient-blue":
          "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
      },
      boxShadow: {
        island: "0 10px 40px rgba(0,0,0,0.08), 0 2px 10px rgba(0,0,0,0.04)",
        glow: "0 0 20px rgba(99,102,241,0.3)",
      },
      borderRadius: {
        island: "24px",
      },
    },
  },
  plugins: [require("@heroui/theme"), heroui()],
};
