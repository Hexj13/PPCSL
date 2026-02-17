const theme = require('./lib/theme.json');

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
        text: theme.text,
        divider: theme.divider,
        accent: theme.accent,
        accentSecondary: theme.accentSecondary,
        newBadge: theme.newBadge,
        semantic: theme.semantic,
      },
    },
  },
  plugins: [],
};
