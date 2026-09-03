/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        neon: { green: '#00ff88', purple: '#7c3aed', blue: '#0ea5e9' },
        dark: { 900: '#0a0a0f', 800: '#0f0f18', 700: '#141420', 600: '#1a1a2e', 500: '#232340' },
      },
      fontFamily: { space: ['Space Grotesk', 'sans-serif'], inter: ['Inter', 'sans-serif'] },
      animation: {
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'slide-ticker': 'slideTicker 30s linear infinite',
        'spin-number': 'spinNumber 0.3s ease-out',
        'gradient-x': 'gradientX 3s ease infinite',
      },
      keyframes: {
        glowPulse: { '0%,100%': { boxShadow: '0 0 5px #00ff88, 0 0 10px #00ff88' }, '50%': { boxShadow: '0 0 20px #00ff88, 0 0 40px #00ff88, 0 0 60px #00ff88' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        slideTicker: { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
        spinNumber: { '0%': { transform: 'translateY(-100%)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        gradientX: { '0%,100%': { backgroundPosition: '0% 50%' }, '50%': { backgroundPosition: '100% 50%' } },
      },
      backdropBlur: { xs: '2px' },
    },
  },
  plugins: [],
}
