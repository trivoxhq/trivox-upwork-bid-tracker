/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        text: {
          primary: "#111111",
          secondary: "#666666",
        },
        bg: {
          primary: "#FFFFFF",
          secondary: "#F5F5F5",
        },
        border: "#DDDDDD",
        brand: {
          primary: "#108A00",
          hover: "#0E7A00",
        },
        danger: "#D93025",
        warning: "#BA7517",
        info: "#378ADD",
      },
      fontFamily: {
        sans: ["var(--font-nunito)", "Arial", "Helvetica", "sans-serif"],
      },
    },
  },
  plugins: [],
};
