import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    Pressable,
    StyleSheet,
    Text,
    TextStyle,
    View,
    ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../constants/colors';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  rightElement?: React.ReactNode;
  centerTitle?: boolean;
  style?: ViewStyle;
  titleStyle?: TextStyle;
}

export function Header({
  title,
  subtitle,
  showBackButton = false,
  onBackPress,
  rightElement,
  centerTitle = true,
  style,
  titleStyle,
}: HeaderProps) {
  // Ajusta o padding superior dinamicamente para a barra de status (Notch / Dynamic Island)
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { paddingTop: Math.max(insets.top, 16) + 8 },
        style,
      ]}
    >
      <View style={styles.content}>
        {/* Esquerda: Botão Voltar */}
        <View style={styles.leftContainer}>
          {showBackButton && (
            <Pressable
              onPress={onBackPress}
              hitSlop={10}
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name="chevron-back"
                size={24}
                color={colors.primary || '#1A1A1A'}
              />
            </Pressable>
          )}
        </View>

        {/* Centro: Título e Subtítulo */}
        <View
          style={[
            styles.titleContainer,
            centerTitle ? styles.titleCenter : styles.titleLeft,
          ]}
        >
          {title && (
            <Text
              style={[styles.title, titleStyle]}
              numberOfLines={1}
            >
              {title}
            </Text>
          )}
          {subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>

        {/* Direita: Ações customizadas (ex: Ícones) */}
        <View style={styles.rightContainer}>
          {rightElement}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    // Sombra leve para destacar
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
  },
  content: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // --- Lados da barra ---
  leftContainer: {
    width: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
    zIndex: 2,
  },
  rightContainer: {
    minWidth: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
    zIndex: 2,
  },

  // --- Botão de Voltar ---
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // --- Título e Subtítulo ---
  titleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  titleCenter: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  titleLeft: {
    alignItems: 'flex-start',
    paddingLeft: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },

  pressed: {
    opacity: 0.6,
  },
});