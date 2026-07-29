/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        base: '#122544',
        surface: '#1c4d7a',
        accent: '#5ed4ec',
        'ocean-abyss': '#10176e',
        'ocean-deep': '#1f90c8',
        'ocean-mid': '#22c3e4',
        'ocean-pale': '#a8e8f3',
      },
      keyframes: {
        'screen-in': {
          '0%': { opacity: 0, transform: 'translateY(10px) scale(0.99)' },
          '100%': { opacity: 1, transform: 'translateY(0) scale(1)' },
        },
        'fade-in': {
          '0%': { opacity: 0, transform: 'translateY(8px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        'toast-in': {
          '0%': { opacity: 0, transform: 'translate(-50%, 12px)' },
          '100%': { opacity: 1, transform: 'translate(-50%, 0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: 0.55 },
          '50%': { opacity: 1 },
        },
        'wave-drift': {
          '0%, 100%': { transform: 'translateX(0)' },
          '50%': { transform: 'translateX(-4%)' },
        },
        reveal: {
          '0%': { opacity: 0, filter: 'blur(6px)' },
          '100%': { opacity: 1, filter: 'blur(0px)' },
        },
      },
      animation: {
        'screen-in': 'screen-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fade-in 0.4s ease-out both',
        'toast-in': 'toast-in 0.25s ease-out',
        float: 'float 4.5s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
        'wave-drift': 'wave-drift 8s ease-in-out infinite',
        reveal: 'reveal 0.35s ease-out both',
      },
    },
  },
  plugins: [],
}
