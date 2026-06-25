/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border: '#E2E8F0',
        foreground: '#0F172A',
        background: '#F8FAFC',
        primary: {
          DEFAULT: '#FF6B35',
          foreground: '#FFFFFF',
          50: '#FFF5F0',
          100: '#FFE8DB',
          200: '#FFCEAD',
          300: '#FFAD7A',
          400: '#FF8C5A',
          500: '#FF6B35',
          600: '#E55A2B',
          700: '#C44820',
          800: '#9E3A1C',
          900: '#7E311A',
        },
        secondary: {
          DEFAULT: '#2EC4B6',
          foreground: '#FFFFFF',
          50: '#F0FAFB',
          100: '#D5F4F2',
          200: '#A9E9E5',
          300: '#5DD9CD',
          400: '#2EC4B6',
          500: '#1A9C8F',
          600: '#147C72',
          700: '#12635C',
          800: '#134E49',
          900: '#13413D',
        },
        destructive: {
          DEFAULT: '#EF4444',
          foreground: '#FFFFFF',
        },
        muted: {
          DEFAULT: '#F1F5F9',
          foreground: '#64748B',
        },
        accent: {
          DEFAULT: '#FFB703',
          foreground: '#1E293B',
        },
        success: {
          DEFAULT: '#10B981',
          foreground: '#FFFFFF',
        },
        warning: {
          DEFAULT: '#F59E0B',
          foreground: '#FFFFFF',
        },
        info: {
          DEFAULT: '#2EC4B6',
          foreground: '#FFFFFF',
        },
        popover: {
          DEFAULT: '#FFFFFF',
          foreground: '#0F172A',
        },
        card: {
          DEFAULT: '#FFFFFF',
          foreground: '#0F172A',
        },
      },
      borderRadius: {
        lg: '0.75rem',
        md: '0.625rem',
        sm: '0.5rem',
        xl: '1rem',
        '2xl': '1.25rem',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'PingFang SC', 'Microsoft YaHei', 'Segoe UI', 'sans-serif'],
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        'slide-in-right': {
          from: { transform: 'translateX(100%)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'fade-in-up': 'fade-in-up 0.4s ease-out',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        shimmer: 'shimmer 1.5s infinite',
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(255, 107, 53, 0.08)',
        'glow': '0 0 24px rgba(255, 107, 53, 0.25)',
        'card': '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
        'card-hover': '0 4px 16px rgba(0,0,0,0.08)',
        'button': '0 2px 8px rgba(255, 107, 53, 0.25)',
        'button-hover': '0 4px 16px rgba(255, 107, 53, 0.35)',
      },
    },
  },
  plugins: [],
};
