import { ActivityIndicator, Pressable, Text, View } from 'react-native';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const VARIANT_STYLES: Record<Variant, { bg: string; text: string; border?: string }> = {
  primary:   { bg: 'bg-brand',          text: 'text-white' },
  secondary: { bg: 'bg-surface',        text: 'text-ink',   border: 'border border-line' },
  ghost:     { bg: 'bg-transparent',    text: 'text-brand' },
  danger:    { bg: 'bg-danger',         text: 'text-white' },
};

const SIZE_STYLES: Record<Size, { padding: string; text: string; radius: string; minH: number }> = {
  sm: { padding: 'px-4 py-2.5',  text: 'text-btn-sm', radius: 'rounded-lg',  minH: 36 },
  md: { padding: 'px-5 py-3.5',  text: 'text-btn',    radius: 'rounded-xl',  minH: 48 },
  lg: { padding: 'px-6 py-4',    text: 'text-btn',    radius: 'rounded-xl',  minH: 56 },
};

export function PrimaryButton({
  title, onPress, disabled = false, loading = false,
  variant = 'primary', size = 'lg', fullWidth = true,
  leftIcon, rightIcon,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}) {
  const isDisabled = disabled || loading;
  const v = VARIANT_STYLES[variant];
  const s = SIZE_STYLES[size];

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      hitSlop={8}
      className={`
        ${fullWidth ? 'w-full' : 'self-start'}
        ${s.padding} ${s.radius} ${v.bg} ${v.border ?? ''}
        flex-row items-center justify-center gap-2
        ${isDisabled ? 'opacity-40' : 'active:opacity-80'}
      `}
      style={{ minHeight: s.minH }}
    >
      {loading
        ? <ActivityIndicator size="small" color={variant === 'primary' || variant === 'danger' ? '#fff' : '#0057FF'} />
        : leftIcon}
      <Text className={`${s.text} ${v.text} font-semibold`}>{title}</Text>
      {!loading && rightIcon}
    </Pressable>
  );
}
