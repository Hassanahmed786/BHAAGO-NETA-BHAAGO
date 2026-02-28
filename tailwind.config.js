/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        monad: {
          dark: "#0e0b1e",
          purple: "#836EF9",
          accent: "#a855f7",
          neon: "#39ff14",
          danger: "#ff0080",
          gold: "#ffd700",
        },
      },
      fontFamily: {
        pixel: ['"Press Start 2P"', "monospace"],
        rajdhani: ["Rajdhani", "sans-serif"],
      },
      animation: {
        pulse_glow: "pulse_glow 2s ease-in-out infinite",
        float: "float 3s ease-in-out infinite",
        scanline: "scanline 8s linear infinite",
      },
      keyframes: {
        pulse_glow: {
          "0%, 100%": { boxShadow: "0 0 5px #836EF9, 0 0 10px #836EF9" },
          "50%": { boxShadow: "0 0 20px #a855f7, 0 0 40px #a855f7" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      boxShadow: {
        neon_purple: "0 0 10px #836EF9, 0 0 20px #836EF9, 0 0 40px #836EF9",
        neon_green: "0 0 10px #39ff14, 0 0 20px #39ff14",
        neon_gold: "0 0 10px #ffd700, 0 0 20px #ffd700",
      },
    },
  },
  plugins: [],
};
