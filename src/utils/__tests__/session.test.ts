import { acceptNotice, hasAcceptedNotice, resetNoticeSession } from '../privacy-notice';
import { clearClientSession, clearReadableCookies, signOut } from '../session';

const makeStorage = (initial: Record<string, string> = {}) => {
  const data = { ...initial };
  return {
    data,
    clear: jest.fn(() => {
      for (const key of Object.keys(data)) delete data[key];
    }),
  };
};

const makeJar = (cookie: string) => {
  const writes: string[] = [];
  return { writes, read: () => cookie, write: (value: string) => writes.push(value) };
};

describe('clearReadableCookies', () => {
  it('expira cada cookie visível, inclusive nos domínios do host', () => {
    const jar = makeJar('tema=escuro; outro=1');
    clearReadableCookies(jar, 'app.exemplo.com');

    expect(jar.writes).toHaveLength(6); // 2 cookies x 3 variações de domínio
    expect(jar.writes.every((w) => w.includes('expires=Thu, 01 Jan 1970') && w.includes('path=/'))).toBe(true);
    expect(jar.writes.some((w) => w.startsWith('tema=') && w.includes('domain=.app.exemplo.com'))).toBe(true);
  });

  it('não escreve nada quando não há cookies', () => {
    const jar = makeJar('');
    clearReadableCookies(jar);
    expect(jar.writes).toEqual([]);
  });
});

describe('clearClientSession', () => {
  afterEach(() => resetNoticeSession());

  it('limpa localStorage, sessionStorage, cookies e o aviso aceito na sessão', () => {
    const local = makeStorage({ 'ignis:ai-privacy-accepted': '1', outro: 'x' });
    const session = makeStorage({ rascunho: 'texto' });
    const jar = makeJar('a=1');
    acceptNotice(null);
    expect(hasAcceptedNotice(null)).toBe(true);

    clearClientSession({ localStorage: local, sessionStorage: session, cookies: jar });

    expect(local.data).toEqual({});
    expect(session.data).toEqual({});
    expect(jar.writes.length).toBeGreaterThan(0);
    expect(hasAcceptedNotice(null)).toBe(false);
  });

  it('um armazenamento bloqueado não impede limpar os outros', () => {
    const quebrado = {
      clear: () => {
        throw new Error('bloqueado');
      },
    };
    const session = makeStorage({ a: '1' });

    expect(() => clearClientSession({ localStorage: quebrado, sessionStorage: session })).not.toThrow();
    expect(session.data).toEqual({});
  });

  it('funciona sem navegador (app nativo)', () => {
    expect(() => clearClientSession({})).not.toThrow();
  });
});

describe('signOut', () => {
  it('chama a API e depois limpa os dados do aparelho', async () => {
    const ordem: string[] = [];
    const result = await signOut(
      async () => {
        ordem.push('api');
      },
      () => ordem.push('limpar'),
    );

    expect(result).toEqual({ ok: true });
    expect(ordem).toEqual(['api', 'limpar']);
  });

  it('se a API falhar, não limpa nada e avisa', async () => {
    const clear = jest.fn();
    const result = await signOut(async () => {
      throw new Error('Network request failed');
    }, clear);

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ message: expect.stringContaining('Não foi possível sair') });
    expect(clear).not.toHaveBeenCalled();
  });

  it('login já expirado (401) conta como saída e limpa os dados', async () => {
    const clear = jest.fn();
    const result = await signOut(async () => {
      throw Object.assign(new Error('Unauthorized'), { status: 401 });
    }, clear);

    expect(result).toEqual({ ok: true });
    expect(clear).toHaveBeenCalledTimes(1);
  });
});
