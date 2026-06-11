module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#0a0f1a',
          800: '#111827',
          700: '#1f2937',
        },
        emerald: {
          500: '#10b981',
          600: '#059669',
        }
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
