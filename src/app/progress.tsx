import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { Circle, Line, Polyline, Svg } from 'react-native-svg';

import {
    getAchievements,
    getCurrentUser,
    getGoals,
    getStudyHistoryPage,
    getStudyStats,
    getUserStats,
    type Achievement,
    type Goal,
    type StudyCycle,
} from '../api/home';
import { Card } from '../components/Card';
import { NavBar, type TabItem } from '../components/NavBar';
import { colors } from '../constants/colors';

type MetricKey = 'time' | 'cycles' | 'ignis';

function safeNumber(value: unknown, fallback = 0): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function formatMinutes(minutes: number): string {
  return `${Math.max(0, Math.round(minutes))} min`;
}

function isSameDay(dateA: Date, dateB: Date): boolean {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

function getDateRange(daysBack: number) {
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const start = new Date(end);
  start.setDate(start.getDate() - (daysBack - 1));
  start.setHours(0, 0, 0, 0);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

function getDailyMetricFromHistory(history: StudyCycle[], metric: MetricKey): number {
  const today = new Date();

  return history.reduce((total, item) => {
    const completedAt = item.completedAt ? new Date(item.completedAt) : item.startedAt ? new Date(item.startedAt) : null;

    if (!completedAt || !isSameDay(completedAt, today)) {
      return total;
    }

    if (metric === 'time') {
      return total + safeNumber(item.durationMinutes, 0);
    }

    if (metric === 'cycles') {
      return total + 1;
    }

    return total + safeNumber(item.ignisEarned, 0);
  }, 0);
}

function ProgressBar({ percent, activeColor = colors.primary }: { percent: number; activeColor?: string }) {
  const safePercent = Math.min(100, Math.max(0, Number.isFinite(percent) ? percent : 0));

  return (
    <View style={styles.progressBarTrack}>
      <View
        style={[
          styles.progressBarFill,
          {
            width: `${safePercent}%`,
            backgroundColor: activeColor,
          },
        ]}
      />
    </View>
  );
}

export default function ProgressScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('time');
  const [profile, setProfile] = useState<{ name?: string; ignisPoints?: number } | null>(null);
  const [stats, setStats] = useState<{
    todayStudyMinutes?: number;
    currentStreak?: number;
    longestStreak?: number;
    totalStudyMinutes?: number;
    weekStudyMinutes?: number;
  } | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [history, setHistory] = useState<StudyCycle[]>([]);
  const [historyRange, setHistoryRange] = useState<StudyCycle[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  useEffect(() => {
    let isMounted = true;

    async function loadProgress() {
      try {
        setLoading(true);
        setErrorMessage('');

        const todayRange = getDateRange(1);
        const weekRange = getDateRange(7);

        const [userResult, userStatsResult, studyStatsResult, goalsResult, achievementsResult, todayHistoryResult, weekHistoryResult] = await Promise.all([
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
          getStudyStats().catch((error: Error & { status?: number }) => {
            if (error.status === 401) {
              throw error;
            }
            return null;
          }),
          getGoals().catch((error: Error & { status?: number }) => {
            if (error.status === 401) {
              throw error;
            }
            return [] as Goal[];
          }),
          getAchievements().catch((error: Error & { status?: number }) => {
            if (error.status === 401) {
              throw error;
            }
            return [] as Achievement[];
          }),
          getStudyHistoryPage({ page: 1, limit: 100, startDate: todayRange.start, endDate: todayRange.end }),
          getStudyHistoryPage({ page: 1, limit: 100, startDate: weekRange.start, endDate: weekRange.end }),
        ]);

        if (!userResult) {
          if (isMounted) {
            router.replace('/login');
          }
          return;
        }

        const userStats = userStatsResult ?? {};
        const studyStats = studyStatsResult ?? {};
        const todaySummary = todayHistoryResult?.summary ?? {};

        if (isMounted) {
          setProfile({
            name: userResult?.name ?? userStats?.user?.name ?? 'Usuário',
            ignisPoints: safeNumber(userStats?.ignisPoints ?? userResult?.ignisPoints ?? 0, 0),
          });
          setStats({
            todayStudyMinutes: safeNumber(todaySummary.totalStudyMinutes ?? studyStats?.todayStudyMinutes ?? 0, 0),
            currentStreak: safeNumber(studyStats?.currentStreak ?? userStats?.currentStreak ?? 0, 0),
            longestStreak: safeNumber(studyStats?.longestStreak ?? userStats?.longestStreak ?? 0, 0),
            totalStudyMinutes: safeNumber(studyStats?.totalStudyMinutes ?? userStats?.totalStudyMinutes ?? 0, 0),
            weekStudyMinutes: safeNumber(studyStats?.weekStudyMinutes ?? 0, 0),
          });
          setGoals(goalsResult ?? []);
          setAchievements(achievementsResult ?? []);
          setHistory(todayHistoryResult?.data ?? []);
          setHistoryRange(weekHistoryResult?.data ?? []);
        }
      } catch (error) {
        const status = (error as Error & { status?: number })?.status;

        if (status === 401) {
          if (isMounted) {
            router.replace('/login');
          }
          return;
        }

        if (isMounted) {
          setErrorMessage('Não foi possível carregar seu progresso no momento.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadProgress();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const dailyGoal = useMemo(
    () => goals.find((goal) => goal.type === 'DAILY') ?? null,
    [goals],
  );

  const weeklyGoal = useMemo(
    () => goals.find((goal) => goal.type === 'WEEKLY') ?? null,
    [goals],
  );

  const todayCycles = useMemo(
    () => getDailyMetricFromHistory(history, 'cycles'),
    [history],
  );

  const todayIgnis = useMemo(
    () => getDailyMetricFromHistory(history, 'ignis'),
    [history],
  );

  const chartSeries = useMemo(() => {
    const lastSevenDays = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      date.setHours(0, 0, 0, 0);
      return date;
    });

    return lastSevenDays.map((date) => {
      const dayKey = date.toISOString().slice(0, 10);
      const value = historyRange.reduce((accumulator, item) => {
        const itemDate = item.completedAt ? new Date(item.completedAt) : item.startedAt ? new Date(item.startedAt) : null;

        if (!itemDate) {
          return accumulator;
        }

        if (itemDate.toISOString().slice(0, 10) !== dayKey) {
          return accumulator;
        }

        if (selectedMetric === 'time') {
          return accumulator + safeNumber(item.durationMinutes, 0);
        }

        if (selectedMetric === 'cycles') {
          return accumulator + 1;
        }

        return accumulator + safeNumber(item.ignisEarned, 0);
      }, 0);

      return {
        label: date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
        value,
      };
    });
  }, [historyRange, selectedMetric]);

  const chartMax = Math.max(...chartSeries.map((item) => item.value), 1);
  const chartPoints = chartSeries.map((item, index) => {
    const x = (index / Math.max(chartSeries.length - 1, 1)) * 280;
    const y = 120 - (item.value / chartMax) * 90;
    return `${x},${y}`;
  });

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

  const indicatorCards = [
    {
      title: 'Tempo de estudo',
      value: formatMinutes(stats?.todayStudyMinutes ?? 0),
      meta: 'Hoje',
      accent: colors.primary,
    },
    {
      title: 'Ciclos concluídos',
      value: `${todayCycles}`,
      meta: 'Hoje',
      accent: '#10B981',
    },
    {
      title: 'Sequência',
      value: `${safeNumber(stats?.currentStreak ?? 0, 0)} dias`,
      meta: `Melhor: ${safeNumber(stats?.longestStreak ?? 0, 0)} dias`,
      accent: '#F59E0B',
    },
    {
      title: 'Meta diária',
      value: dailyGoal ? `${Math.min(100, safeNumber(dailyGoal.progressPercent ?? 0, 0))}%` : 'Sem meta',
      meta: dailyGoal ? `${formatMinutes(safeNumber(dailyGoal.progressMinutes ?? 0, 0))} / ${formatMinutes(safeNumber(dailyGoal.targetMinutes ?? 0, 0))}` : 'Sem dados',
      accent: colors.primary,
    },
  ];

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loaderText}>Carregando progresso...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="chevron-back" size={24} color={colors.darkBlue} />
          </Pressable>

          <View style={styles.brandBlock}>
            <View style={styles.brandBadge}>
              <Ionicons name="flame" size={22} color={colors.primary} />
            </View>
            <Text style={styles.brandText}>IGNIS</Text>
          </View>

          <View style={styles.topBarSpacer} />
        </View>

        <Text style={styles.subtitle}>SEU PROGRESSO</Text>

        <Card style={styles.summaryCard}>
          <View style={styles.summaryContent}>
            <View style={styles.summaryTextWrap}>
              <Text style={styles.summaryTitle}>Você está indo muito bem!</Text>
              <Text style={styles.summarySubtitle}>Sua dedicação hoje já te aproxima dos seus objetivos.</Text>
            </View>

            <View style={styles.summaryStats}>
              <Text style={styles.summaryLabel}>Saldo atual</Text>
              <Text style={styles.summaryValue}>{safeNumber(profile?.ignisPoints ?? 0, 0)}</Text>
              <Text style={styles.summaryLabel}>Hoje</Text>
              <Text style={styles.summaryBadge}>+{todayIgnis} IGNIS</Text>
            </View>
          </View>
        </Card>

        <View style={styles.indicatorGrid}>
          {indicatorCards.map((card) => (
            <Card key={card.title} style={styles.indicatorCard}>
              <View style={styles.indicatorHeader}>
                <Text style={styles.indicatorTitle}>{card.title}</Text>
                <View style={[styles.indicatorDot, { backgroundColor: card.accent }]} />
              </View>
              <Text style={styles.indicatorValue}>{card.value}</Text>
              <Text style={styles.indicatorMeta}>{card.meta}</Text>
            </Card>
          ))}
        </View>

        <Card style={styles.goalsCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Metas</Text>
          </View>

          {dailyGoal || weeklyGoal ? (
            <View style={styles.goalList}>
              {dailyGoal ? (
                <View key={dailyGoal.id} style={styles.goalItem}>
                  <View style={styles.goalHeader}>
                    <Text style={styles.goalType}>Meta diária</Text>
                    <Text style={styles.goalPercent}>{Math.min(100, safeNumber(dailyGoal.progressPercent ?? 0, 0))}%</Text>
                  </View>
                  <Text style={styles.goalText}>{formatMinutes(safeNumber(dailyGoal.progressMinutes ?? 0, 0))} / {formatMinutes(safeNumber(dailyGoal.targetMinutes ?? 0, 0))}</Text>
                  <ProgressBar percent={safeNumber(dailyGoal.progressPercent ?? 0, 0)} />
                </View>
              ) : null}

              {weeklyGoal ? (
                <View key={weeklyGoal.id} style={styles.goalItem}>
                  <View style={styles.goalHeader}>
                    <Text style={styles.goalType}>Meta semanal</Text>
                    <Text style={styles.goalPercent}>{Math.min(100, safeNumber(weeklyGoal.progressPercent ?? 0, 0))}%</Text>
                  </View>
                  <Text style={styles.goalText}>{formatMinutes(safeNumber(weeklyGoal.progressMinutes ?? 0, 0))} / {formatMinutes(safeNumber(weeklyGoal.targetMinutes ?? 0, 0))}</Text>
                  <ProgressBar percent={safeNumber(weeklyGoal.progressPercent ?? 0, 0)} />
                </View>
              ) : null}
            </View>
          ) : (
            <Text style={styles.emptyState}>Ainda não há metas configuradas para este período.</Text>
          )}
        </Card>

        <Card style={styles.chartCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Seu progresso</Text>
          </View>

          <View style={styles.metricSelector}>
            {[
              { key: 'time', label: 'Tempo' },
              { key: 'cycles', label: 'Ciclos' },
              { key: 'ignis', label: 'IGNIS' },
            ].map((option) => (
              <Pressable
                key={option.key}
                onPress={() => setSelectedMetric(option.key as MetricKey)}
                style={[
                  styles.metricButton,
                  selectedMetric === option.key && styles.metricButtonActive,
                ]}
              >
                <Text style={[styles.metricButtonText, selectedMetric === option.key && styles.metricButtonTextActive]}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {historyRange.length === 0 ? (
            <View style={styles.emptyChartContainer}>
              <Text style={styles.emptyChartText}>Sem dados no período de 7 dias.</Text>
            </View>
          ) : (
            <View style={styles.chartWrap}>
              <Svg width="100%" height={160} viewBox="0 0 280 160">
                {[0, 1, 2, 3].map((line) => (
                  <Line
                    key={line}
                    x1="0"
                    y1={20 + line * 28}
                    x2="280"
                    y2={20 + line * 28}
                    stroke="#E2E8F0"
                    strokeWidth="1"
                  />
                ))}
                <Polyline points={chartPoints.join(' ')} fill="none" stroke={colors.primary} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
                {chartSeries.map((item, index) => {
                  const x = (index / Math.max(chartSeries.length - 1, 1)) * 280;
                  const y = 120 - (item.value / chartMax) * 90;

                  return (
                    <Circle
                      key={`${item.label}-${index}`}
                      cx={x}
                      cy={y}
                      r={4}
                      fill={colors.primary}
                    />
                  );
                })}
              </Svg>

              <View style={styles.chartLabels}>
                {chartSeries.map((item) => (
                  <Text key={`${item.label}-label`} style={styles.chartLabel}>{item.label}</Text>
                ))}
              </View>
            </View>
          )}
        </Card>

        <Card style={styles.historyCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Histórico de sessões</Text>
          </View>

          {history.length === 0 ? (
            <Text style={styles.emptyState}>Você ainda não concluiu nenhuma sessão. Seu histórico aparecerá após a primeira sessão concluída.</Text>
          ) : (
            <View style={styles.historyList}>
              {history.slice(0, 5).map((session) => {
                const completedAt = session.completedAt ? new Date(session.completedAt) : session.startedAt ? new Date(session.startedAt) : null;
                const duration = safeNumber(session.durationMinutes ?? 0, 0);

                return (
                  <View key={session.id} style={styles.historyItem}>
                    <View style={styles.historyHeader}>
                      <Text style={styles.historyStatus}>Concluído</Text>
                      <Text style={styles.historyIgnis}>+{safeNumber(session.ignisEarned ?? 0, 0)} IGNIS</Text>
                    </View>
                    <Text style={styles.historyMeta}>{completedAt ? completedAt.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Sem data'}</Text>
                    <View style={styles.historySummary}>
                      <Text style={styles.historySummaryText}>{formatMinutes(duration)}</Text>
                      <Text style={styles.historySummaryText}>1 ciclo</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </Card>

        <Card style={styles.achievementCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Conquistas</Text>
          </View>

          {achievements.length === 0 ? (
            <Text style={styles.emptyState}>Ainda não há conquistas registradas.</Text>
          ) : (
            <View style={styles.achievementList}>
              {achievements.map((achievement) => (
                <View key={achievement.id} style={[styles.achievementItem, !achievement.unlocked && styles.achievementLocked]}>
                  <View style={styles.achievementIconWrap}>
                    <Ionicons name={achievement.unlocked ? 'trophy' : 'trophy-outline'} size={22} color={achievement.unlocked ? '#F59E0B' : colors.neutralGray} />
                  </View>
                  <View style={styles.achievementText}>
                    <Text style={styles.achievementName}>{achievement.name ?? 'Conquista'}</Text>
                    <Text style={styles.achievementDescription}>{achievement.description ?? 'Conquista disponível'}</Text>
                  </View>
                  <Text style={styles.achievementProgress}>{Math.min(100, safeNumber(achievement.progress ?? 0, 0))}%</Text>
                </View>
              ))}
            </View>
          )}
        </Card>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      </ScrollView>

      <NavBar
        tabs={navTabs}
        activeTabId="progress"
        onSelectTab={(tabId) => {
          if (tabId === 'home') {
            router.push('/');
            return;
          }

          if (tabId === 'cycles') {
            router.push('/');
            return;
          }

          if (tabId === 'profile') {
            router.push('/profile' as never);
            return;
          }

          if (tabId === 'add') {
            return;
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
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 120,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  brandBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  brandBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.softBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.darkBlue,
  },
  topBarSpacer: {
    width: 24,
  },
  subtitle: {
    fontSize: 12,
    letterSpacing: 1.4,
    fontWeight: '700',
    color: colors.neutralGray,
    marginBottom: 18,
    textAlign: 'center',
  },
  summaryCard: {
    padding: 18,
    marginBottom: 18,
    borderColor: '#DCEAFE',
    backgroundColor: '#EAF3FF',
  },
  summaryContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
  },
  summaryTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  summaryTitle: {
    color: colors.darkBlue,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
  },
  summarySubtitle: {
    color: colors.neutralGray,
    fontSize: 13,
    lineHeight: 20,
  },
  summaryStats: {
    alignItems: 'flex-end',
  },
  summaryLabel: {
    color: colors.neutralGray,
    fontSize: 11,
    fontWeight: '600',
  },
  summaryValue: {
    color: colors.darkBlue,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  summaryBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F766E',
    backgroundColor: '#DDF7EE',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  indicatorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 18,
  },
  indicatorCard: {
    width: '48%',
    padding: 16,
    minHeight: 128,
  },
  indicatorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  indicatorTitle: {
    color: colors.neutralGray,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  indicatorValue: {
    color: colors.darkBlue,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
  },
  indicatorMeta: {
    color: colors.neutralGray,
    fontSize: 12,
  },
  goalsCard: {
    padding: 18,
    marginBottom: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    color: colors.darkBlue,
    fontSize: 20,
    fontWeight: '800',
  },
  goalList: {
    gap: 14,
  },
  goalItem: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#F8FBFF',
    borderWidth: 1,
    borderColor: '#EAF3FF',
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  goalType: {
    color: colors.darkBlue,
    fontSize: 14,
    fontWeight: '700',
  },
  goalPercent: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  goalText: {
    color: colors.neutralGray,
    fontSize: 12,
    marginBottom: 8,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 999,
  },
  chartCard: {
    padding: 18,
    marginBottom: 18,
  },
  metricSelector: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  metricButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  metricButtonActive: {
    backgroundColor: colors.primary,
  },
  metricButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.neutralGray,
  },
  metricButtonTextActive: {
    color: '#FFFFFF',
  },
  chartWrap: {
    alignItems: 'center',
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 4,
  },
  chartLabel: {
    color: colors.neutralGray,
    fontSize: 11,
    fontWeight: '600',
  },
  emptyChartContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyChartText: {
    color: colors.neutralGray,
    fontSize: 13,
  },
  historyCard: {
    padding: 18,
    marginBottom: 18,
  },
  historyList: {
    gap: 12,
  },
  historyItem: {
    backgroundColor: '#F8FBFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EAF3FF',
    padding: 14,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyStatus: {
    color: colors.darkBlue,
    fontWeight: '700',
    fontSize: 13,
  },
  historyIgnis: {
    color: '#0F766E',
    fontWeight: '700',
    fontSize: 12,
  },
  historyMeta: {
    color: colors.neutralGray,
    fontSize: 12,
    marginBottom: 8,
  },
  historySummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  historySummaryText: {
    color: colors.darkBlue,
    fontWeight: '700',
    fontSize: 12,
  },
  achievementCard: {
    padding: 18,
  },
  achievementList: {
    gap: 12,
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EAF3FF',
    backgroundColor: '#F8FBFF',
  },
  achievementLocked: {
    opacity: 0.7,
  },
  achievementIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  achievementText: {
    flex: 1,
  },
  achievementName: {
    color: colors.darkBlue,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  achievementDescription: {
    color: colors.neutralGray,
    fontSize: 12,
  },
  achievementProgress: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyState: {
    color: colors.neutralGray,
    fontSize: 13,
    lineHeight: 20,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    marginTop: 12,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FBFF',
  },
  loaderText: {
    color: colors.darkBlue,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  navBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});
