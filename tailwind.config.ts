import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./types/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sand: "#f5efe6",
        mist: "#eff3ef",
        leaf: "#5e7a6f",
        ink: "#24343b",
        blush: "#e9d7ce",
        shell: "#fffaf6",
      },
      boxShadow: {
        panel: "0 24px 80px -32px rgba(36, 52, 59, 0.38)",
      },
      fontFamily: {
        sans: [
          "\"Avenir Next\"",
          "\"SF Pro Text\"",
          "\"PingFang SC\"",
          "\"Hiragino Sans GB\"",
          "sans-serif",
        ],
        display: [
          "\"Iowan Old Style\"",
          "\"Songti SC\"",
          "\"STSong\"",
          "Georgia",
          "serif",
        ],
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translate3d(0, 0, 0)" },
          "50%": { transform: "translate3d(0, -10px, 0)" },
        },
        reveal: {
          "0%": { opacity: "0", transform: "translate3d(0, 10px, 0)" },
          "100%": { opacity: "1", transform: "translate3d(0, 0, 0)" },
        },
      },
      animation: {
        float: "float 9s ease-in-out infinite",
        reveal: "reveal 420ms ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
