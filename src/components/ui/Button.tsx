import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'dark';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  /** Stretches the button to the parent width. */
  fullWidth?: boolean;
  className?: string;
  /** Small caption rendered under the label (used for totals). */
  hint?: string;
}

const containerByVariant: Record<ButtonVariant, string> = {
  primary: 'bg-brand-accent',
  secondary: 'bg-brand-primary',
  outline: 'bg-white border border-brand-primary',
  ghost: 'bg-brand-primary/10',
  danger: 'bg-red-600',
  dark: 'bg-white/10 border border-white/25',
};

const labelByVariant: Record<ButtonVariant, string> = {
  primary: 'text-brand-dark',
  secondary: 'text-white',
  outline: 'text-brand-primary',
  ghost: 'text-brand-primary',
  danger: 'text-white',
  dark: 'text-white',
};

const iconColorByVariant: Record<ButtonVariant, string> = {
  primary: '#253213',
  secondary: '#FFFFFF',
  outline: '#536E27',
  ghost: '#536E27',
  danger: '#FFFFFF',
  dark: '#FFFFFF',
};

const paddingBySize: Record<ButtonSize, string> = {
  sm: 'px-3 py-2',
  md: 'px-4 py-3',
  lg: 'px-5 py-3.5',
};

const labelSizeBySize: Record<ButtonSize, string> = {
  sm: 'text-[11px]',
  md: 'text-[13px]',
  lg: 'text-sm',
};

export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  disabled = false,
  fullWidth = false,
  className = '',
  hint,
}) => {
  const isDisabled = disabled;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      className={`flex-row items-center justify-center rounded-xl ${paddingBySize[size]} ${
        containerByVariant[variant]
      } ${fullWidth ? 'w-full' : ''} ${isDisabled ? 'opacity-40' : 'active:opacity-80'} ${className}`}
    >
      {icon ? (
        <Ionicons name={icon} size={size === 'sm' ? 13 : 15} color={iconColorByVariant[variant]} />
      ) : null}
      <View className={icon ? 'ml-1.5' : ''}>
        <Text className={`font-bold ${labelSizeBySize[size]} ${labelByVariant[variant]}`}>
          {label}
        </Text>
        {hint ? (
          <Text className={`text-[9px] ${labelByVariant[variant]} opacity-80`}>{hint}</Text>
        ) : null}
      </View>
    </Pressable>
  );
};
