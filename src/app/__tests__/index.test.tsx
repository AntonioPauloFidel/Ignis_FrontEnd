import {
    getCurrentUser,
    getGoals,
    getStudyHistoryPage,
    getStudyStats,
    startStudyCycle,
} from '../../api/home';

describe('Home API layer', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    fetchMock.mockReset();
  });

  it('returns the authenticated user from /auth/me', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ id: 'user-1', name: 'João' }),
    });

    const user = await getCurrentUser();

    expect(user.name).toBe('João');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/auth/me'),
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('throws an error when the session is expired or unauthorized', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => JSON.stringify({ message: 'Unauthorized' }),
    });

    await expect(getCurrentUser()).rejects.toThrow('Unauthorized');
  });

  it('loads study stats and starts a cycle with the selected duration', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ cyclesToday: 4, todayStudyMinutes: 145 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ id: 'cycle-1', status: 'running', durationMinutes: 25 }),
      });

    const stats = await getStudyStats();
    const cycle = await startStudyCycle({ durationMinutes: 25 });

    expect(stats.cyclesToday).toBe(4);
    expect(cycle.status).toBe('running');
    expect(fetchMock.mock.calls[1][0]).toContain('/study-cycles/start');
  });

  it('loads goal data from /goals', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify([
        {
          id: 2,
          type: 'DAILY',
          targetMinutes: 60,
          progressMinutes: 25,
          progressPercent: 42,
          completed: false,
        },
      ]),
    });

    const goals = await getGoals();

    expect(goals).toHaveLength(1);
    expect(goals[0].type).toBe('DAILY');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/goals'),
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('returns paginated study history for a date range', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        data: [{
          id: 10,
          durationMinutes: 25,
          startedAt: '2026-10-15T12:00:00.000Z',
          completedAt: '2026-10-15T12:25:00.000Z',
          ignisEarned: 25,
        }],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        summary: { totalStudyMinutes: 25, totalIgnisEarned: 25, averageStudyMinutes: 25 },
      }),
    });

    const history = await getStudyHistoryPage({
      startDate: '2026-10-15T00:00:00.000Z',
      endDate: '2026-10-15T23:59:59.999Z',
    });

    expect(history.data[0].ignisEarned).toBe(25);
    expect(history.pagination.total).toBe(1);
    expect(history.summary.totalIgnisEarned).toBe(25);
  });
});
