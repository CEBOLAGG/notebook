import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        ink: {
          50: '#f7f8fa',
          100: '#eef0f4',
          200: '#dde1ea',
          300: '#c3c9d6',
          400: '#9099ad',
          500: '#5f6779',
          600: '#444b5c',
          700: '#2f3543',
          800: '#1c2030',
          900: '#0f1320',
        },
        brand: {
          50: '#eef5ff',
          100: '#d9e8ff',
          200: '#bcd6ff',
          300: '#8ebaff',
          400: '#5993ff',
          500: '#2f6fee',
          600: '#1e54d4',
          700: '#1a44ab',
          800: '#1a3b87',
          900: '#1a346b',
        },
        ok: '#15803d',
        warn: '#b45309',
        bad: '#b91c1c',
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 19, 32, 0.04), 0 4px 12px rgba(15, 19, 32, 0.06)',
      },
    },
  },
  plugins: [],
};

export default config;
