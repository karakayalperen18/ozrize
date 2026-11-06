import React from 'react';
import { Text, View } from 'react-native';

export interface StatTileProps {
  label: string;
  value: string;
  hint?: string;
  /** Classes for the value text, e.g. "text-red-600". */
  valueClassName?: string;
  hintClassName?: string;
  className?: string;
}

/** Dense KPI tile used on the dashboard and ledger screens. */
export const StatTile: React.FC<StatTileProps> = ({
  label,
  value,
  hint,
  valueClassName = 'text-brand-text',
  hintClassName = 'text-brand-muted',
  className = '',
}) => (
  <View className={`rounded-card border border-brand-border bg-white p-3 ${className}`}>
    <Text className="text-[9px] font-bold uppercase tracking-label text-brand-muted">{label}</Text>
    <Text className={`mt-0.5 font-black ${valueClassName}`} style={{ fontSize: 15 }}>
      {value}
    </Text>
    {hint ? <Text className={`mt-0.5 text-[9px] ${hintClassName}`}>{hint}</Text> : null}
  </View>
);
