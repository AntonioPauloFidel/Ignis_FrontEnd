import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../constants/colors';

interface TimerProps {
  initialSeconds?: number;
}

export function Timer({ initialSeconds = 25 * 60 }: TimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning]);

  const formattedTime = useMemo(() => {
    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;

    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, [secondsLeft]);

  const handleReset = () => {
    setSecondsLeft(initialSeconds);
    setIsRunning(false);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Timer</Text>
      <Text style={styles.time}>{formattedTime}</Text>

      <View style={styles.actions}>
        <Pressable style={styles.primaryButton} onPress={() => setIsRunning((prev) => !prev)}>
          <Text style={styles.primaryText}>{isRunning ? 'Pausar' : 'Iniciar'}</Text>
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={handleReset}>
          <Text style={styles.secondaryText}>Resetar</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.softBlue,
  },
  label: {
    color: colors.neutralGray,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  time: {
    fontSize: 42,
    fontWeight: '700',
    color: colors.darkBlue,
    textAlign: 'center',
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: colors.softBlue,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryText: {
    color: colors.darkBlue,
    fontWeight: '700',
  },
});
