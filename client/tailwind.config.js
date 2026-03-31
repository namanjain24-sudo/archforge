/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: '#0f172a',    // slate-900
        cardBg: '#1e293b',    // slate-800
        accent: '#3b82f6',    // blue-500
        accentHover: '#2563eb'// blue-600
      }
    },
  },
  plugins: [],
}
