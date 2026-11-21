/** Jayvelski-skill tokens for Tailwind 3 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#19171b',
        navy: '#0c152a',
        muted: '#6b6c71',
        night: '#121113',
        card: '#e8e8ec',
        render: '#edeced',
        blue: { start: '#1935d9', end: '#2f2be2', border: '#1f34c9' },
        cool: '#818a94',
      },
      fontFamily: {
        sans: ['Geist', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        serif: ['"Instrument Serif"', 'serif'],
      },
      borderRadius: { md: '10px', lg: '16px', xl: '24px' },
      boxShadow: {
        card: '0 1px 2px rgba(14,15,43,.08), 0 43px 80px rgba(66,39,92,.02)',
        photo:
          '0 70px 109px -10px rgba(88,92,95,.08), 0 0 0 1px rgba(51,51,51,.04), 0 1px 1px 1px rgba(51,51,51,.04), 0 15px 15px -7px rgba(51,51,51,.04), 0 60px 60px -30px rgba(51,51,51,.04)',
        'blue-inset': 'inset 0 1px 4px #2a3edc, inset 0 4px 16px rgba(255,255,255,.2)',
      },
      transitionTimingFunction: { expo: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    },
  },
  plugins: [],
}
