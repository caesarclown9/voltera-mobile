/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Primary - Электрический синий (основной цвет бренда Voltera)
        primary: {
          50: "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          300: "#93C5FD",
          400: "#60A5FA",
          500: "#3B82F6", // Main brand color - Электрический синий
          600: "#2563EB",
          700: "#1D4ED8",
          800: "#1E40AF",
          900: "#1E3A8A",
        },
        // Accent - Фиолетовый (для акцентов и выделения)
        accent: {
          50: "#F5F3FF",
          100: "#EDE9FE",
          200: "#DDD6FE",
          300: "#C4B5FD",
          400: "#A78BFA",
          500: "#8B5CF6", // Accent color - Фиолетовый
          600: "#7C3AED",
          700: "#6D28D9",
          800: "#5B21B6",
          900: "#4C1D95",
        },
        // Dark - Темный (из логотипа Voltera)
        dark: {
          50: "#F9FAFB",
          100: "#F3F4F6",
          200: "#E5E7EB",
          300: "#D1D5DB",
          400: "#9CA3AF",
          500: "#6B7280",
          600: "#4B5563",
          700: "#374151",
          800: "#2B2A29", // Dark background - из логотипа
          900: "#1F2937", // Darkest
        },
        // Success - Изумрудный (для успеха и доступности)
        success: {
          50: "#ECFDF5",
          100: "#D1FAE5",
          200: "#A7F3D0",
          300: "#6EE7B7",
          400: "#34D399",
          500: "#10B981",
          600: "#059669",
          700: "#047857",
          800: "#065F46",
          900: "#064E3B",
        },
        // Warning - Янтарный (для предупреждений)
        warning: {
          50: "#FFFBEB",
          100: "#FEF3C7",
          200: "#FDE68A",
          300: "#FCD34D",
          400: "#FBBF24",
          500: "#F59E0B",
          600: "#D97706",
          700: "#B45309",
          800: "#92400E",
          900: "#78350F",
        },
        // Error - Красный (для ошибок)
        error: {
          50: "#FEF2F2",
          100: "#FEE2E2",
          200: "#FECACA",
          300: "#FCA5A5",
          400: "#F87171",
          500: "#EF4444",
          600: "#DC2626",
          700: "#B91C1C",
          800: "#991B1B",
          900: "#7F1D1D",
        },
        // Cyan - Оставляем для совместимости (маппим на primary)
        cyan: {
          50: "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          300: "#93C5FD",
          400: "#60A5FA",
          500: "#3B82F6",
          600: "#2563EB",
          700: "#1D4ED8",
          800: "#1E40AF",
          900: "#1E3A8A",
        },
      },
      // Градиенты
      backgroundImage: {
        "gradient-lightning":
          "linear-gradient(135deg, #60A5FA 0%, #3B82F6 50%, #2563EB 100%)",
        "gradient-primary": "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)",
        "gradient-card": "linear-gradient(135deg, #EFF6FF 0%, #FFFFFF 100%)",
        "gradient-dark": "linear-gradient(135deg, #2B2A29 0%, #374151 100%)",
        "gradient-energy":
          "linear-gradient(90deg, #3B82F6 0%, #8B5CF6 50%, #A78BFA 100%)",
      },
      // Тени с электрическим синим оттенком
      boxShadow: {
        sm: "0 1px 2px 0 rgba(59, 130, 246, 0.05)",
        DEFAULT: "0 1px 3px 0 rgba(59, 130, 246, 0.1)",
        md: "0 4px 6px -1px rgba(59, 130, 246, 0.1)",
        lg: "0 10px 15px -3px rgba(59, 130, 246, 0.15)",
        xl: "0 20px 25px -5px rgba(59, 130, 246, 0.2)",
        "2xl": "0 25px 50px -12px rgba(59, 130, 246, 0.25)",
        "glow-primary": "0 0 20px rgba(59, 130, 246, 0.4)",
        "glow-accent": "0 0 20px rgba(139, 92, 246, 0.4)",
        "glow-energy": "0 0 30px rgba(96, 165, 250, 0.6)",
      },
      // Анимации
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "spin-slow": "spin 3s linear infinite",
        "bounce-slow": "bounce 2s infinite",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};
