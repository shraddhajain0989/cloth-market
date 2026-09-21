import forms from "@tailwindcss/forms";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // ── New Design System ──────────────────────────────
        "cm-black":  "#111111",
        "cm-white":  "#FFFFFF",
        "cm-soft":   "#FAFAFA",
        "cm-text":   "#1A1A1A",
        "cm-muted":  "#777777",
        "cm-border": "#ECECEC",
        "cm-red":    "#D62828",
        // ── Legacy (kept for admin/social/profile pages) ───
        ink:   "#101828",
        mist:  "#eef2ff",
        coral: "#ff6b57",
        sand:  "#f7ede2",
        ocean: "#0f4c81",
        mint:  "#54c6b7"
      },
      fontFamily: {
        display: ["'Clash Display'", "'Space Grotesk'", "sans-serif"],
        sans:    ["Satoshi", "Inter", "Manrope", "sans-serif"]
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "1rem" }],
        "display-sm": ["clamp(2rem, 4vw, 3rem)", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        "display-md": ["clamp(2.5rem, 5vw, 4rem)", { lineHeight: "1.05", letterSpacing: "-0.03em" }],
        "display-lg": ["clamp(3rem, 7vw, 6rem)", { lineHeight: "1", letterSpacing: "-0.04em" }],
        "display-xl": ["clamp(4rem, 10vw, 8rem)", { lineHeight: "0.95", letterSpacing: "-0.05em" }]
      },
      animation: {
        "fade-up":      "fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) forwards",
        "fade-in":      "fadeIn 0.5s ease forwards",
        "marquee":      "marquee 35s linear infinite",
        "marquee-rev":  "marqueeRev 35s linear infinite",
        "shimmer":      "shimmer 1.8s ease-in-out infinite",
        "float-slow":   "floatSlow 8s ease-in-out infinite",
        "float-mid":    "floatMid 6s ease-in-out infinite 1s",
        "pulse-red":    "pulseRed 2s ease-in-out infinite",
        "slide-in-top": "slideInTop 0.4s cubic-bezier(0.16,1,0.3,1) forwards"
      },
      keyframes: {
        fadeUp:     { "0%": { opacity: 0, transform: "translateY(24px)" }, "100%": { opacity: 1, transform: "translateY(0)" } },
        fadeIn:     { "0%": { opacity: 0 }, "100%": { opacity: 1 } },
        marquee:    { "0%": { transform: "translateX(0)" }, "100%": { transform: "translateX(-50%)" } },
        marqueeRev: { "0%": { transform: "translateX(-50%)" }, "100%": { transform: "translateX(0)" } },
        shimmer:    { "0%": { backgroundPosition: "-600px 0" }, "100%": { backgroundPosition: "600px 0" } },
        floatSlow:  { "0%,100%": { transform: "translateY(0) rotate(0deg)" }, "50%": { transform: "translateY(-14px) rotate(0.5deg)" } },
        floatMid:   { "0%,100%": { transform: "translateY(0) rotate(0deg)" }, "50%": { transform: "translateY(-10px) rotate(-0.5deg)" } },
        pulseRed:   { "0%,100%": { opacity: 1 }, "50%": { opacity: 0.4 } },
        slideInTop: { "0%": { opacity: 0, transform: "translateY(-12px)" }, "100%": { opacity: 1, transform: "translateY(0)" } }
      },
      boxShadow: {
        "card":       "0 1px 2px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.06)",
        "card-hover": "0 2px 4px rgba(0,0,0,0.06), 0 20px 60px rgba(0,0,0,0.12)",
        "glass":      "0 8px 32px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.6)",
        "editorial":  "0 0 0 1px rgba(0,0,0,0.06), 0 12px 48px rgba(0,0,0,0.08)",
        "glow":       "0 20px 60px rgba(16,24,40,0.16)"
      },
      backgroundImage: {
        "mesh":     "radial-gradient(circle at top left, rgba(255,107,87,0.22), transparent 30%), radial-gradient(circle at bottom right, rgba(84,198,183,0.2), transparent 28%), linear-gradient(135deg, #fffaf7 0%, #f6f8ff 42%, #eef7ff 100%)",
        "shimmer-gradient": "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.8) 50%, transparent 100%)"
      },
      transitionTimingFunction: {
        "spring": "cubic-bezier(0.16, 1, 0.3, 1)"
      },
      backdropBlur: {
        xs: "2px"
      }
    }
  },
  plugins: [forms]
};
