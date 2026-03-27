import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#7B5A4B',      // Brun Cannelle
        secondary: '#374151',    // Gris Ardoise
        background: '#FAF9F6',   // Papier Crème
        card: '#FFFFFF',         // Blanc Pur
        success: '#4CAF50',      // Vert Olive Clair
        error: '#D32F2F',        // Rouge Doux
        warning: '#FFC107',      // Jaune Moutarde
        disabled: '#D1D5DB',     // Gris Clair
        badge: '#E5DFDA',        // Fond badge
      },
      fontFamily: {
        playfair: ['Playfair Display', 'serif'],
        inter: ['Inter', 'sans-serif'],
        amiri: ['Amiri', 'serif'],
      },
    },
  },
  plugins: [],
};
export default config;
