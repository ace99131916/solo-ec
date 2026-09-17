/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#141210',
          900: '#1A1817',
          800: '#262322',
          700: '#3A3532',
        },
        cream: {
          50: '#FAF8F5',
          100: '#F4EFE8',
          200: '#E9E0D3',
        },
        gold: {
          50: '#FBF6EC',
          100: '#F4E8D0',
          200: '#E7D1A4',
          300: '#D8B878',
          400: '#C6A05E',
          500: '#B08D57',
          600: '#96733F',
          700: '#775A32',
        },
      },
      fontFamily: {
        serif: ['"Noto Serif TC"', '"Songti TC"', 'serif'],
        sans: ['"Noto Sans TC"', '"PingFang TC"', '"Microsoft JhengHei"', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(20,18,16,0.04), 0 8px 24px -12px rgba(20,18,16,0.18)',
        lift: '0 2px 4px rgba(20,18,16,0.06), 0 20px 44px -16px rgba(20,18,16,0.28)',
      },
      keyframes: {
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.7s cubic-bezier(0.22,1,0.36,1) both',
      },
    },
  },
  plugins: [],
};
