/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Official corporate palette
        brand: {
          primary: '#536E27',
          primaryDark: '#3F541E',
          accent: '#8FBE1A',
          accentDark: '#7EA717',
          supporting: '#77AA2B',
          dark: '#253213',
          bg: '#F8F9FA',
          surface: '#FFFFFF',
          border: '#E2E8D4',
          text: '#1E293B',
          muted: '#64748B',
          danger: '#DC2626',
          warning: '#D97706',
          success: '#16A34A',
          info: '#2563EB',
          pending: '#B45309',
        },
      },
      borderRadius: {
        card: '16px',
        sheet: '24px',
      },
      fontFamily: {
        sans: ['Hanken Grotesk', 'System'],
        mono: ['JetBrains Mono', 'Courier'],
      },
      letterSpacing: {
        label: '0.08em',
      },
      maxWidth: {
        content: '720px',
      },
    },
  },
  plugins: [],
};
