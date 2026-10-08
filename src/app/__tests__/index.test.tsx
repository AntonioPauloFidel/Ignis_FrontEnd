import {
    getCurrentUser,
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
});
