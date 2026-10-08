import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../constants/colors';

export interface TabItem {
  id: string;
  label: string;
  icon: (props: { color: string; size: number }) => React.ReactNode;
  badge?: number;
  variant?: 'default' | 'center';
}

interface NavBarProps {
  tabs: TabItem[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  style?: ViewStyle;
}

export function NavBar({ tabs, activeTabId, onSelectTab, style }: NavBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 12) }, style]}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        const isCenter = tab.variant === 'center';
        const activeColor = colors.primary;
        const inactiveColor = colors.neutralGray || '#8E8E93';

        return (
          <Pressable
            key={tab.id}
            onPress={() => onSelectTab(tab.id)}
            style={[styles.tabButton, isCenter && styles.centerTabButton]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <View
              style={[
                styles.iconContainer,
                isCenter && styles.centerIconContainer,
                isActive && isCenter && styles.centerIconActive,
              ]}
            >
              {tab.icon({
                color: isCenter ? (isActive ? '#FFFFFF' : '#FFFFFF') : isActive ? activeColor : inactiveColor,
                size: isCenter ? 28 : 24,
              })}

              {typeof tab.badge === 'number' && tab.badge > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </Text>
                </View>
              )}
            </View>

            {tab.label ? (
              <Text
                style={[
                  styles.label,
                  { color: isActive ? activeColor : inactiveColor },
                  isActive && styles.activeLabel,
                  isCenter && styles.centerLabel,
                ]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  centerTabButton: {
    flex: 1.2,
    justifyContent: 'flex-start',
    marginTop: -18,
    paddingBottom: 10,
  },
  iconContainer: {
    position: 'relative',
  },
  centerIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  centerIconActive: {
    backgroundColor: colors.primary,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
  },
  centerLabel: {
    fontSize: 11,
    color: colors.primary,
  },
  activeLabel: {
    fontWeight: '700',
  },
});