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
        primary: {
          50: '#f0fdf7',
          100: '#d4fae8',
          200: '#aaf5d1',
          300: '#7ef0ba',
          400: '#6eeb9c',
          500: '#6eeb9c',
          600: '#3bc973',
          700: '#2da55f',
          800: '#1f814b',
          900: '#115d37',
        },
        dark: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#0d1117',
        },
        bg: {
          dark: '#1a2e2a',
          darker: '#152520',
          light: '#233d37',
        },
      },
    },
  },
  plugins: [],
}

