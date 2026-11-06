import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

export interface ModalSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Optional sticky footer rendered outside the scroll area. */
  footer?: React.ReactNode;
}

/** Bottom sheet built on the RN Modal so it works identically on iOS and Android. */
export const ModalSheet: React.FC<ModalSheetProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    statusBarTranslucent
    onRequestClose={onClose}
  >
    <View className="flex-1 justify-end bg-black/50">
      <Pressable className="flex-1" onPress={onClose} accessibilityLabel="Kapat" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="max-h-[88%] rounded-t-sheet bg-white"
      >
        <View className="items-center pt-2">
          <View className="h-1 w-10 rounded-full bg-brand-border" />
        </View>

        <View className="flex-row items-start justify-between px-4 pb-2 pt-3">
          <View className="flex-1 pr-3">
            <Text className="text-sm font-black text-brand-text">{title}</Text>
            {subtitle ? (
              <Text className="mt-0.5 text-[11px] text-brand-muted">{subtitle}</Text>
            ) : null}
          </View>
          <Pressable
            onPress={onClose}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Kapat"
            className="h-7 w-7 items-center justify-center rounded-full bg-brand-bg"
          >
            <Ionicons name="close" size={15} color="#536E27" />
          </Pressable>
        </View>

        <ScrollView
          className="px-4"
          contentContainerStyle={{ paddingBottom: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>

        {footer ? (
          <View className="border-t border-brand-border px-4 py-3">{footer}</View>
        ) : null}
      </KeyboardAvoidingView>
    </View>
  </Modal>
);
