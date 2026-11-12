const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export type CycleStatus = 'idle' | 'running' | 'paused' | 'completed' | 'cancelled';

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  avatar?: string | null;
  ignisPoints?: number;
  currentStreak?: number;
  longestStreak?: number;
}

export interface UserStats {
  id?: string;
  userId?: string;
  ignisPoints?: number;
  currentStreak?: number;
  longestStreak?: number;
  totalStudyMinutes?: number;
  todayStudyMinutes?: number;
  todayCycles?: number;
  completedCycles?: number;
  user?: {
    id?: string;
    name?: string;
    email?: string;
  };
  stats?: Partial<UserStats>;
}

export interface StudyCycle {
  id: string;
  userId?: string;
  status?: CycleStatus;
  durationMinutes?: number;
  startedAt?: string | null;
  completedAt?: string | null;
  pausedAt?: string | null;
  remainingSeconds?: number | null;
  remainingTimeSeconds?: number | null;
  remainingMs?: number | null;
  totalDurationMs?: number | null;
  ignisReward?: number;
  ignisEarned?: number;
  title?: string | null;
  pausedSeconds?: number;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface StudyStats {
  cyclesToday?: number;
  todayStudyMinutes?: number;
  igisPointsEarnedToday?: number;
  ignisPointsEarnedToday?: number;
  currentStreak?: number;
  longestStreak?: number;
  totalFocusMinutes?: number;
  totalStudyMinutes?: number;
  totalIgnisEarned?: number;
  weekStudyMinutes?: number;
  averageStudyMinutes?: number;
  completedCycles?: number;
  [key: string]: unknown;
}

export type GoalType = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export interface Goal {
  id: number | string;
  type: GoalType;
  targetMinutes: number;
  startDate?: string;
  endDate?: string;
  progressMinutes?: number;
  progressPercent?: number;
  completed?: boolean;
  createdAt?: string;
  [key: string]: unknown;
}

export interface GoalPayload {
  type: GoalType;
  targetMinutes: number;
}

export interface StudyHistoryPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface StudyHistorySummary {
  totalStudyMinutes?: number;
  totalIgnisEarned?: number;
  averageStudyMinutes?: number;
  [key: string]: unknown;
}

export interface StudyHistoryResponse {
  data: StudyCycle[];
  pagination: StudyHistoryPagination;
  summary: StudyHistorySummary;
}

export interface Achievement {
  id: string;
  name?: string;
  title?: string;
  description?: string;
  unlocked?: boolean;
  progress?: number;
  target?: number;
  icon?: string;
  achievedAt?: string | null;
  [key: string]: unknown;
}

export interface StartCyclePayload {
  durationMinutes: number;
}

interface ApiError extends Error {
  status?: number;
}

async function requestJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init.headers ?? {}),
    },
  });

  const raw = await response.text();
  const data = raw ? JSON.parse(raw) : null;

  if (!response.ok) {
    const error = new Error(
      data?.message ?? data?.error ?? 'Erro ao acessar a API.',
    ) as ApiError;
    error.status = response.status;
    throw error;
  }

  return (data ?? null) as T;
}

export async function getCurrentUser(): Promise<UserProfile> {
  return requestJson<UserProfile>('/auth/me');
}

export async function getUserStats(): Promise<UserStats> {
  const data = await requestJson<{ user?: UserStats['user']; stats?: Partial<UserStats> } | UserStats>('/users/me/stats');

  if (data && 'stats' in data && data.stats) {
    return {
      ...data.stats,
      user: data.user,
    } as UserStats;
  }

  return data as UserStats;
}

export async function getActiveStudyCycle(): Promise<StudyCycle | null> {
  try {
    return await requestJson<StudyCycle>('/study-cycles/active');
  } catch (error) {
    const status = (error as ApiError)?.status;
    if (status === 404 || status === 204 || status === 400) {
      return null;
    }
    throw error;
  }
}

export async function getStudyStats(): Promise<StudyStats> {
  return requestJson<StudyStats>('/study-cycles/stats');
}

export async function getGoals(): Promise<Goal[]> {
  const data = await requestJson<{ items?: Goal[]; goals?: Goal[]; data?: Goal[] } | Goal[]>(
    '/goals',
  );

  if (Array.isArray(data)) {
    return data;
  }

  return data?.items ?? data?.goals ?? data?.data ?? [];
}

export async function createGoal(payload: GoalPayload): Promise<Goal> {
  return requestJson<Goal>('/goals', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export async function deleteGoal(goalId: number | string): Promise<void> {
  await requestJson(`/goals/${goalId}`, {
    method: 'DELETE',
  });
}

export async function getStudyHistoryPage(params: {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
} = {}): Promise<StudyHistoryResponse> {
  const query = new URLSearchParams();

  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.startDate) query.set('startDate', params.startDate);
  if (params.endDate) query.set('endDate', params.endDate);

  const path = `/study-cycles/history${query.toString() ? `?${query.toString()}` : ''}`;
  const data = await requestJson<
    | StudyHistoryResponse
    | { items?: StudyCycle[]; cycles?: StudyCycle[]; data?: StudyCycle[]; pagination?: StudyHistoryPagination; summary?: StudyHistorySummary }
    | StudyCycle[]
  >(path);

  if (Array.isArray(data)) {
    return {
      data,
      pagination: {
        page: 1,
        limit: data.length,
        total: data.length,
        totalPages: data.length > 0 ? 1 : 0,
      },
      summary: {
        totalStudyMinutes: 0,
        totalIgnisEarned: 0,
        averageStudyMinutes: 0,
      },
    };
  }

  const objectData =
    data && typeof data === 'object' && !Array.isArray(data)
      ? (data as {
          data?: StudyCycle[];
          items?: StudyCycle[];
          cycles?: StudyCycle[];
        })
      : undefined;

  const historyData =
    (Array.isArray(objectData?.data) ? objectData.data : undefined) ??
    (Array.isArray(objectData?.items) ? objectData.items : undefined) ??
    (Array.isArray(objectData?.cycles) ? objectData.cycles : undefined) ??
    [];

  return {
    data: Array.isArray(historyData) ? historyData : [],
    pagination: data?.pagination ?? {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    },
    summary: data?.summary ?? {
      totalStudyMinutes: 0,
      totalIgnisEarned: 0,
      averageStudyMinutes: 0,
    },
  };
}

export async function getStudyHistory(): Promise<StudyCycle[]> {
  const response = await getStudyHistoryPage();
  return response.data;
}

export async function getAchievements(): Promise<Achievement[]> {
  const data = await requestJson<{ items?: Achievement[]; achievements?: Achievement[]; data?: Achievement[] }>(
    '/achievements',
  );

  if (Array.isArray(data)) {
    return data;
  }

  return (
    data?.items ??
    data?.achievements ??
    data?.data ??
    []
  );
}

export async function startStudyCycle(payload: StartCyclePayload): Promise<StudyCycle> {
  return requestJson<StudyCycle>('/study-cycles/start', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export async function pauseStudyCycle(cycleId: string): Promise<StudyCycle> {
  return requestJson<StudyCycle>(`/study-cycles/${cycleId}/pause`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export async function resumeStudyCycle(cycleId: string): Promise<StudyCycle> {
  return requestJson<StudyCycle>(`/study-cycles/${cycleId}/resume`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export async function completeStudyCycle(cycleId: string): Promise<StudyCycle> {
  return requestJson<StudyCycle>(`/study-cycles/${cycleId}/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export async function cancelStudyCycle(cycleId: string): Promise<StudyCycle> {
  return requestJson<StudyCycle>(`/study-cycles/${cycleId}/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export async function logoutUser(): Promise<void> {
  await requestJson('/auth/logout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export async function renameStudyCycle(cycleId: string | number, title: string): Promise<StudyCycle> {
  return requestJson<StudyCycle>(`/study-cycles/${cycleId}/title`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title }),
  });
}
