import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { Circle, Svg } from 'react-native-svg';

import {
    completeStudyCycle,
    getAchievements,
    getActiveStudyCycle,
    getCurrentUser,
    getStudyStats,
    getUserStats,
    pauseStudyCycle,
    resumeStudyCycle,
    startStudyCycle,
    type Achievement,
    type StudyCycle,
    type StudyStats,
    type UserProfile,
    type UserStats
} from '../api/home';
import { Card } from '../components/Card';
import { NavBar, type TabItem } from '../components/NavBar';
import { colors } from '../constants/colors';

const DEFAULT_DURATION_MINUTES = 25;
const PRESET_DURATIONS = [15, 20, 25, 30, 35, 40];

function formatGreeting(): string {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) return 'Bom dia';
  if (hour >= 12 && hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

function formatTime(seconds: number): string {
  const total = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(total / 60);
  const remainingSeconds = total % 60;

  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds
    .toString()
    .padStart(2, '0')}`;
}

function toNumber(value: unknown, fallback = 0): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function resolveDurationMinutes(cycle: StudyCycle | null, fallback: number): number {
  if (!cycle) {
    return fallback;
  }

  const candidates = [
    cycle.durationMinutes,
    cycle.totalDurationMs ? Math.round((Number(cycle.totalDurationMs) / 60000)) : undefined,
    cycle.remainingSeconds !== null && cycle.remainingSeconds !== undefined && cycle.remainingSeconds > 0
      ? Math.max(1, Math.ceil(cycle.remainingSeconds / 60))
      : undefined,
  ];

  const resolved = candidates.find((value) => typeof value === 'number' && Number.isFinite(value));

  return typeof resolved === 'number' ? resolved : fallback;
}

function extractRemainingSeconds(cycle: StudyCycle | null, fallback: number): number {
  if (!cycle) return fallback;

  const values = [
    cycle.remainingSeconds,
    cycle.remainingTimeSeconds,
    cycle.remainingMs ? Math.ceil(Number(cycle.remainingMs) / 1000) : undefined,
  ];

  const resolved = values.find((value) => typeof value === 'number' && Number.isFinite(value));

  if (typeof resolved === 'number') {
    return Math.max(0, resolved);
  }

  const durationMinutes = resolveDurationMinutes(cycle, fallback);
  const startedAt = cycle.startedAt ? new Date(cycle.startedAt).getTime() : null;

  if (startedAt) {
    const totalMs = durationMinutes * 60 * 1000;
    const elapsed = Math.max(0, Date.now() - startedAt);
    return Math.max(0, Math.ceil((totalMs - elapsed) / 1000));
  }

  return Math.max(0, fallback);
}

function getCycleStatus(cycle: StudyCycle | null, selectedDuration: number): 'idle' | 'running' | 'paused' | 'completed' {
  if (!cycle) {
    return 'idle';
  }

  const status = String(cycle.status ?? '').toLowerCase();
  if (status === 'running') return 'running';
  if (status === 'paused') return 'paused';
  if (status === 'completed' || status === 'cancelled') return 'completed';

  if (status === 'idle') return 'idle';

  const remainingSeconds = extractRemainingSeconds(cycle, selectedDuration * 60);
  return remainingSeconds > 0 ? 'running' : 'completed';
}

function ProgressRing({
  size,
  progress,
  active = true,
}: {
  size: number;
  progress: number;
  active?: boolean;
}) {
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - Math.min(Math.max(progress, 0), 1));

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={colors.softBlue}
        strokeWidth={stroke}
        fill="none"
      />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={active ? colors.primary : '#CBD5E1'}
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [cycleStats, setCycleStats] = useState<StudyStats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [activeCycle, setActiveCycle] = useState<StudyCycle | null>(null);
  const [selectedDurationMinutes, setSelectedDurationMinutes] = useState(DEFAULT_DURATION_MINUTES);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cycleStatus = useMemo(
    () => getCycleStatus(activeCycle, selectedDurationMinutes),
    [activeCycle, selectedDurationMinutes],
  );

  const presetDurationSeconds = selectedDurationMinutes * 60;
  const activeDurationSeconds = resolveDurationMinutes(activeCycle, selectedDurationMinutes) * 60;
  const remainingSeconds = activeCycle
    ? extractRemainingSeconds(activeCycle, presetDurationSeconds)
    : presetDurationSeconds;

  const timerDisplay = useMemo(() => {
    const effectiveSeconds =
      activeCycle && cycleStatus === 'running' ? remainingSeconds :
      activeCycle && cycleStatus === 'paused' ? remainingSeconds :
      presetDurationSeconds;

    return formatTime(effectiveSeconds);
  }, [activeCycle, cycleStatus, presetDurationSeconds, remainingSeconds]);

  const progressPercent = useMemo(() => {
    if (!activeCycle && cycleStatus === 'idle') {
      return 0;
    }

    const total = activeDurationSeconds || presetDurationSeconds;
    const remaining = Math.max(0, remainingSeconds);
    return Math.min(1, (total - remaining) / total || 0);
  }, [activeCycle, activeDurationSeconds, cycleStatus, presetDurationSeconds, remainingSeconds]);

  const loadHome = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage('');

      const [userResult, statsResult, cycleResult, studyStatsResult, achievementsResult] = await Promise.all([
        getCurrentUser().catch((error: Error & { status?: number }) => {
          if (error.status === 401) {
            throw error;
          }
          return null;
        }),
        getUserStats().catch((error: Error & { status?: number }) => {
          if (error.status === 401) {
            throw error;
          }
          return null;
        }),
        getActiveStudyCycle().catch((error: Error & { status?: number }) => {
          if (error.status === 401) {
            throw error;
          }
          return null;
        }),
        getStudyStats().catch((error: Error & { status?: number }) => {
          if (error.status === 401) {
            throw error;
          }
          return null;
        }),
        getAchievements().catch((error: Error & { status?: number }) => {
          if (error.status === 401) {
            throw error;
          }
          return [] as Achievement[];
        }),
      ]);

      if (!userResult) {
        setSessionExpired(true);
        router.replace('/login');
        return;
      }

      setUser(userResult);
      setUserStats(statsResult ?? null);
      setActiveCycle(cycleResult ?? null);
      setCycleStats(studyStatsResult ?? null);
      setAchievements(achievementsResult ?? []);

      const activeDuration = cycleResult ? resolveDurationMinutes(cycleResult, DEFAULT_DURATION_MINUTES) : DEFAULT_DURATION_MINUTES;
      if (!cycleResult) {
        setSelectedDurationMinutes(DEFAULT_DURATION_MINUTES);
      } else {
        setSelectedDurationMinutes(activeDuration);
      }

      if (userResult && userResult.ignisPoints !== undefined) {
        setUserStats((previous) => ({
          ...previous,
          ignisPoints: userResult.ignisPoints,
        }));
      }
    } catch (error) {
      const status = (error as Error & { status?: number })?.status;
      if (status === 401) {
        setSessionExpired(true);
        router.replace('/login');
        return;
      }

      setErrorMessage('Não foi possível carregar a Home no momento.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadHome();
    }, 0);

    return () => clearTimeout(timeout);
  }, [loadHome]);

  async function handleStartCycle() {
    try {
      setIsSubmitting(true);
      const cycle = await startStudyCycle({ durationMinutes: selectedDurationMinutes });
      setActiveCycle(cycle);
      setSelectedDurationMinutes(resolveDurationMinutes(cycle, selectedDurationMinutes));
      setErrorMessage('');
      await loadHome();
    } catch (error) {
      const status = (error as Error & { status?: number })?.status;
      if (status === 401) {
        router.replace('/login');
        return;
      }
      setErrorMessage('Não foi possível iniciar o ciclo.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePauseOrResume() {
    if (!activeCycle?.id) return;

    try {
      setIsSubmitting(true);
      if (cycleStatus === 'running') {
        const resumed = await pauseStudyCycle(activeCycle.id);
        setActiveCycle(resumed);
      } else {
        const resumed = await resumeStudyCycle(activeCycle.id);
        setActiveCycle(resumed);
      }
      setErrorMessage('');
      await loadHome();
    } catch (error) {
      const status = (error as Error & { status?: number })?.status;
      if (status === 401) {
        router.replace('/login');
        return;
      }
      setErrorMessage('Não foi possível alterar o ciclo.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCompleteCycle() {
    if (!activeCycle?.id) return;

    try {
      setIsSubmitting(true);
      const completed = await completeStudyCycle(activeCycle.id);
      setActiveCycle(completed);
      setErrorMessage('');
      await loadHome();
    } catch (error) {
      const status = (error as Error & { status?: number })?.status;
      if (status === 401) {
        router.replace('/login');
        return;
      }
      setErrorMessage('Não foi possível finalizar o ciclo.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const navTabs: TabItem[] = [
    {
      id: 'home',
      label: 'Início',
      icon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
    },
    {
      id: 'cycles',
      label: 'Ciclos',
      icon: ({ color, size }) => <Ionicons name="time-outline" size={size} color={color} />,
    },
    {
      id: 'add',
      label: '',
      icon: ({ color, size }) => <Ionicons name="add" size={size} color={color} />,
      variant: 'center',
    },
    {
      id: 'progress',
      label: 'Progresso',
      icon: ({ color, size }) => <Ionicons name="bar-chart-outline" size={size} color={color} />,
    },
    {
      id: 'profile',
      label: 'Perfil',
      icon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
    },
  ];

  const focusStats = [
    {
      icon: '🔥',
      label: 'Ciclos hoje',
      value: toNumber(cycleStats?.cyclesToday ?? userStats?.todayCycles, 0).toString(),
    },
    {
      icon: '⏱',
      label: 'Tempo de foco',
      value: `${toNumber(cycleStats?.todayStudyMinutes ?? cycleStats?.totalFocusMinutes ?? userStats?.totalStudyMinutes, 0)} min`,
    },
    {
      icon: '🔥',
      label: 'IGNIS ganhos',
      value: toNumber(userStats?.ignisPoints ?? cycleStats?.ignisPointsEarnedToday, 0).toString(),
    },
    {
      icon: '🏆',
      label: 'Troféus',
      value: String(Array.isArray(achievements) ? achievements.filter((achievement) => achievement.unlocked).length : 0),
    },
  ];

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loaderText}>Carregando a sua home...</Text>
      </View>
    );
  }

  if (sessionExpired) {
    return (
      <View style={styles.loaderContainer}>
        <Text style={styles.errorTitle}>Sessão expirada</Text>
        <Text style={styles.errorText}>Você será redirecionado para o login.</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={styles.brandWrap}>
            <View style={styles.fireBadge}>
              <Ionicons name="flame" size={24} color={colors.primary} />
            </View>
            <View style={styles.brandTextWrap}>
              <Text style={styles.brandTitle}>IGNIS</Text>
              <Text style={styles.brandSubtitle}>FOCO QUE TRANSFORMA</Text>
            </View>
          </View>

          <View style={styles.headerBalanceWrap}>
            <Ionicons name="flame" size={18} color={colors.primary} />
            <Text style={styles.headerBalanceValue}>{toNumber(user?.ignisPoints ?? userStats?.ignisPoints, 0)}</Text>
            <Text style={styles.headerBalanceLabel}>IGNIS</Text>
          </View>
        </View>

        <View style={styles.greetingBlock}>
          <Text style={styles.greetingText}>
            {formatGreeting()}, {user?.name ?? 'usuário'}! 👋
          </Text>
          <Text style={styles.greetingSubtitle}>Cada ciclo te aproxima da sua melhor versão.</Text>
        </View>

        <Card style={styles.focusCard}>
          <View style={styles.focusHeaderRow}>
            <Text style={styles.focusTitle}>FOCO</Text>
            {activeCycle && cycleStatus === 'running' ? (
              <View style={styles.livePill}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>Em andamento</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.focusMain}>
            <View style={styles.timerWrap}>
              <ProgressRing size={160} progress={progressPercent} active={cycleStatus !== 'completed'} />
              <View style={styles.timerOverlay}>
                <Text style={styles.timerText}>{timerDisplay}</Text>
              </View>
            </View>

            <View style={styles.igniteWrap}>
              <Ionicons name="flame" size={18} color={colors.primary} />
              <Text style={styles.igniteText}>+{toNumber(activeCycle?.ignisReward ?? selectedDurationMinutes, selectedDurationMinutes)} IGNIS</Text>
            </View>
          </View>

          <View style={styles.presetRow}>
            {PRESET_DURATIONS.map((duration) => (
              <Pressable
                key={duration}
                onPress={() => setSelectedDurationMinutes(duration)}
                style={[
                  styles.presetButton,
                  selectedDurationMinutes === duration && styles.presetButtonSelected,
                ]}
              >
                <Text
                  style={[
                    styles.presetText,
                    selectedDurationMinutes === duration && styles.presetTextSelected,
                  ]}
                >
                  {duration} min
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.actionRow}>
            {cycleStatus === 'running' || cycleStatus === 'paused' ? (
              <Pressable
                onPress={handlePauseOrResume}
                style={({ pressed }) => [
                  styles.secondaryAction,
                  pressed && styles.pressed,
                ]}
                disabled={isSubmitting}
              >
                <Text style={styles.secondaryActionText}>
                  {cycleStatus === 'running' ? 'PAUSAR' : 'CONTINUAR'}
                </Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={handleStartCycle}
                style={({ pressed }) => [
                  styles.primaryAction,
                  pressed && styles.pressed,
                ]}
                disabled={isSubmitting}
              >
                <Ionicons name="play" size={18} color="#FFFFFF" />
                <Text style={styles.primaryActionText}>INICIAR CICLO</Text>
              </Pressable>
            )}

            {activeCycle && cycleStatus !== 'completed' ? (
              <Pressable
                onPress={handleCompleteCycle}
                style={({ pressed }) => [
                  styles.cancelAction,
                  pressed && styles.pressed,
                ]}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelActionText}>FINALIZAR</Text>
              </Pressable>
            ) : null}
          </View>

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        </Card>

        <View style={styles.inlineActions}>
          <Pressable style={({ pressed }) => [styles.secondaryFeatureCard, pressed && styles.pressed]}>
            <View style={styles.featureHeader}>
              <Text style={styles.featureIcon}>📄</Text>
              <Text style={styles.featureTitle}>Estudar com IA</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.primary} />
            </View>
            <Text style={styles.featureDescription}>Envie um arquivo e gere resumos e atividades personalizadas.</Text>
          </Pressable>

          <Pressable style={({ pressed }) => [styles.secondaryFeatureCard, pressed && styles.pressed]}>
            <View style={styles.featureHeader}>
              <Text style={styles.featureIcon}>🏆</Text>
              <Text style={styles.featureTitle}>Desafios</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.primary} />
            </View>
            <Text style={styles.featureDescription}>Complete ciclos e conquiste troféus incríveis.</Text>
          </Pressable>
        </View>

        <Card style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Seu progresso</Text>
            <Pressable>
              <Text style={styles.progressLink}>Ver mais {'>'}</Text>
            </Pressable>
          </View>

          <View style={styles.progressGrid}>
            {focusStats.map((item, index) => (
              <View key={`${item.label}-${index}`} style={styles.statItem}>
                <Text style={styles.statIcon}>{item.icon}</Text>
                <Text style={styles.statLabel}>{item.label}</Text>
                <Text style={styles.statValue}>{item.value}</Text>
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>

      <NavBar
        tabs={navTabs}
        activeTabId="home"
        onSelectTab={(tabId) => {
          if (tabId === 'add') {
            return;
          }

          if (tabId === 'progress') {
            router.push('/progress' as never);
            return;
          }

          if (tabId === 'profile') {
            router.push('/login');
            return;
          }

          if (tabId === 'home') {
            router.push('/');
          }
        }}
        style={styles.navBar}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FBFF',
  },
  scroll: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 110,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 18,
  },
  brandWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  fireBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.softBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandTextWrap: {
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.darkBlue,
    letterSpacing: 0.6,
  },
  brandSubtitle: {
    color: colors.neutralGray,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  headerBalanceWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.softBlue,
    shadowColor: '#020617',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  headerBalanceValue: {
    fontWeight: '700',
    fontSize: 16,
    color: colors.darkBlue,
  },
  headerBalanceLabel: {
    color: colors.neutralGray,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  greetingBlock: {
    marginBottom: 18,
  },
  greetingText: {
    color: colors.darkBlue,
    fontSize: 22,
    fontWeight: '800',
  },
  greetingSubtitle: {
    color: colors.neutralGray,
    fontSize: 14,
    marginTop: 4,
  },
  focusCard: {
    padding: 18,
    marginBottom: 18,
    borderColor: '#E1ECFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
  },
  focusHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  focusTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.4,
    color: colors.darkBlue,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E7F9EE',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  liveText: {
    color: '#0F766E',
    fontSize: 10,
    fontWeight: '700',
  },
  focusMain: {
    alignItems: 'center',
    marginBottom: 20,
  },
  timerWrap: {
    width: 170,
    height: 170,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  timerOverlay: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  timerText: {
    color: colors.darkBlue,
    fontSize: 34,
    fontWeight: '800',
  },
  igniteWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  igniteText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 16,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  presetButton: {
    minWidth: 54,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F5F9FF',
    borderWidth: 1,
    borderColor: '#DDEBFF',
  },
  presetButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  presetText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.darkBlue,
    textAlign: 'center',
  },
  presetTextSelected: {
    color: '#FFFFFF',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  primaryAction: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  secondaryAction: {
    flex: 1,
    backgroundColor: colors.softBlue,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionText: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 15,
  },
  cancelAction: {
    backgroundColor: '#EEF2FF',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelActionText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  pressed: {
    opacity: 0.85,
  },
  inlineActions: {
    gap: 12,
    marginBottom: 20,
  },
  secondaryFeatureCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EAF1FF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
  },
  featureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureIcon: {
    fontSize: 20,
  },
  featureTitle: {
    flex: 1,
    color: colors.darkBlue,
    fontWeight: '700',
    fontSize: 16,
  },
  featureDescription: {
    marginTop: 8,
    color: colors.neutralGray,
    fontSize: 13,
    lineHeight: 20,
  },
  progressCard: {
    padding: 18,
    borderColor: '#EAF1FF',
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  progressTitle: {
    color: colors.darkBlue,
    fontSize: 20,
    fontWeight: '800',
  },
  progressLink: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  progressGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statItem: {
    width: '48%',
    backgroundColor: '#F8FBFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EAF3FF',
  },
  statIcon: {
    fontSize: 18,
    marginBottom: 8,
  },
  statLabel: {
    color: colors.neutralGray,
    fontSize: 12,
    marginBottom: 6,
  },
  statValue: {
    color: colors.darkBlue,
    fontSize: 20,
    fontWeight: '800',
  },
  infoBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FBFF',
    borderRadius: 12,
    padding: 10,
    minWidth: 70,
  },
  infoBadgeIcon: {
    fontSize: 16,
    marginBottom: 4,
  },
  infoBadgeLabel: {
    color: colors.neutralGray,
    fontSize: 11,
    textAlign: 'center',
  },
  infoBadgeValue: {
    color: colors.darkBlue,
    fontSize: 15,
    fontWeight: '700',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FBFF',
    padding: 24,
  },
  loaderText: {
    marginTop: 12,
    color: colors.darkBlue,
    fontSize: 16,
    fontWeight: '600',
  },
  errorTitle: {
    color: colors.darkBlue,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    marginTop: 8,
  },
  navBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});