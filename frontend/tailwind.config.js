/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        industrial: {
          50: '#f4f6f8',
          100: '#e5e9ee',
          200: '#cfd7e3',
          300: '#adbcce',
          400: '#839bb6',
          500: '#627ea0',
          600: '#4c6585',
          700: '#3f526e',
          800: '#36455b',
          900: '#2f3b4c',
          950: '#1b222d',
        },
        brand: {
          blue: '#1e40af',
          cyan: '#0891b2',
          amber: '#d97706',
          emerald: '#059669',
          rose: '#e11d48',
          slate: '#0f172a'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
