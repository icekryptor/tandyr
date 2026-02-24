/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#E8564A',
        'primary-dark': '#C94438',
        'primary-light': '#F5837A',
        accent: '#3B82F6',
        'accent-dark': '#2563EB',
        background: '#F9FAFB',
        surface: '#FFFFFF',
        muted: '#6B7280',
        border: '#E5E7EB',
        destructive: '#EF4444',
        success: '#22C55E',
      },
      fontFamily: {
        manrope: ['Manrope_400Regular'],
        'manrope-medium': ['Manrope_500Medium'],
        'manrope-semibold': ['Manrope_600SemiBold'],
        'manrope-bold': ['Manrope_700Bold'],
        'manrope-extrabold': ['Manrope_800ExtraBold'],
      },
    },
  },
  plugins: [],
};
