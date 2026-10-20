/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // MEDIANA BI palette
        brand: {
          navy: '#113577',
          blue: '#2898FF',
          cyan: '#28CBFF',
          green: '#A8FF31',
          yellow: '#FFE145',
          red: '#FF5B5B',
          dark: '#3C3C3C',
          gray: '#969696',
          light: '#EBEBEB',
        },
      },
      fontFamily: {
        sans: ['Manrope', 'Pretendard', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
