import { setMessageFeedback } from '../chat';

describe('setMessageFeedback', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    fetchMock.mockReset();
  });

  const reply = (status: number, body: object) => ({ ok: status < 400, status, text: async () => JSON.stringify(body) });

  it.each([['up'], ['down'], [null]] as const)('envia PATCH com feedback %s e o cookie de login', async (feedback) => {
    fetchMock.mockResolvedValueOnce(reply(200, { id: 'm1', feedback }));

    const result = await setMessageFeedback('c1', 'm1', feedback);

    expect(result).toEqual({ id: 'm1', feedback });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/chats/c1/messages/m1/feedback');
    expect(init).toMatchObject({ method: 'PATCH', credentials: 'include' });
    expect(JSON.parse(init.body)).toEqual({ feedback }); // null vai explícito: é o que remove a avaliação
  });

  it('erro do servidor vira exceção com a mensagem', async () => {
    fetchMock.mockResolvedValueOnce(reply(400, { message: 'Só é possível avaliar respostas da IA.' }));
    await expect(setMessageFeedback('c1', 'm1', 'up')).rejects.toThrow('Só é possível avaliar respostas da IA.');
  });
});
