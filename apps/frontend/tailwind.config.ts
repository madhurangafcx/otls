import type { Config } from 'tailwindcss';

// Tokens from DESIGN.md — Editorial Academic aesthetic.
// When you add/change tokens, update DESIGN.md in the same commit.
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#FAF8F3',
        surface: '#FFFFFF',
        ink: '#1C1917',
        muted: '#57534E',
        subtle: '#A8A29E',
        line: '#E7E5E4',
        'line-soft': '#F0EEE9',
        accent: {
          50: '#FEF7EC',
          100: '#FDECCB',
          500: '#D97706',
          600: '#B45309',
          700: '#92400E',
          900: '#451A03',
        },
        success: { bg: '#ECFDF5', fg: '#065F46', border: '#A7F3D0' },
        warning: { bg: '#FEF3C7', fg: '#92400E', border: '#FDE68A' },
        danger: { bg: '#FEF2F2', fg: '#991B1B', border: '#FECACA' },
        info: { bg: '#EFF6FF', fg: '#1E40AF', border: '#BFDBFE' },
      },
      fontFamily: {
        // CSS variables set by next/font (Fraunces) and the `geist` package (Geist, Geist Mono)
        // in src/app/layout.tsx
        display: ['var(--font-fraunces)', 'ui-serif', 'Georgia', 'serif'],
        sans: ['var(--font-geist-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        // Matching DESIGN.md's typography scale
        'display-lg': ['56px', { lineHeight: '1.03', letterSpacing: '-0.025em' }],
        'display-md': ['44px', { lineHeight: '1.05', letterSpacing: '-0.02em' }],
        h1: ['40px', { lineHeight: '1.1', letterSpacing: '-0.018em' }],
        'h1-sm': ['32px', { lineHeight: '1.15', letterSpacing: '-0.01em' }],
        h2: ['28px', { lineHeight: '1.2', letterSpacing: '-0.008em' }],
        h3: ['22px', { lineHeight: '1.25' }],
        h4: ['17px', { lineHeight: '1.4', letterSpacing: '-0.005em' }],
        'body-lg': ['18px', { lineHeight: '1.65' }],
        body: ['15px', { lineHeight: '1.6' }],
        'body-sm': ['13.5px', { lineHeight: '1.5' }],
        caption: ['11px', { lineHeight: '1.4', letterSpacing: '0.09em' }],
      },
      borderRadius: {
        DEFAULT: '6px',
        card: '8px',
        modal: '12px',
        drop: '10px',
        pill: '9999px',
      },
    },
  },
  plugins: [],
};

export default config;
