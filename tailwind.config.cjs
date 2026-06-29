/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          500: '#4f46e5',
          600: '#4338ca',
        },
        ding: {
          50: '#EFF8FF',
          100: '#DBEEFF',
          200: '#B8DCFF',
          400: '#4DA6FF',
          500: '#1E90FF',
          600: '#1878DB',
          700: '#1565A8',
          800: '#0F4C7A',
        },
        wechat: {
          bubble: '#95EC69',
          chat: '#EDEDED',
        },
      },
    },
  },
  plugins: [],
};
