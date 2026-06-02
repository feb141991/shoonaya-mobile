/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#C5A059',
        },
        ink: '#1A0F00',
        cream: '#FDF6E3',
        divine: {
          dark: '#0E0804',
        },
      },
      fontFamily: {
        serif: ['CormorantGaramond_600SemiBold', 'serif'],
        sans: ['Inter_400Regular', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
