/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2c51a2',
          navy: '#2C51A2',
          dark: '#1E3B78',
          blue: '#2C51A2',
          interactive: '#2C51A2',
          light: '#E2E9F4',
          subtle: '#F3F6FB',
          50: '#F0F4FA',
          100: '#DCE5F4',
          200: '#BCD0EC',
          300: '#91B3E1',
          400: '#5F90D2',
          500: '#2C51A2',
          600: '#264690',
          700: '#203977',
          800: '#1D3262',
          900: '#1C2C52',
          950: '#121C35',
        },
        surface: {
          light: '#F3F6FB',
          secondary: '#E2E9F4',
          card: '#FFFFFF',
        },
        content: {
          primary: '#172B4D',
          secondary: '#64748B',
        },
        state: {
          border: '#E2E8F0',
          success: '#2C51A2',
          warning: '#D97706',
          error: '#DC2626',
        }
      },
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
      },
      spacing: {
        '4.5': '1.125rem',
      },
      borderRadius: {
        none: '0px',
        sm: '0.25rem',
        DEFAULT: '0.375rem',
        md: '0.375rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        full: '9999px',
      }
    },
  },
  plugins: [],
}
