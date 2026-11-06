import React from 'react';
import { View } from 'react-native';

export interface ProgressBarProps {
  /** Completion ratio between 0 and 1. */
  value: number;
  height?: number;
  /** Classes for the filled segment, e.g. "bg-brand-accent". */
  fillClassName?: string;
  /** Classes for the track. */
  trackClassName?: string;
  className?: string;
}

/** Horizontal meter used by the credit gauge and the margin analysis. */
export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  height = 6,
  fillClassName = 'bg-brand-accent',
  trackClassName = 'bg-brand-border',
  className = '',
}) => {
  const ratio = Math.min(Math.max(Number.isFinite(value) ? value : 0, 0), 1);

  return (
    <View
      className={`w-full overflow-hidden rounded-full ${trackClassName} ${className}`}
      style={{ height }}
    >
      <View
        className={`h-full rounded-full ${fillClassName}`}
        style={{ width: `${ratio * 100}%` }}
      />
    </View>
  );
};
