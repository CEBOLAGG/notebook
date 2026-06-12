import type { Config } from 'tailwindcss';

/**
 * Design system "Data-Dense Dashboard" (industrial):
 * - ink  = escala slate fria (superfícies, texto, bordas)
 * - brand = emerald de estoque/aprovação (CTAs, navegação ativa, destaques)
 * - status = verde/âmbar/vermelho com contraste AA sobre superfícies claras
 * Fontes: Fira Sans (corpo) + Fira Code (títulos, rótulos e dados) via
 * variáveis CSS injetadas pelo next/font em app/layout.tsx.
 */
const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
        // Títulos na MESMA sans (peso forte) — mono fica só para dados.
        display: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        brand: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
        ok: '#15803d',
        warn: '#b45309',
        bad: '#b91c1c',
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 23, 42, 0.05), 0 2px 8px rgba(15, 23, 42, 0.04)',
      },
    },
  },
  plugins: [],
};

export default config;
