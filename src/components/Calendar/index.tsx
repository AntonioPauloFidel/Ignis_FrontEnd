import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../../constants/colors';

export function Calendar() {
  const today = new Date();

  const weekday = today.toLocaleDateString('pt-BR', { weekday: 'long' });
  const day = today.getDate();
  const month = today.toLocaleDateString('pt-BR', { month: 'long' });
  const year = today.getFullYear();

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Calendário</Text>
      <Text style={styles.weekday}>{weekday}</Text>
      <Text style={styles.date}>{day}</Text>
      <Text style={styles.month}>{month}</Text>
      <Text style={styles.year}>{year}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
  },
  label: {
    color: '#FFFFFF',
    opacity: 0.8,
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '600',
  },
  weekday: {
    color: '#FFFFFF',
    fontSize: 16,
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  date: {
    color: '#FFFFFF',
    fontSize: 54,
    fontWeight: '700',
    lineHeight: 60,
  },
  month: {
    color: '#FFFFFF',
    fontSize: 18,
    textTransform: 'capitalize',
    marginTop: 4,
  },
  year: {
    color: '#FFFFFF',
    opacity: 0.8,
    fontSize: 14,
  },
});
