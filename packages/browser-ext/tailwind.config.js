/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{tsx,ts,jsx,js,html}",
    "./components/**/*.{tsx,ts,jsx,js}",
    "./lib/**/*.{tsx,ts,jsx,js}",
    // Include workspace packages source files for direct source imports
    "../aipex-react/src/**/*.{tsx,ts,jsx,js}",
    "../browser-runtime/src/**/*.{tsx,ts,jsx,js}",
    "../core/src/**/*.{tsx,ts,jsx,js}",
  ],
  darkMode: "class",
  prefix: "",
  // Optimize for development
  safelist: [],
  future: {
    hoverOnlyWhenSupported: true,
  },
};
