/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Apple system colors
        primary: '#007AFF',
        'primary-soft': '#E5F1FF',
        'primary-dark': '#0055B3',

        // Verdicts
        lawful: '#34C759',
        'lawful-soft': '#E9F8EE',
        'lawful-dark': '#1A6B30',
        disputed: '#FF9500',
        'disputed-soft': '#FFF4E5',
        'disputed-dark': '#7A4800',
        unlawful: '#FF3B30',
        'unlawful-soft': '#FFE5E3',
        'unlawful-dark': '#8B0000',

        // Surface system (Apple HIG)
        'label': '#000000',
        'label-secondary': '#8E8E93',
        'label-tertiary': '#C7C7CC',
        'label-quaternary': '#D1D1D6',
        'bg': '#F2F2F7',
        'bg-secondary': '#FFFFFF',
        'bg-tertiary': '#F2F2F7',
        'separator': '#C6C6C8',
        'separator-opaque': '#E5E5EA',
        'navy': '#1C1C1E',

        // Legacy compat
        'surface-navy': '#1C1C1E',
        'surface-card': '#FFFFFF',
        'surface-bg': '#F2F2F7',
        border: '#E5E5EA',
      },
      borderRadius: {
        xs: '6px',
        sm: '10px',
        md: '13px',
        lg: '16px',
        xl: '20px',
      },
      fontFamily: {
        display: ['BaiJamjuree_600SemiBold'],
        thai: ['NotoSansThai_400Regular'],
        mono: ['IBMPlexMono_500Medium'],
        body: ['Inter_400Regular'],
      },
    },
  },
  plugins: [],
};
