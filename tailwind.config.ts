import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Primary brand colors
        primary: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
          950: "#082f49",
        },
        // Accent neon colors
        neon: {
          cyan: "#00f5ff",
          purple: "#bf00ff",
          pink: "#ff00f5",
          green: "#00ff8c",
          orange: "#ff8c00",
        },
        // Dark theme background
        dark: {
          50: "#374151",
          100: "#2d3748",
          200: "#252d3d",
          300: "#1e2433",
          400: "#181d29",
          500: "#13171f",
          600: "#0f1217",
          700: "#0b0d11",
          800: "#07080b",
          900: "#030405",
        },
        // Surface colors for cards/panels
        surface: {
          DEFAULT: "#1a1f2e",
          light: "#252d3d",
          lighter: "#2d3748",
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "glow-conic": "conic-gradient(from 180deg at 50% 50%, #00f5ff33, #bf00ff33, #ff00f533, #00f5ff33)",
      },
      boxShadow: {
        glow: "0 0 20px rgba(0, 245, 255, 0.3)",
        "glow-lg": "0 0 40px rgba(0, 245, 255, 0.4)",
        "glow-purple": "0 0 20px rgba(191, 0, 255, 0.3)",
        "glow-pink": "0 0 20px rgba(255, 0, 245, 0.3)",
        "neon-border": "inset 0 0 20px rgba(0, 245, 255, 0.1), 0 0 20px rgba(0, 245, 255, 0.2)",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-in-out",
        "slide-up": "slideUp 0.5s ease-out",
        "slide-down": "slideDown 0.3s ease-out",
        "scale-in": "scaleIn 0.3s ease-out",
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        shimmer: "shimmer 2s linear infinite",
        glow: "glow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideDown: {
          "0%": { transform: "translateY(-10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        scaleIn: {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        glow: {
          "0%": { boxShadow: "0 0 5px rgba(0, 245, 255, 0.2), 0 0 10px rgba(0, 245, 255, 0.1)" },
          "100%": { boxShadow: "0 0 20px rgba(0, 245, 255, 0.4), 0 0 30px rgba(0, 245, 255, 0.2)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
