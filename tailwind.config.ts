import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        // Bauhaus / Neo-Brutalist headlines — Space Grotesk
        serif: ["var(--font-display)", "Space Grotesk", "sans-serif"],
        display: ["var(--font-display)", "Space Grotesk", "sans-serif"],
        headline: ["var(--font-display)", "Space Grotesk", "sans-serif"],
      },
      colors: {
        // shadcn semantic tokens (CSS-var driven; values set to the Bauhaus palette in globals.css)
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },

        // ── Bauhaus / Neo-Brutalist literal tokens (match the reference design) ──
        tertiary: "#0055ff",
        "tertiary-container": "#d6e3ff",
        "on-tertiary": "#ffffff",
        "primary-container": "#ffcc00",
        "on-primary-container": "#1a1a1a",
        "on-primary": "#ffffff",
        "primary-fixed": "#ffcc00",
        "primary-fixed-dim": "#e6b800",
        "on-secondary": "#ffffff",
        surface: "#f5f0e8",
        "surface-bright": "#faf7f2",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f2ede5",
        "surface-container": "#eee9e0",
        "surface-container-high": "#e8e3da",
        "surface-container-highest": "#e2ddd4",
        "surface-variant": "#e8e3da",
        "surface-dim": "#d6d1c9",
        "on-surface": "#1a1a1a",
        "on-surface-variant": "#4a4a4a",
        outline: "#1a1a1a",
        "outline-variant": "#d0cbc3",
        error: "#cc0000",
        "error-container": "#ffdad6",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        neo: "6px 6px 0px 0px #1a1a1a",
        "neo-sm": "4px 4px 0px 0px #1a1a1a",
        "neo-lg": "8px 8px 0px 0px #1a1a1a",
        "neo-pressed": "2px 2px 0px 0px #1a1a1a",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.4s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
