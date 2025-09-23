import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // Paleta de Colores Consolidada - Poker Enfermos
      colors: {
        // Colores Principales del Proyecto
        'poker-red': {
          DEFAULT: '#E50914', // Rojo principal
          50: '#FFF5F5',
          100: '#FED7D7',
          200: '#FEB2B2',
          300: '#FC8181',
          400: '#F56565',
          500: '#E50914',
          600: '#B30500',
          700: '#9B2C2C',
          800: '#822727',
          900: '#742A2A',
          950: '#451A1A',
        },
        'poker-dark': {
          DEFAULT: '#1B1B1B', // Gris oscuro base
          light: '#2A2A2A',   // Gris carbón
          50: '#F7F7F7',
          100: '#E1E1E1',
          200: '#CFCFCF',
          300: '#B1B1B1',
          400: '#9E9E9E',
          500: '#7E7E7E',
          600: '#626262',
          700: '#515151',
          800: '#3B3B3B',
          900: '#2A2A2A',
          950: '#1B1B1B',
        },
        'poker-gold': {
          DEFAULT: '#FFD700', // Dorado
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#FFD700',
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
          950: '#451A03',
        },
        'poker-blue': {
          DEFAULT: '#1E90FF', // Azul eléctrico
          50: '#EBF8FF',
          100: '#BEE3F8',
          200: '#90CDF4',
          300: '#63B3ED',
          400: '#4299E1',
          500: '#1E90FF',
          600: '#2B77E6',
          700: '#2C5282',
          800: '#2A4365',
          900: '#1A365D',
          950: '#0A1929',
        },
        'poker-orange': {
          DEFAULT: '#FF8C00', // Naranja
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: '#FF8C00',
          600: '#EA580C',
          700: '#C2410C',
          800: '#9A3412',
          900: '#7C2D12',
          950: '#431407',
        },
        // Colores para posiciones
        'gold': '#FFD700',
        'silver': '#C0C0C0',
        'bronze': '#CD7F32',
        // Color base
        'white': '#FFFFFF',
        // Semantic mappings
        primary: '#E50914',
        secondary: '#FF8C00',
        accent: '#1E90FF',
        background: '#1B1B1B',
        surface: '#2A2A2A',
        'surface-elevated': '#3B3B3B',
      },
      // Typography system - Optimizado para +50 años
      fontFamily: {
        'sans': ['Inter', 'Montserrat', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      fontSize: {
        // Tamaños grandes con alto contraste
        'xs': ['0.875rem', { lineHeight: '1.6', fontWeight: '600' }],  // Mínimo 14px
        'sm': ['1rem', { lineHeight: '1.6', fontWeight: '600' }],      // 16px
        'base': ['1.125rem', { lineHeight: '1.6', fontWeight: '600' }], // 18px
        'lg': ['1.25rem', { lineHeight: '1.5', fontWeight: '700' }],   // 20px
        'xl': ['1.5rem', { lineHeight: '1.4', fontWeight: '700' }],    // 24px
        '2xl': ['1.875rem', { lineHeight: '1.3', fontWeight: '800' }], // 30px
        '3xl': ['2.25rem', { lineHeight: '1.2', fontWeight: '800' }],  // 36px
        '4xl': ['3rem', { lineHeight: '1.1', fontWeight: '900' }],     // 48px
        // Nombres semánticos
        'body': ['1.125rem', { lineHeight: '1.6', fontWeight: '600' }],
        'body-lg': ['1.25rem', { lineHeight: '1.5', fontWeight: '600' }],
        'heading': ['1.5rem', { lineHeight: '1.4', fontWeight: '700' }],
        'display': ['2.25rem', { lineHeight: '1.2', fontWeight: '800' }],
      },
      // Spacing system
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      // Border radius system
      borderRadius: {
        'poker': '0.625rem', // 10px - main radius
        'poker-sm': '0.375rem', // 6px
        'poker-lg': '0.875rem', // 14px
        'poker-xl': '1.25rem', // 20px
      },
      // Sombras y Glow Effects - Mesa de Póker
      boxShadow: {
        // Sombras difusas para volumen
        'poker-diffuse': '0 8px 32px rgba(0, 0, 0, 0.6), 0 4px 16px rgba(0, 0, 0, 0.4)',
        'poker-card': '0 4px 20px rgba(0, 0, 0, 0.5), 0 2px 8px rgba(0, 0, 0, 0.3)',
        // Glow suave para elementos importantes (Top 3, botones principales)
        'glow-gold': '0 0 20px rgba(255, 215, 0, 0.6), 0 0 40px rgba(255, 215, 0, 0.4), 0 4px 20px rgba(0, 0, 0, 0.3)',
        'glow-silver': '0 0 20px rgba(192, 192, 192, 0.6), 0 0 40px rgba(192, 192, 192, 0.4), 0 4px 20px rgba(0, 0, 0, 0.3)',
        'glow-bronze': '0 0 20px rgba(205, 127, 50, 0.6), 0 0 40px rgba(205, 127, 50, 0.4), 0 4px 20px rgba(0, 0, 0, 0.3)',
        'glow-red': '0 0 20px rgba(229, 9, 20, 0.6), 0 0 40px rgba(229, 9, 20, 0.4), 0 4px 20px rgba(0, 0, 0, 0.3)',
        // Sombras estándar
        'sm': '0 2px 8px rgba(0, 0, 0, 0.3)',
        'DEFAULT': '0 4px 16px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.2)',
        'lg': '0 8px 32px rgba(0, 0, 0, 0.5), 0 4px 16px rgba(0, 0, 0, 0.3)',
        'xl': '0 16px 64px rgba(0, 0, 0, 0.6), 0 8px 32px rgba(0, 0, 0, 0.4)',
        // Inner shadows
        'inner': 'inset 0 2px 4px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      },
      // Animation system
      animation: {
        'poker-enter': 'pokerEnter 0.3s ease-out',
        'poker-stagger': 'pokerEnter 0.3s ease-out backwards',
        'poker-pulse': 'pokerPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'poker-ping': 'pokerPing 1s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
      keyframes: {
        pokerEnter: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pokerPulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7', transform: 'scale(1.05)' },
        },
        pokerPing: {
          '75%, 100%': { transform: 'scale(2)', opacity: '0' },
        },
      },
      // Gradient system - Texturas de Mesa de Póker
      backgroundImage: {
        // Fondo general gris carbón texturizado
        'poker-table': 'radial-gradient(ellipse at center, #2A2A2A 0%, #1B1B1B 70%, #0A0A0A 100%)',
        'poker-card': 'linear-gradient(145deg, #2A2A2A 0%, #1B1B1B 50%, #171717 100%)',
        // Botones principales con gradientes
        'poker-button': 'linear-gradient(135deg, #E50914 0%, #B30500 50%, #822727 100%)',
        'poker-admin': 'linear-gradient(135deg, #E50914 0%, #FF8C00 50%, #FFD700 100%)',
        // Metales con efectos realistas
        'gold-gradient': 'linear-gradient(135deg, #FFD700 0%, #FFC107 30%, #FFB300 70%, #FF8F00 100%)',
        'silver-gradient': 'linear-gradient(135deg, #E8E8E8 0%, #C0C0C0 30%, #A8A8A8 70%, #909090 100%)',
        'bronze-gradient': 'linear-gradient(135deg, #CD7F32 0%, #B8860B 30%, #A0522D 70%, #8B4513 100%)',
        // Efectos especiales
        'glow-overlay': 'radial-gradient(circle at center, rgba(255, 255, 255, 0.1) 0%, transparent 70%)',
      },
      // Scale transforms
      scale: {
        '98': '0.98',
        '102': '1.02',
      },
      // Z-index system
      zIndex: {
        'tooltip': '9999',
        'modal': '1000',
        'dropdown': '100',
        'sticky': '10',
      },
    },
  },
  plugins: [],
}

export default config