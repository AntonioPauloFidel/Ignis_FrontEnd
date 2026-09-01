import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    Pressable,
    Modal as RNModal,
    ModalProps as RNModalProps,
    StyleSheet,
    Text,
    TouchableWithoutFeedback,
    View,
    ViewStyle,
} from 'react-native';
import { colors } from '../../constants/colors';

interface CustomModalProps extends Partial<RNModalProps> {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  showCloseButton?: boolean;
  closeOnBackdropPress?: boolean;
  contentStyle?: ViewStyle;
}

export function CustomModal({
  visible,
  onClose,
  title,
  children,
  footer,
  showCloseButton = true,
  closeOnBackdropPress = true,
  contentStyle,
  animationType = 'fade',
  ...rest
}: CustomModalProps) {
  return (
    <RNModal
      visible={visible}
      transparent
      animationType={animationType}
      onRequestClose={onClose}
      statusBarTranslucent
      {...rest}
    >
      {/* Backdrop (Fundo Escuro) */}
      <TouchableWithoutFeedback
        onPress={closeOnBackdropPress ? onClose : undefined}
      >
        <View style={styles.backdrop}>
          {/* Evita que toques dentro do Card do Modal fechem o Modal */}
          <TouchableWithoutFeedback>
            <View style={[styles.modalCard, contentStyle]}>
              {/* Header com Título e Botão de Fechar */}
              {(title || showCloseButton) && (
                <View style={styles.header}>
                  {title ? (
                    <Text style={styles.title} numberOfLines={1}>
                      {title}
                    </Text>
                  ) : (
                    <View />
                  )}

                  {showCloseButton && (
                    <Pressable
                      onPress={onClose}
                      hitSlop={8}
                      style={({ pressed }) => [
                        styles.closeButton,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Ionicons
                        name="close"
                        size={22}
                        color={colors.neutralGray || '#666666'}
                      />
                    </Pressable>
                  )}
                </View>
              )}

              {/* Corpo / Conteúdo do Modal */}
              <View style={styles.body}>{children}</View>

              {/* Rodapé Opcional (Botões de Ação) */}
              {footer && <View style={styles.footer}>{footer}</View>}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    // Sombra para iOS e Android
    elevation: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    flex: 1,
    paddingRight: 8,
  },
  closeButton: {
    padding: 4,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  body: {
    marginBottom: 8,
  },
  footer: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 12,
  },
  pressed: {
    opacity: 0.6,
  },
});