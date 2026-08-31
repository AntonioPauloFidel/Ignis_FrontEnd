import {
    StyleSheet,
    TextInput,
    TextInputProps,
} from 'react-native';

import { colors } from '../../constants/colors';

interface InputProps extends TextInputProps {
  error?: boolean;
}

export function Input({ error = false, style, ...props }: InputProps) {
  return (
    <TextInput
      {...props}
      style={[
        styles.input,
        error && styles.error,
        style,
      ]}
      placeholderTextColor={colors.neutralGray}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    width: '100%',
    height: 52,

    backgroundColor: '#FFFFFF',

    borderWidth: 1,
    borderColor: colors.softBlue,
    borderRadius: 12,

    paddingHorizontal: 16,

    fontSize: 16,
    color: colors.darkBlue,
  },

  error: {
    borderColor: '#DC2626',
  },
});