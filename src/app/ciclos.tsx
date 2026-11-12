import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  getActiveStudyCycle,
  getStudyHistoryPage,
  renameStudyCycle,
  type StudyCycle,
  type StudyHistoryPagination,
  type StudyHistorySummary,
} from '../api/home';
import { Card } from '../components/Card';
import { NavBar, type TabItem } from '../components/NavBar';
import { colors } from '../constants/colors';
import {
  CYCLE_TITLE_MAX,
  cycleTitle,
  formatCycleDate,
  formatCycleDuration,
  formatPausedTime,
  normalizeTitleInput,
} from '../utils/cycles';

const PAGE_SIZE = 20;

type ApiError = Error & { status?: number };

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

interface TitleEditorProps {
  value: string;
  saving: boolean;
  error: string;
  onChange: (text: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

function TitleEditor({ value, saving, error, onChange, onSave, onCancel }: TitleEditorProps) {
  return (
    <View style={styles.editor}>
      <TextInput
        testID="cycle-title-input"
        value={value}
        onChangeText={onChange}
        maxLength={CYCLE_TITLE_MAX}
        placeholder="Dê um nome ao ciclo"
        placeholderTextColor={colors.neutralGray}
        autoFocus
        editable={!saving}
        onSubmitEditing={onSave}
        returnKeyType="done"
        style={styles.input}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <View style={styles.editorActions}>
        <Pressable onPress={onCancel} disabled={saving} style={styles.ghostButton} accessibilityRole="button">
          <Text style={styles.ghostButtonText}>Cancelar</Text>
        </Pressable>
        <Pressable
          testID="cycle-title-save"
          onPress={onSave}
          disabled={saving}
          style={[styles.primaryButton, saving && styles.disabled]}
          accessibilityRole="button"
        >
          {saving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Salvar</Text>}
        </Pressable>
      </View>
    </View>
  );
}

export default function CyclesScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [active, setActive] = useState<StudyCycle | null>(null);
  const [items, setItems] = useState<StudyCycle[]>([]);
  const [pagination, setPagination] = useState<StudyHistoryPagination | null>(null);
  const [summary, setSummary] = useState<StudyHistorySummary | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [activeCycle, history] = await Promise.all([
        getActiveStudyCycle(),
        getStudyHistoryPage({ page: 1, limit: PAGE_SIZE }),
      ]);

      setActive(activeCycle);
      setItems(history.data);
      setPagination(history.pagination);
      setSummary(history.summary);
    } catch (caught) {
      if ((caught as ApiError)?.status === 401) {
        router.replace('/login');
        return;
      }
      setError('Não foi possível carregar seus ciclos.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  async function loadMore() {
    if (!pagination || loadingMore || pagination.page >= pagination.totalPages) return;

    setLoadingMore(true);

    try {
      const next = await getStudyHistoryPage({ page: pagination.page + 1, limit: PAGE_SIZE });
      setItems((current) => {
        const known = new Set(current.map((item) => String(item.id)));
        return [...current, ...next.data.filter((item) => !known.has(String(item.id)))];
      });
      setPagination(next.pagination);
    } catch (caught) {
      if ((caught as ApiError)?.status === 401) {
        router.replace('/login');
        return;
      }
      setError('Não foi possível carregar mais ciclos.');
    } finally {
      setLoadingMore(false);
    }
  }

  function startEditing(cycle: StudyCycle) {
    setEditingId(String(cycle.id));
    setDraft(typeof cycle.title === 'string' ? cycle.title : '');
    setEditError('');
  }

  function stopEditing() {
    setEditingId(null);
    setDraft('');
    setEditError('');
  }

  async function saveTitle(cycle: StudyCycle) {
    setSaving(true);
    setEditError('');

    try {
      const updated = await renameStudyCycle(cycle.id, normalizeTitleInput(draft));
      const title = updated?.title ?? null;
      const apply = (item: StudyCycle) => (String(item.id) === String(cycle.id) ? { ...item, title } : item);

      setItems((current) => current.map(apply));
      setActive((current) => (current ? apply(current) : current));
      stopEditing();
    } catch (caught) {
      if ((caught as ApiError)?.status === 401) {
        router.replace('/login');
        return;
      }
      setEditError((caught as Error)?.message || 'Não foi possível salvar o título.');
    } finally {
      setSaving(false);
    }
  }

  function renderEditor(cycle: StudyCycle) {
    return (
      <TitleEditor
        value={draft}
        saving={saving}
        error={editError}
        onChange={setDraft}
        onSave={() => saveTitle(cycle)}
        onCancel={stopEditing}
      />
    );
  }

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loaderText}>Carregando ciclos...</Text>
      </View>
    );
  }

  const total = pagination?.total ?? items.length;
  const hasMore = !!pagination && pagination.page < pagination.totalPages;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} hitSlop={10}>
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

        <Text style={styles.subtitle}>SEUS CICLOS</Text>

        {error ? (
          <Card style={styles.card}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={load} style={[styles.primaryButton, styles.retryButton]} accessibilityRole="button">
              <Text style={styles.primaryButtonText}>Tentar de novo</Text>
            </Pressable>
          </Card>
        ) : null}

        <View style={styles.summaryRow}>
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{total}</Text>
            <Text style={styles.summaryLabel}>Concluídos</Text>
          </Card>
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{formatCycleDuration(Number(summary?.totalStudyMinutes ?? 0))}</Text>
            <Text style={styles.summaryLabel}>Estudados</Text>
          </Card>
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{Number(summary?.totalIgnisEarned ?? 0)}</Text>
            <Text style={styles.summaryLabel}>IGNIS</Text>
          </Card>
        </View>

        {active ? (
          <Card style={[styles.card, styles.activeCard]} testID="active-cycle">
            <View style={styles.rowBetween}>
              <Text style={styles.activeBadge}>{active.status === 'paused' ? 'PAUSADO' : 'EM ANDAMENTO'}</Text>
              {editingId !== String(active.id) ? (
                <Pressable
                  testID="edit-active-title"
                  onPress={() => startEditing(active)}
                  hitSlop={10}
                  accessibilityLabel="Editar título do ciclo"
                >
                  <Ionicons name="create-outline" size={20} color={colors.primary} />
                </Pressable>
              ) : null}
            </View>
            <Text style={styles.itemTitle}>{cycleTitle(active)}</Text>
            <Text style={styles.itemMeta}>
              {formatCycleDuration(Number(active.durationMinutes ?? 0))} · iniciado {formatCycleDate(active.startedAt).toLowerCase()}
            </Text>
            {editingId === String(active.id) ? renderEditor(active) : null}
            <Pressable onPress={() => router.push('/')} style={[styles.primaryButton, styles.timerButton]} accessibilityRole="button">
              <Text style={styles.primaryButtonText}>Voltar ao cronômetro</Text>
            </Pressable>
          </Card>
        ) : null}

        <Text style={styles.sectionTitle}>Concluídos</Text>

        {items.length === 0 && !error ? (
          <Card style={styles.card} testID="empty-cycles">
            <Text style={styles.emptyTitle}>Nenhum ciclo concluído ainda</Text>
            <Text style={styles.emptyText}>Comece um ciclo na tela inicial. Ele aparece aqui quando você terminar.</Text>
            <Pressable onPress={() => router.push('/')} style={[styles.primaryButton, styles.timerButton]} accessibilityRole="button">
              <Text style={styles.primaryButtonText}>Iniciar um ciclo</Text>
            </Pressable>
          </Card>
        ) : null}

        {items.map((cycle) => {
          const id = String(cycle.id);
          const paused = formatPausedTime(cycle.pausedSeconds);

          return (
            <Card key={id} style={styles.card} testID={`cycle-${id}`}>
              <View style={styles.rowBetween}>
                <View style={styles.itemText}>
                  <Text style={styles.itemTitle} numberOfLines={2}>
                    {cycleTitle(cycle)}
                  </Text>
                  <Text style={styles.itemMeta}>
                    {[formatCycleDate(cycle.completedAt), formatCycleDuration(Number(cycle.durationMinutes ?? 0))]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                  {paused ? <Text style={styles.itemMeta}>{paused}</Text> : null}
                </View>

                <View style={styles.itemSide}>
                  <Text style={styles.ignisBadge}>+{Number(cycle.ignisEarned ?? 0)} IGNIS</Text>
                  {editingId !== id ? (
                    <Pressable
                      testID={`edit-title-${id}`}
                      onPress={() => startEditing(cycle)}
                      hitSlop={10}
                      accessibilityLabel="Editar título do ciclo"
                    >
                      <Ionicons name="create-outline" size={20} color={colors.primary} />
                    </Pressable>
                  ) : null}
                </View>
              </View>

              {editingId === id ? renderEditor(cycle) : null}
            </Card>
          );
        })}

        {hasMore ? (
          <Pressable
            testID="load-more"
            onPress={loadMore}
            disabled={loadingMore}
            style={[styles.ghostButton, styles.moreButton]}
            accessibilityRole="button"
          >
            {loadingMore ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={styles.ghostButtonText}>Carregar mais</Text>
            )}
          </Pressable>
        ) : null}
      </ScrollView>

      <NavBar
        tabs={navTabs}
        activeTabId="cycles"
        onSelectTab={(tabId) => {
          if (tabId === 'home') {
            router.push('/');
            return;
          }

          if (tabId === 'progress') {
            router.push('/progress' as never);
            return;
          }

          if (tabId === 'profile') {
            router.push('/profile' as never);
            return;
          }

          if (tabId === 'add') {
            router.push('/chats' as never);
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
    fontWeight: '700',
    letterSpacing: 1,
    color: colors.neutralGray,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    width: undefined,
    padding: 12,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.darkBlue,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.neutralGray,
    marginTop: 2,
  },
  card: {
    marginBottom: 12,
  },
  activeCard: {
    borderColor: colors.primary,
  },
  activeBadge: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: colors.primary,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.darkBlue,
    marginTop: 8,
    marginBottom: 10,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  itemText: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.darkBlue,
  },
  itemMeta: {
    fontSize: 13,
    color: colors.neutralGray,
    marginTop: 3,
  },
  itemSide: {
    alignItems: 'flex-end',
    gap: 10,
  },
  ignisBadge: {
    fontSize: 12,
    fontWeight: '800',
    color: '#047857',
    backgroundColor: '#D1FAE5',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  editor: {
    marginTop: 12,
    gap: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.darkBlue,
    backgroundColor: '#FFFFFF',
  },
  editorActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 96,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  ghostButton: {
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  ghostButtonText: {
    color: colors.darkBlue,
    fontWeight: '700',
    fontSize: 14,
  },
  disabled: {
    opacity: 0.6,
  },
  timerButton: {
    marginTop: 14,
    alignSelf: 'flex-start',
  },
  retryButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  moreButton: {
    alignSelf: 'center',
    marginTop: 4,
    minWidth: 160,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.darkBlue,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.neutralGray,
    marginTop: 6,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
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
    marginTop: 12,
  },
  navBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});
