/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        discord: {
          50: '#f0f1f3',
          100: '#e0e1e7',
          200: '#c1c3cf',
          300: '#a2a5b7',
          400: '#83879f',
          500: '#5865f2',
          600: '#4752c4',
          700: '#363e96',
          800: '#242968',
          900: '#12153a',
          950: '#090b1d'
        }
      }
    }
  },
  plugins: []
};
