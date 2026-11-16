import { sendMessageStream, setMessageFeedback } from '../chat';

const mockStreamFetch = jest.fn();
// No celular o streaming usa o fetch do Expo; o jest-expo roda como celular
jest.mock('expo/fetch', () => ({ fetch: (...args: unknown[]) => mockStreamFetch(...args) }));

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

describe('sendMessageStream (corpo do envio)', () => {
  const fetchMock = mockStreamFetch;

  const streamOk = () => ({
    ok: true,
    body: {
      getReader: () => {
        let done = false;
        return {
          read: async () => {
            if (done) return { done: true, value: undefined };
            done = true;
            return { done: false, value: new TextEncoder().encode('data: {"type":"delta","content":"oi"}\n\ndata: {"type":"done"}\n\n') };
          },
        };
      },
    },
  });

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockImplementation(async () => streamOk());
  });

  it('envio normal não manda replaceLast', async () => {
    const pieces: string[] = [];
    await sendMessageStream('c1', 'pergunta', (p: string) => pieces.push(p));

    expect(pieces).toEqual(['oi']);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ content: 'pergunta' });
  });

  it('refazer manda replaceLast: true', async () => {
    await sendMessageStream('c1', 'pergunta', () => undefined, undefined, undefined, true);

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ content: 'pergunta', replaceLast: true });
  });
});
