/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{tsx,ts,jsx,js,html}",
    "./components/**/*.{tsx,ts,jsx,js}",
    "./lib/**/*.{tsx,ts,jsx,js}"
  ],
  darkMode: "media",
  prefix: "",
  // Optimize for development
  safelist: [],
  future: {
    hoverOnlyWhenSupported: true,
  }
}
