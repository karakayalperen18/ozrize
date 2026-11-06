import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';

import { palette } from '../theme/tokens';
import { Button } from './ui/Button';

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  actionLabel?: string;
  onActionPress?: () => void;
}

/** Friendly placeholder for empty carts and empty approval queues. */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onActionPress,
}) => (
  <View className="items-center justify-center rounded-card border border-dashed border-brand-border bg-white px-6 py-8">
    <View className="h-12 w-12 items-center justify-center rounded-full bg-brand-bg">
      <Ionicons name={icon} size={22} color={palette.supporting} />
    </View>
    <Text className="mt-3 text-center text-[13px] font-black text-brand-text">{title}</Text>
    <Text className="mt-1 text-center text-[10px] leading-relaxed text-brand-muted">
      {description}
    </Text>
    {actionLabel ? (
      <Button label={actionLabel} onPress={onActionPress} size="sm" className="mt-3" />
    ) : null}
  </View>
);
