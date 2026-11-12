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

import {
  getAchievements,
  getCurrentUser,
  getGoals,
  getStudyStats,
  getUserStats,
  type Achievement,
  type Goal,
} from '../api/home';
import { Card } from '../components/Card';
import { NavBar, type TabItem } from '../components/NavBar';
import { colors } from '../constants/colors';
import {
  formatDate,
  formatGoalType,
  formatMinutesLabel,
  formatUserField,
  normalizeProgress,
  safeNumber,
} from '../utils/profile';

type ProfileStats = {
  ignisPoints?: number;
  totalStudyMinutes?: number;
  completedCycles?: number;
  currentStreak?: number;
  longestStreak?: number;
  todayStudyMinutes?: number;
  weekStudyMinutes?: number;
  averageStudyMinutes?: number;
};

export default function ProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{
    name?: string;
    email?: string;
    phone?: string;
    age?: number | string;
    createdAt?: string;
  } | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [expandedDetails, setExpandedDetails] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      try {
        setLoading(true);
        setErrorMessage('');

        const [userResult, userStatsResult, studyStatsResult, goalsResult, achievementsResult] = await Promise.all([
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
        ]);

        if (!userResult) {
          if (isMounted) {
            router.replace('/login');
          }
          return;
        }

        const resolvedStats: ProfileStats = {
          ignisPoints: safeNumber(
            userStatsResult?.ignisPoints ?? userResult?.ignisPoints ?? studyStatsResult?.totalIgnisEarned ?? 0,
            0,
          ),
          totalStudyMinutes: safeNumber(
            studyStatsResult?.totalStudyMinutes ?? userStatsResult?.totalStudyMinutes ?? 0,
            0,
          ),
          completedCycles: safeNumber(
            studyStatsResult?.completedCycles ?? userStatsResult?.completedCycles ?? 0,
            0,
          ),
          currentStreak: safeNumber(studyStatsResult?.currentStreak ?? userStatsResult?.currentStreak ?? 0, 0),
          longestStreak: safeNumber(studyStatsResult?.longestStreak ?? userStatsResult?.longestStreak ?? 0, 0),
          todayStudyMinutes: safeNumber(studyStatsResult?.todayStudyMinutes ?? 0, 0),
          weekStudyMinutes: safeNumber(studyStatsResult?.weekStudyMinutes ?? 0, 0),
          averageStudyMinutes: safeNumber(studyStatsResult?.averageStudyMinutes ?? 0, 0),
        };

        if (isMounted) {
          setProfile({
            name: userResult?.name ?? 'Usuário',
            email: userResult?.email ?? userStatsResult?.user?.email,
            phone: (userResult as { phone?: string } | null)?.phone ?? 'Não informado',
            age: (userResult as { age?: number | string } | null)?.age,
            createdAt: (userResult as { createdAt?: string } | null)?.createdAt,
          });
          setStats(resolvedStats);
          setGoals(goalsResult ?? []);
          setAchievements(achievementsResult ?? []);
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
          setErrorMessage('Não foi possível carregar seu perfil no momento.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, [router]);

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

  const journeyCards = useMemo(
    () => [
      {
        title: 'Saldo atual',
        value: `${safeNumber(stats?.ignisPoints ?? 0, 0)}`,
        label: 'IGNIS',
        accent: colors.primary,
      },
      {
        title: 'Tempo total',
        value: formatMinutesLabel(safeNumber(stats?.totalStudyMinutes ?? 0, 0)),
        label: 'Estudo',
        accent: '#10B981',
      },
      {
        title: 'Ciclos',
        value: `${safeNumber(stats?.completedCycles ?? 0, 0)}`,
        label: 'Concluídos',
        accent: '#F59E0B',
      },
      {
        title: 'Sequência',
        value: `${safeNumber(stats?.currentStreak ?? 0, 0)} dias`,
        label: `Máx. ${safeNumber(stats?.longestStreak ?? 0, 0)} dias`,
        accent: '#8B5CF6',
      },
    ],
    [stats],
  );

  const insightCards = useMemo(
    () => [
      {
        label: 'Hoje',
        value: formatMinutesLabel(safeNumber(stats?.todayStudyMinutes ?? 0, 0)),
      },
      {
        label: 'Semana',
        value: formatMinutesLabel(safeNumber(stats?.weekStudyMinutes ?? 0, 0)),
      },
      {
        label: 'Média por ciclo',
        value: formatMinutesLabel(safeNumber(stats?.averageStudyMinutes ?? 0, 0)),
      },
    ],
    [stats],
  );

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loaderText}>Carregando perfil...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <View style={styles.brandWrap}>
            <View style={styles.brandBadge}>
              <Ionicons name="flame" size={20} color={colors.primary} />
            </View>
            <Text style={styles.brandText}>IGNIS</Text>
          </View>

          <Pressable style={styles.iconButton} onPress={() => router.push('/progress' as never)}>
            <Ionicons name="stats-chart-outline" size={20} color={colors.primary} />
          </Pressable>
        </View>

        <Card style={styles.userCard}>
          <View style={styles.userRow}>
            <View style={styles.avatarWrap}>
              <Ionicons name="person" size={28} color={colors.primary} />
            </View>

            <View style={styles.userTextContainer}>
              <Text style={styles.userName}>{formatUserField(profile?.name, 'Usuário')}</Text>
              <Text style={styles.userEmail}>{formatUserField(profile?.email, 'E-mail não informado')}</Text>
            </View>
          </View>

          <Pressable style={styles.editButton} onPress={() => setExpandedDetails((prev) => !prev)}>
            <Text style={styles.editButtonText}>{expandedDetails ? 'Ocultar detalhes' : 'Ver dados pessoais'}</Text>
          </Pressable>
        </Card>

        {expandedDetails ? (
          <Card style={styles.detailsCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Dados pessoais</Text>
            </View>

            <View style={styles.detailsList}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Nome</Text>
                <Text style={styles.detailValue}>{formatUserField(profile?.name, 'Não informado')}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>E-mail</Text>
                <Text style={styles.detailValue}>{formatUserField(profile?.email, 'Não informado')}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Telefone</Text>
                <Text style={styles.detailValue}>{formatUserField(profile?.phone, 'Não informado')}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Idade</Text>
                <Text style={styles.detailValue}>{profile?.age !== undefined ? String(profile.age) : 'Não informado'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Data de cadastro</Text>
                <Text style={styles.detailValue}>{formatDate(profile?.createdAt)}</Text>
              </View>
            </View>
          </Card>
        ) : null}

        <Card style={styles.summaryCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Resumo da jornada</Text>
          </View>

          <View style={styles.journeyGrid}>
            {journeyCards.map((card) => (
              <View key={card.title} style={styles.journeyCard}>
                <View style={styles.journeyHeader}>
                  <Text style={styles.journeyTitle}>{card.title}</Text>
                  <View style={[styles.statusDot, { backgroundColor: card.accent }]} />
                </View>
                <Text style={styles.journeyValue}>{card.value}</Text>
                <Text style={styles.journeyLabel}>{card.label}</Text>
              </View>
            ))}
          </View>
        </Card>

        <Card style={styles.insightsCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Insights pessoais</Text>
          </View>
          <View style={styles.insightsList}>
            {insightCards.map((item) => (
              <View key={item.label} style={styles.insightItem}>
                <Text style={styles.insightLabel}>{item.label}</Text>
                <Text style={styles.insightValue}>{item.value}</Text>
              </View>
            ))}
          </View>
        </Card>

        <Card style={styles.goalsCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Metas</Text>
            <Pressable onPress={() => router.push('/progress' as never)}>
              <Text style={styles.linkText}>Ver todas</Text>
            </Pressable>
          </View>

          {goals.length === 0 ? (
            <Text style={styles.emptyState}>Ainda não há metas cadastradas para este período.</Text>
          ) : (
            <View style={styles.goalList}>
              {goals.slice(0, 3).map((goal) => {
                const percent = normalizeProgress(safeNumber(goal.progressPercent ?? 0, 0));

                return (
                  <View key={goal.id} style={styles.goalItem}>
                    <View style={styles.goalHeader}>
                      <Text style={styles.goalTitle}>{formatGoalType(goal.type)}</Text>
                      <Text style={styles.goalPercent}>{percent}%</Text>
                    </View>
                    <Text style={styles.goalMeta}>
                      {formatMinutesLabel(safeNumber(goal.progressMinutes ?? 0, 0))} / {formatMinutesLabel(safeNumber(goal.targetMinutes ?? 0, 0))}
                    </Text>
                    <View style={styles.progressBarTrack}>
                      <View style={[styles.progressBarFill, { width: `${percent}%` }]} />
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </Card>

        <Card style={styles.settingsCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Configurações</Text>
          </View>
          <Text style={styles.emptyState}>Nenhuma configuração sincronizada com o servidor está disponível no momento.</Text>
        </Card>

        <Card style={styles.achievementCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Conquistas</Text>
          </View>

          {achievements.length === 0 ? (
            <Text style={styles.emptyState}>Ainda não há conquistas disponíveis para este perfil.</Text>
          ) : (
            <View style={styles.achievementList}>
              {achievements.map((achievement) => (
                <View key={achievement.id} style={[styles.achievementItem, !achievement.unlocked && styles.achievementLocked]}>
                  <View style={styles.achievementIconWrap}>
                    <Ionicons name={achievement.unlocked ? 'trophy' : 'trophy-outline'} size={18} color={achievement.unlocked ? '#F59E0B' : colors.neutralGray} />
                  </View>
                  <View style={styles.achievementContent}>
                    <Text style={styles.achievementName}>{achievement.name ?? 'Conquista'}</Text>
                    <Text style={styles.achievementDescription}>{achievement.description ?? 'Conquista desbloqueada'}</Text>
                  </View>
                  <Text style={styles.achievementProgress}>{achievement.unlocked ? 'Concluída' : 'Pendente'}</Text>
                </View>
              ))}
            </View>
          )}
        </Card>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      </ScrollView>

      <NavBar
        tabs={navTabs}
        activeTabId="profile"
        onSelectTab={(tabId) => {
          if (tabId === 'add') {
            router.push('/chats' as never);
            return;
          }

          if (tabId === 'home') {
            router.push('/' as never);
            return;
          }

          if (tabId === 'cycles') {
            router.push('/ciclos' as never);
            return;
          }

          if (tabId === 'progress') {
            router.push('/progress' as never);
            return;
          }

          if (tabId === 'profile') {
            router.push('/profile' as never);
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
    paddingTop: 14,
    paddingBottom: 104,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  brandWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.softBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    color: colors.darkBlue,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.softBlue,
  },
  userCard: {
    padding: 18,
    backgroundColor: '#EAF3FF',
    borderColor: '#D7E7FF',
    marginBottom: 18,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarWrap: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userTextContainer: {
    flex: 1,
    marginLeft: 14,
  },
  userName: {
    color: colors.darkBlue,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  userEmail: {
    color: colors.neutralGray,
    fontSize: 13,
  },
  editButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  detailsCard: {
    padding: 18,
    marginBottom: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    color: colors.darkBlue,
    fontSize: 20,
    fontWeight: '800',
  },
  detailsList: {
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF3FF',
  },
  detailLabel: {
    color: colors.neutralGray,
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
  detailValue: {
    color: colors.darkBlue,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
    flexShrink: 1,
  },
  summaryCard: {
    padding: 18,
    marginBottom: 18,
  },
  journeyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  journeyCard: {
    width: '48%',
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#F8FBFF',
    borderWidth: 1,
    borderColor: '#EAF3FF',
  },
  journeyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  journeyTitle: {
    color: colors.neutralGray,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  journeyValue: {
    color: colors.darkBlue,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  journeyLabel: {
    color: colors.neutralGray,
    fontSize: 11,
  },
  insightsCard: {
    padding: 18,
    marginBottom: 18,
  },
  insightsList: {
    gap: 10,
  },
  insightItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF3FF',
  },
  insightLabel: {
    color: colors.neutralGray,
    fontSize: 12,
    fontWeight: '600',
  },
  insightValue: {
    color: colors.darkBlue,
    fontSize: 13,
    fontWeight: '700',
  },
  goalsCard: {
    padding: 18,
    marginBottom: 18,
  },
  linkText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  goalList: {
    gap: 14,
  },
  goalItem: {
    backgroundColor: '#F8FBFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EAF3FF',
    padding: 14,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  goalTitle: {
    color: colors.darkBlue,
    fontSize: 14,
    fontWeight: '700',
  },
  goalPercent: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  goalMeta: {
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
    backgroundColor: colors.primary,
  },
  settingsCard: {
    padding: 18,
    marginBottom: 18,
  },
  emptyState: {
    color: colors.neutralGray,
    fontSize: 13,
    lineHeight: 20,
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
  achievementContent: {
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
    fontSize: 11,
    fontWeight: '700',
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
