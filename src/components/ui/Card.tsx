import React from 'react';
import { View, type ViewProps } from 'react-native';

export interface CardProps extends ViewProps {
  className?: string;
  /** Removes the default padding when the card owns its inner layout. */
  padded?: boolean;
}

/** White rounded surface used for every block of content (16px radius). */
export const Card: React.FC<CardProps> = ({ className = '', padded = true, children, ...rest }) => (
  <View
    className={`rounded-card border border-brand-border bg-white ${padded ? 'p-3' : ''} ${className}`}
    {...rest}
  >
    {children}
  </View>
);
