/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        base: '#1a1a2e',
        surface: '#16213e',
        accent: '#00d4aa',
      },
      keyframes: {
        'screen-in': {
          '0%': { opacity: 0, transform: 'translateX(16px)' },
          '100%': { opacity: 1, transform: 'translateX(0)' },
        },
        'fade-in': {
          '0%': { opacity: 0, transform: 'translateY(8px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        'toast-in': {
          '0%': { opacity: 0, transform: 'translate(-50%, 12px)' },
          '100%': { opacity: 1, transform: 'translate(-50%, 0)' },
        },
      },
      animation: {
        'screen-in': 'screen-in 0.25s ease-out',
        'fade-in': 'fade-in 0.35s ease-out',
        'toast-in': 'toast-in 0.25s ease-out',
      },
    },
  },
  plugins: [],
}
