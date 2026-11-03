import { acceptNotice, hasAcceptedNotice, resetNoticeSession } from '../privacy-notice';

const memoryStore = () => {
  const data: Record<string, string> = {};
  return {
    getItem: (key: string) => data[key] ?? null,
    setItem: (key: string, value: string) => {
      data[key] = value;
    },
  };
};

const blockedStore = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
};

beforeEach(() => resetNoticeSession());

describe('aviso de privacidade', () => {
  it('aparece na primeira vez e não volta depois de aceito', () => {
    const store = memoryStore();

    expect(hasAcceptedNotice(store)).toBe(false);
    acceptNotice(store);
    resetNoticeSession(); // simula abrir o app de novo: só o armazenamento persiste
    expect(hasAcceptedNotice(store)).toBe(true);
  });

  it('não quebra com o armazenamento bloqueado e vale durante a sessão', () => {
    expect(hasAcceptedNotice(blockedStore)).toBe(false);
    expect(() => acceptNotice(blockedStore)).not.toThrow();
    expect(hasAcceptedNotice(blockedStore)).toBe(true);
  });

  it('funciona sem armazenamento nenhum (app nativo)', () => {
    expect(hasAcceptedNotice(null)).toBe(false);
    acceptNotice(null);
    expect(hasAcceptedNotice(null)).toBe(true);
  });
});
