export type Theme = 'dark' | 'light';

export interface Colors {
  bg: string;
  surface: string;
  surface2: string;
  surface3: string;
  ink: string;
  ink2: string;
  ink3: string;
  ink4: string;
  amber: string;
  amberDark: string;
  amberSoft: string;
  amberGlow: string;
  border: string;
  border2: string;
  danger: string;
  dangerBg: string;
  dangerBorder: string;
  warn: string;
  warnBg: string;
  ok: string;
  okBg: string;
  okBorder: string;
  blue: string;
  blueBg: string;
  purple: string;
  navBg: string;
  navBorder: string;
}

// Warm peach / terracotta "smart-home" palette — white cards, burnt-orange accent.
export const LIGHT: Colors = {
  bg:          '#F3D8BC',
  surface:     '#FFFFFF',
  surface2:    '#FBF1E6',
  surface3:    '#F5E6D3',
  ink:         '#211C2B',
  ink2:        '#6B6477',
  ink3:        '#756D82',   // WCAG AA-safe muted tone (4.9:1 on white, 3.6:1 on peach bg)
  ink4:        '#D8CFDE',
  amber:       '#E07A3F',   // primary accent — burnt orange (icons/text-on-white, not button fills)
  amberDark:   '#C6672F',   // solid-fill buttons — white text on `amber` only hits 2.99:1 contrast
  amberSoft:   'rgba(224,122,63,0.10)',
  amberGlow:   'rgba(224,122,63,0.10)',
  border:      '#EAD9C4',
  border2:     '#F2E6D6',
  danger:      '#EF4444',
  dangerBg:    '#FEF2F2',
  dangerBorder:'rgba(239,68,68,0.25)',
  warn:        '#D97706',
  warnBg:      '#FFFBEB',
  ok:          '#059669',
  okBg:        '#ECFDF5',
  okBorder:    'rgba(5,150,105,0.25)',
  blue:        '#2563EB',
  blueBg:      '#EFF6FF',
  purple:      '#7C3AED',
  navBg:       '#FFFFFF',
  navBorder:   '#EAD9C4',
};

export const DARK: Colors = {
  bg:          '#1E1923',
  surface:     '#28222F',
  surface2:    '#322B3B',
  surface3:    '#3C3447',
  ink:         '#F8EFE5',
  ink2:        'rgba(248,239,229,0.58)',
  ink3:        'rgba(248,239,229,0.55)', // was 0.32 — too low contrast (~2.7:1); 0.55 clears AA
  ink4:        'rgba(248,239,229,0.16)',
  amber:       '#EC8E5C',   // primary accent — warm orange (lighter for dark bg)
  amberDark:   '#C6672F',   // solid-fill buttons — white text on `amber` only hits 2.44:1 contrast
  amberSoft:   'rgba(236,142,92,0.12)',
  amberGlow:   'rgba(236,142,92,0.08)',
  border:      'rgba(236,142,92,0.16)',
  border2:     'rgba(248,239,229,0.06)',
  danger:      '#F87171',
  dangerBg:    'rgba(248,113,113,0.10)',
  dangerBorder:'rgba(248,113,113,0.25)',
  warn:        '#FBBF24',
  warnBg:      'rgba(251,191,36,0.10)',
  ok:          '#34D399',
  okBg:        'rgba(52,211,153,0.10)',
  okBorder:    'rgba(52,211,153,0.25)',
  blue:        '#60A5FA',
  blueBg:      'rgba(96,165,250,0.10)',
  purple:      '#C084FC',
  navBg:       '#221C29',
  navBorder:   'rgba(236,142,92,0.18)',
};

export function getColors(theme: Theme): Colors {
  return theme === 'dark' ? DARK : LIGHT;
}
