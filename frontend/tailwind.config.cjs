/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "primary": "#2c3e50",
        "newRed": "#EF9270",
        "newRedHover": "#edb39e",
        "newGreen": "#8CCD8A"
      }
    },
  },
  plugins: [
  ],
}
