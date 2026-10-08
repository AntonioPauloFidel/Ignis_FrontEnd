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
  [key: string]: unknown;
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
  return requestJson<UserStats>('/users/me/stats');
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

export async function getStudyHistory(): Promise<StudyCycle[]> {
  const data = await requestJson<{ items?: StudyCycle[]; cycles?: StudyCycle[]; data?: StudyCycle[] }>(
    '/study-cycles/history',
  );

  if (Array.isArray(data)) {
    return data;
  }

  return (
    data?.items ??
    data?.cycles ??
    data?.data ??
    []
  );
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
