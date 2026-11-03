export interface NoticeStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const KEY = 'ignis:ai-privacy-accepted';

// Vale na sessão mesmo quando o armazenamento do navegador está bloqueado ou não existe (app nativo)
let acceptedInSession = false;

function browserStore(): NoticeStore | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null; // acesso bloqueado (modo privado, cookies desativados)
  }
}

export function hasAcceptedNotice(store: NoticeStore | null = browserStore()): boolean {
  if (acceptedInSession) return true;

  try {
    return store?.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function acceptNotice(store: NoticeStore | null = browserStore()): void {
  acceptedInSession = true;

  try {
    store?.setItem(KEY, '1');
  } catch {
    // sem armazenamento: o aviso volta na próxima visita, mas não quebra
  }
}

/** Só para os testes: limpa o estado da sessão. */
export function resetNoticeSession(): void {
  acceptedInSession = false;
}
