import React from 'react';
import { Pressable, Text, View } from 'react-native';

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onActionPress?: () => void;
}

/** Compact section title with an optional trailing text action. */
export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  actionLabel,
  onActionPress,
}) => (
  <View className="flex-row items-end justify-between">
    <View className="flex-1 pr-2">
      <Text className="text-[11px] font-black uppercase tracking-label text-brand-primary">
        {title}
      </Text>
      {subtitle ? <Text className="mt-0.5 text-[10px] text-brand-muted">{subtitle}</Text> : null}
    </View>
    {actionLabel ? (
      <Pressable onPress={onActionPress} hitSlop={8} accessibilityRole="button">
        <Text className="text-[10px] font-bold text-brand-primary underline">{actionLabel}</Text>
      </Pressable>
    ) : null}
  </View>
);
