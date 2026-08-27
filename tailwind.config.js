/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: "#07163D",
          cyan: "#08B9D4",
          cyandark: "#008CA5",
          pink: "#F72572",
          pinkdark: "#C91458",
          orange: "#FFB21A",
          purple: "#7B4AA4",
          black: "#07163D",
          yellow: "#08B9D4",
          yellowdark: "#008CA5",
          offwhite: "#F8FAFC",
          cream: "#F8FAFC",
          soft: "#F2F7FA",
          charcoal: "#13213F",
          grey: "#F2F2F2",
          muted: "#6B7280",
          success: "#16A34A",
          error: "#DC2626"
        }
      },
      boxShadow: {
        soft: "0 20px 60px rgba(17, 24, 39, 0.08)",
        card: "0 12px 34px rgba(17, 24, 39, 0.07)"
      },
      borderRadius: {
        "4xl": "2rem"
      },
      fontFamily: {
        heading: ["Manrope", "sans-serif"],
        body: ["Inter", "sans-serif"]
      },
      backgroundImage: {
        grain:
          "radial-gradient(circle at 20% 20%, rgba(8,185,212,0.15), transparent 28%), radial-gradient(circle at 78% 4%, rgba(247,37,114,0.08), transparent 24%)"
      },
      transitionTimingFunction: {
        luxe: "cubic-bezier(0.22, 1, 0.36, 1)"
      }
    }
  },
  plugins: []
};
