/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter var', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        emerald: { brand: '#0C5847' },
      },
      animation: {
        marquee: 'marquee 30s linear infinite',
        blink: 'blink 0.9s step-end infinite',
        thinking: 'thinking 1.4s ease-in-out infinite',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        blink: {
          '0%,100%': { opacity: 1 },
          '50%': { opacity: 0 },
        },
        thinking: {
          '0%,100%': { transform: 'translateY(0)', opacity: 0.4 },
          '50%': { transform: 'translateY(-5px)', opacity: 1 },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
