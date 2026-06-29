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

export const DARK: Colors = {
  bg:          '#0C0A07',
  surface:     '#181410',
  surface2:    '#221C10',
  surface3:    '#2C2412',
  ink:         '#FAF8F5',
  ink2:        'rgba(250,248,245,0.55)',
  ink3:        'rgba(250,248,245,0.30)',
  ink4:        'rgba(250,248,245,0.15)',
  amber:       '#F59E0B',
  amberSoft:   'rgba(245,158,11,0.10)',
  amberGlow:   'rgba(245,158,11,0.06)',
  border:      'rgba(245,158,11,0.14)',
  border2:     'rgba(250,248,245,0.06)',
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
  navBg:       '#0E0B07',
  navBorder:   'rgba(245,158,11,0.18)',
};

export const LIGHT: Colors = {
  bg:          '#F5F5F7',
  surface:     '#FFFFFF',
  surface2:    '#F0F0F3',
  surface3:    '#E8E8EB',
  ink:         '#111827',
  ink2:        '#6B7280',
  ink3:        '#9CA3AF',
  ink4:        '#D1D5DB',
  amber:       '#D97706',
  amberSoft:   'rgba(217,119,6,0.08)',
  amberGlow:   'rgba(217,119,6,0.04)',
  border:      '#E5E7EB',
  border2:     '#F3F4F6',
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
  navBorder:   '#E5E7EB',
};

export function getColors(theme: Theme): Colors {
  return theme === 'dark' ? DARK : LIGHT;
}
