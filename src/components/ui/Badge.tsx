import React from 'react';
import { Text, View } from 'react-native';

export interface BadgeProps {
  label: string;
  /** Container classes, e.g. "bg-amber-50 border-amber-200". */
  className?: string;
  /** Text classes, e.g. "text-amber-700". */
  textClassName?: string;
  /** Optional status dot classes, e.g. "bg-amber-500". */
  dotClassName?: string;
  /** Extra classes applied to the label (size/uppercase). */
  labelClassName?: string;
}

/** Small pill used for statuses, risk levels, MOQ and margin tags. */
export const Badge: React.FC<BadgeProps> = ({
  label,
  className = 'bg-brand-accent/15 border-brand-accent/40',
  textClassName = 'text-brand-primary',
  dotClassName,
  labelClassName = '',
}) => (
  <View
    className={`flex-row items-center rounded-full border px-2 py-[3px] ${className}`}
  >
    {dotClassName ? (
      <View className={`mr-1 h-1.5 w-1.5 rounded-full ${dotClassName}`} />
    ) : null}
    <Text className={`text-[10px] font-bold ${textClassName} ${labelClassName}`}>{label}</Text>
  </View>
);
