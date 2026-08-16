/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          black: "#0A0A0A",
          yellow: "#FFC928",
          yellowdark: "#E5A900",
          offwhite: "#FAF9F6",
          cream: "#FAF9F6",
          soft: "#F5F3EE",
          charcoal: "#111827",
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
          "radial-gradient(circle at 20% 20%, rgba(255,198,39,0.16), transparent 28%), radial-gradient(circle at 80% 0%, rgba(10,10,10,0.06), transparent 25%)"
      },
      transitionTimingFunction: {
        luxe: "cubic-bezier(0.22, 1, 0.36, 1)"
      }
    }
  },
  plugins: []
};
