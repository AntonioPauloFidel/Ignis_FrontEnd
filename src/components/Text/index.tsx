import {
    Text as RNText,
    TextProps as RNTextProps,
    StyleSheet,
} from 'react-native';

import { colors } from '../../constants/colors';

type TextVariant =
  | 'title'
  | 'subtitle'
  | 'body'
  | 'caption';

interface TextProps extends RNTextProps {
  variant?: TextVariant;
}

export function Text({
  variant = 'body',
  style,
  children,
  ...props
}: TextProps) {
  return (
    <RNText
      {...props}
      style={[styles.base, styles[variant], style]}
    >
      {children}
    </RNText>
  );
}

const styles = StyleSheet.create({
  base: {
    color: colors.darkBlue,
  },

  title: {
    fontSize: 28,
    fontWeight: '700',
  },

  subtitle: {
    fontSize: 20,
    fontWeight: '600',
  },

  body: {
    fontSize: 16,
    fontWeight: '400',
  },

  caption: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.neutralGray,
  },
});