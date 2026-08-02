/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // ─── Background layers ─────────────────────────────
        bg:        '#F4F5F7',   // page canvas (light warm gray)
        card:      '#FFFFFF',   // card surface
        'card-2':  '#F9F9FB',   // nested / secondary card
        overlay:   'rgba(0,0,0,0.38)', // image overlay

        // ─── Ink (text) ────────────────────────────────────
        ink:       '#111827',   // primary text (gray-900)
        'ink-2':   '#6B7280',   // secondary (gray-500)
        'ink-3':   '#9CA3AF',   // muted (gray-400)
        'ink-4':   '#D1D5DB',   // disabled / placeholder

        // ─── Brand ────────────────────────────────────────
        brand:     '#111827',   // dark — premium minimal
        'brand-2': '#374151',
        accent:    '#2563EB',   // blue for interactive
        'accent-soft': '#DBEAFE',

        // ─── Borders / Lines ──────────────────────────────
        border:    '#E5E7EB',   // gray-200
        'border-2':'#F3F4F6',   // gray-100

        // ─── Verdict ──────────────────────────────────────
        danger:       '#EF4444',
        'danger-soft':'#FEF2F2',
        'danger-ink': '#7F1D1D',

        warn:         '#F59E0B',
        'warn-soft':  '#FFFBEB',
        'warn-ink':   '#78350F',

        ok:           '#10B981',
        'ok-soft':    '#ECFDF5',
        'ok-ink':     '#064E3B',
      },

      borderRadius: {
        xs:   '6px',
        sm:   '10px',
        md:   '14px',
        lg:   '18px',
        xl:   '22px',
        '2xl':'28px',
        '3xl':'36px',
        full: '9999px',
      },

      fontFamily: {
        display: ['BaiJamjuree_600SemiBold'],
        thai:    ['NotoSansThai_400Regular'],
        mono:    ['IBMPlexMono_500Medium'],
        sans:    ['Inter_400Regular'],
      },
    },
  },
  plugins: [],
};
