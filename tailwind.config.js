module.exports = {
  content: ["./public/**/*.html", "./public/**/*.js"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        display: ['Manrope', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SF Mono', 'Menlo', 'monospace'],
      },
      colors: {
        canvas: '#FAFAF8',
        panel: '#FFFFFF',
        border: '#E7E5E0',
        ink: '#1C1B19',
        sub: '#6B6862',
        faint: '#A19D95',
        sidebar: '#FBFAF7',
        // CSM: deep navy, steady/international B2B feel
        csm: { 50: '#EEF1F8', 100: '#DCE2F1', 600: '#3B4C8C', 700: '#2E3C6E' },
        // Sondrik: warm terracotta, consumer product energy
        sondrik: { 50: '#FBF0E8', 100: '#F5DFCC', 600: '#C2703D', 700: '#9C5A30' },
      }
    }
  },
  safelist: [
    { pattern: /bg-(csm|sondrik|amber|emerald|red|zinc)-(50|100|600|700)/ },
    { pattern: /text-(csm|sondrik|amber|emerald|red|zinc)-(50|600|700)/ },
    { pattern: /border-(csm|sondrik)-(100|600)/ },
  ]
}
