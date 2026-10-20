/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        szuru: {
          bg: '#0c0d14',
          card: '#151722',
          border: '#222538',
          accent: '#ec4899', // modern hot pink reel style
          secondary: '#8b5cf6',
          cyan: '#06b6d4',
          amber: '#f59e0b',
          emerald: '#10b981',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'ping-once': 'ping 0.8s cubic-bezier(0, 0, 0.2, 1) 1 forwards',
        'fade-in': 'fadeIn 0.2s ease-out forwards',
        'bounce-subtle': 'bounceSubtle 1.5s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
    },
  },
  plugins: [],
};
