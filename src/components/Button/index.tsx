import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  ViewStyle,
} from 'react-native';

import { colors } from '../../constants/colors';

export type ButtonVariant = 'primary' | 'secondary' | 'outline';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
}: ButtonProps) {
  const isInteractionDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isInteractionDisabled}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        pressed && !isInteractionDisabled && styles.pressed,
        isInteractionDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={
            variant === 'outline'
              ? colors.primary
              : '#FFFFFF'
          }
        />
      ) : (
        <>
          {icon}

          <Text
            style={[
              styles.text,
              styles[`${variant}Text` as keyof typeof styles],
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Base
  button: {
    width: '100%',
    height: 52,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },

  // Variantes
  primary: {
    backgroundColor: colors.primary,
  },

  secondary: {
    backgroundColor: colors.darkBlue,
  },

  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },

  // Pressionado
  pressed: {
    opacity: 0.75,
  },

  // Desabilitado
  disabled: {
    opacity: 0.5,
  },

  // Texto
  text: {
    fontSize: 16,
    fontWeight: '600',
  },

  primaryText: {
    color: '#FFFFFF',
  },

  secondaryText: {
    color: '#FFFFFF',
  },

  outlineText: {
    color: colors.primary,
  },
}); 