const { loadThemeSync } = require('./lib/theme');

const country = process.env.NEXT_PUBLIC_COUNTRY || 'mk';
const theme = loadThemeSync(country);

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './ui/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: theme.primary,
        dark: theme.dark,
        bg: theme.bg,
        semantic: theme.semantic,
      },
    },
  },
  plugins: [],
}

