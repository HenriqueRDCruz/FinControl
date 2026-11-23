/** @type {import('tailwindcss').Config} */
// Identidade "cédula": tinta ultramar, turquesa (entradas), coral (saídas) e ouro (patrimônio).
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-body)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
      },
      borderRadius: {
        md: '0.625rem',
        lg: '0.875rem',
        xl: '1.125rem',
        '2xl': '1.5rem',
      },
      colors: {
        // cinzas com um fio de tinta azul (usados em texto, bordas e superfícies)
        neutral: {
          50: '#F6F7FB', 100: '#ECEEF6', 200: '#DDE0EE', 300: '#C5CADF', 400: '#8E95B8',
          500: '#5D6491', 600: '#474E7A', 700: '#333962', 800: '#222750', 900: '#161A47', 950: '#0E1036',
        },
        // ultramar: cor de marca, links e ações principais
        indigo: {
          50: '#EEF0FF', 100: '#E1E5FF', 200: '#C5CCFF', 300: '#A0AAFF', 400: '#7480F7',
          500: '#4F5BEA', 600: '#3643D6', 700: '#2B35B0', 800: '#232C8A', 900: '#1B2266', 950: '#12163F',
        },
        blue: {
          50: '#EEF0FF', 100: '#E1E5FF', 200: '#C5CCFF', 300: '#A0AAFF', 400: '#7480F7',
          500: '#4F5BEA', 600: '#3643D6', 700: '#2B35B0', 800: '#232C8A', 900: '#1B2266', 950: '#12163F',
        },
        // turquesa: entradas, saldo positivo
        emerald: {
          50: '#E7FAF6', 100: '#C8F3EB', 200: '#97E7D9', 300: '#5FD6C4', 400: '#2DC2AE',
          500: '#14A896', 600: '#0B8577', 700: '#09685E', 800: '#0A524B', 900: '#0A433E', 950: '#04272A',
        },
        // coral: saídas, alertas e erros
        red: {
          50: '#FFF2EF', 100: '#FFE1DB', 200: '#FFC4B9', 300: '#FF9E8E', 400: '#FF7A66',
          500: '#F25A44', 600: '#C9341F', 700: '#A32818', 800: '#7E2116', 900: '#5C1A12', 950: '#3A0F0A',
        },
        // ouro: investimentos e patrimônio
        gold: {
          50: '#FFF8E6', 100: '#FFEEC2', 200: '#FFDD85', 300: '#FFC947', 400: '#F5B318',
          500: '#D99A0B', 600: '#B07808',
        },
      },
    },
  },
  plugins: [],
};
