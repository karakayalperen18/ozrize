import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

export interface StepperProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (next: number) => void;
  /** Unit suffix shown above the value, e.g. "Çuval". */
  unit?: string;
  compact?: boolean;
}

/** Thumb-friendly quantity stepper that never breaks the MOQ / stock bounds. */
export const Stepper: React.FC<StepperProps> = ({
  value,
  min,
  max,
  step = 1,
  onChange,
  unit,
  compact = false,
}) => {
  const canDecrease = value - step >= min;
  const canIncrease = value + step <= max;

  const buttonClass = (enabled: boolean) =>
    `items-center justify-center rounded-lg border ${
      compact ? 'h-7 w-7' : 'h-8 w-8'
    } ${enabled ? 'border-brand-supporting bg-brand-bg' : 'border-brand-border bg-brand-bg opacity-40'}`;

  return (
    <View className="items-center">
      {unit ? (
        <Text className="mb-0.5 text-[9px] font-semibold uppercase text-brand-muted">{unit}</Text>
      ) : null}
      <View className="flex-row items-center">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Miktarı azalt"
          disabled={!canDecrease}
          onPress={() => onChange(Math.max(value - step, min))}
          className={buttonClass(canDecrease)}
        >
          <Ionicons
            name="remove"
            size={compact ? 14 : 16}
            color={canDecrease ? '#536E27' : '#94A3B8'}
          />
        </Pressable>

        <Text
          className={`mx-2 text-center font-black text-brand-text ${compact ? 'text-xs' : 'text-sm'}`}
          style={{ minWidth: compact ? 34 : 42 }}
        >
          {value}
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Miktarı artır"
          disabled={!canIncrease}
          onPress={() => onChange(Math.min(value + step, max))}
          className={buttonClass(canIncrease)}
        >
          <Ionicons
            name="add"
            size={compact ? 14 : 16}
            color={canIncrease ? '#536E27' : '#94A3B8'}
          />
        </Pressable>
      </View>
    </View>
  );
};
