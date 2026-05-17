import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Couleurs du thème Tafsir
        primary: '#1e5a8a',      // Bleu principal (titres, bandeaux)
        secondary: '#2b7cb5',    // Bleu secondaire
        accent: '#c9a227',       // Or/Doré pour accents
        cream: '#f5f0e6',        // Fond crème
        'light-blue': '#e8f4fc', // Fond bleu clair (encadrés)
      },
      fontFamily: {
        'playfair': ['Playfair Display', 'serif'],
        'inter': ['Inter', 'sans-serif'],
        'amiri': ['Amiri', 'serif'],
        'scheherazade': ['Scheherazade New', 'serif'],
      },
      spacing: {
        'page': '297mm',    // A4 height
        'page-w': '210mm',  // A4 width
      },
    },
  },
  plugins: [],
}

export default config
