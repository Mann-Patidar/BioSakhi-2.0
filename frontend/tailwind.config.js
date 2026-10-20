/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        forest: "#176044",
        teal: "#168b82",
        ink: "#18332b",
        canvas: "#f4f8f5"
      },
      boxShadow: {
        soft: "0 8px 28px rgba(24, 51, 43, 0.06)"
      }
    }
  },
  plugins: []
};
