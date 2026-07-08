// Small hand-rolled SVG icon set — vector, not emoji, so it renders consistently
// and can be themed with currentColor (per the "no emoji as icons" UX guideline).
type IconProps = { size?: number; color?: string };
const base = (size = 16, color = 'currentColor') => ({
  width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
  stroke: color, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
});

export function CameraIcon({ size, color }: IconProps) {
  return (
    <svg {...base(size, color)}>
      <path d="M4 8h3l2-2h6l2 2h3v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8Z" />
      <circle cx="12" cy="13.5" r="3.5" />
    </svg>
  );
}

export function FileTextIcon({ size, color }: IconProps) {
  return (
    <svg {...base(size, color)}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M8 13h8M8 17h5" />
    </svg>
  );
}

export function ScaleIcon({ size, color }: IconProps) {
  return (
    <svg {...base(size, color)}>
      <path d="M12 3v18M7 21h10" />
      <path d="M4 7l4-2 4 2M4 7l-2 6a3 3 0 0 0 4 0Z" />
      <path d="M16 7l4-2 4 2M16 7l-2 6a3 3 0 0 0 4 0Z" transform="translate(-2 0)" />
    </svg>
  );
}

export function StackIcon({ size, color }: IconProps) {
  return (
    <svg {...base(size, color)}>
      <path d="M12 2 2 7l10 5 10-5-10-5Z" />
      <path d="M2 12l10 5 10-5" />
      <path d="M2 17l10 5 10-5" />
    </svg>
  );
}

export function LockIcon({ size, color }: IconProps) {
  return (
    <svg {...base(size, color)}>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
