import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors } from '../../constants/colors';

interface FooterLink {
  label: string;
  onPress: () => void;
}

interface SocialLink {
  name: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}

interface FooterProps {
  companyName?: string;
  links?: FooterLink[];
  socials?: SocialLink[];
  style?: ViewStyle;
}

export function Footer({
  companyName = 'Ignis',
  links = [],
  socials = [],
  style,
}: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <View style={[styles.container, style]}>
      {/* Redes Sociais */}
      {socials.length > 0 && (
        <View style={styles.socialContainer}>
          {socials.map((social, index) => (
            <Pressable
              key={index}
              onPress={social.onPress}
              style={({ pressed }) => [
                styles.socialButton,
                pressed && styles.pressed,
              ]}
              hitSlop={8}
            >
              <Ionicons
                name={social.name}
                size={20}
                color={colors.primary}
              />
            </Pressable>
          ))}
        </View>
      )}

      {/* Links de Termos e Navegação Secundária */}
      {links.length > 0 && (
        <View style={styles.linksContainer}>
          {links.map((link, index) => (
            <React.Fragment key={index}>
              <Pressable onPress={link.onPress} hitSlop={6}>
                <Text style={styles.linkText}>{link.label}</Text>
              </Pressable>
              {index < links.length - 1 && (
                <Text style={styles.dotSeparator}>•</Text>
              )}
            </React.Fragment>
          ))}
        </View>
      )}

      {/* Copyright e Branding */}
      <Text style={styles.copyrightText}>
        © {currentYear} {companyName}. Todos os direitos reservados.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#F8F9FA',
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: '#EAEAEA',
  },

  // --- Redes Sociais ---
  socialContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  socialButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  // --- Links ---
  linksContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  linkText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  dotSeparator: {
    fontSize: 12,
    color: '#94A3B8',
  },

  // --- Copyright ---
  copyrightText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },

  pressed: {
    opacity: 0.6,
  },
});