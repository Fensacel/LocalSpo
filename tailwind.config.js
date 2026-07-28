/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0B0B0D',
          surface: '#131313',
          card: '#151518',
          subtle: '#1C1B1B',
          high: '#201F1F',
        },
        primary: {
          DEFAULT: '#0070F3',
          hover: '#1B82FF',
          light: '#3B82F6',
          glow: 'rgba(0, 112, 243, 0.4)',
        },
        accent: '#3B82F6',
        text: {
          DEFAULT: '#E5E2E1',
          secondary: '#9CA3AF',
          muted: '#8B90A0',
        },
        border: {
          DEFAULT: 'rgba(255, 255, 255, 0.05)',
          subtle: '#222222',
          strong: '#E2E2E2',
        },
        danger: '#FFB4AB',
        success: '#22C55E',
        warning: '#FACC15',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        card: '16px',
        button: '8px',
        cover: '16px',
      },
      backdropBlur: {
        glass: '30px',
        heavy: '80px',
      },
      animation: {
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'spin-slow': 'spin 20s linear infinite',
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'slide-in-right': 'slide-in-right 0.25s ease-out',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0, 112, 243, 0.2)' },
          '50%': { boxShadow: '0 0 40px rgba(0, 112, 243, 0.4)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(20px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
      },
      boxShadow: {
        glow: '0 0 25px rgba(0, 112, 243, 0.35)',
        'glow-lg': '0 0 45px rgba(0, 112, 243, 0.45)',
        glass: '0 8px 32px rgba(0,0,0,0.6)',
      },
    },
  },
  plugins: [],
};
