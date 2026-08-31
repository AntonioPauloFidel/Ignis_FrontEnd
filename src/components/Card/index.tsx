import { StyleSheet, View, ViewProps } from 'react-native';

import { colors } from '../../constants/colors';

interface CardProps extends ViewProps {
  children: React.ReactNode;
}

export function Card({ children, style, ...props }: CardProps) {
  return (
    <View
      {...props}
      style={[styles.card, style]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',

    backgroundColor: '#FFFFFF',

    borderRadius: 16,

    padding: 20,

    borderWidth: 1,
    borderColor: colors.softBlue,

    shadowColor: colors.darkBlue,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 6,

    elevation: 3,
  },
});