import { resetNoticeSession } from './privacy-notice';

export interface ClientSessionEnv {
  localStorage?: { clear(): void } | null;
  sessionStorage?: { clear(): void } | null;
  cookies?: { read(): string; write(value: string): void } | null;
  hostname?: string;
}

const EXPIRED = 'Thu, 01 Jan 1970 00:00:00 GMT';

function browserEnv(): ClientSessionEnv {
  const env: ClientSessionEnv = {};

  // Cada acesso pode lançar erro (modo privado, cookies bloqueados) e não pode impedir o logout
  try {
    env.localStorage = typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {}

  try {
    env.sessionStorage = typeof sessionStorage !== 'undefined' ? sessionStorage : null;
  } catch {}

  try {
    if (typeof document !== 'undefined') {
      env.cookies = {
        read: () => document.cookie,
        write: (value) => {
          document.cookie = value;
        },
      };
      env.hostname = typeof location !== 'undefined' ? location.hostname : undefined;
    }
  } catch {}

  return env;
}

/** Apaga os cookies que o navegador deixa o script ver (o cookie de login é HttpOnly e quem apaga é a API). */
export function clearReadableCookies(cookies: NonNullable<ClientSessionEnv['cookies']>, hostname?: string) {
  const names = cookies
    .read()
    .split(';')
    .map((part) => part.split('=')[0].trim())
    .filter(Boolean);

  const domains = hostname ? [undefined, hostname, `.${hostname}`] : [undefined];

  for (const name of names) {
    for (const domain of domains) {
      cookies.write(`${name}=; expires=${EXPIRED}; max-age=0; path=/${domain ? `; domain=${domain}` : ''}`);
    }
  }
}

/** Remove tudo que o app guardou no aparelho para o próximo usuário não herdar nada. */
export function clearClientSession(env: ClientSessionEnv = browserEnv()): void {
  for (const clear of [
    () => env.localStorage?.clear(),
    () => env.sessionStorage?.clear(),
    () => env.cookies && clearReadableCookies(env.cookies, env.hostname),
    () => resetNoticeSession(),
  ]) {
    try {
      clear();
    } catch {
      // um armazenamento bloqueado não pode impedir a limpeza dos outros
    }
  }
}

export type SignOutResult = { ok: true } | { ok: false; message: string };

/**
 * Encerra a sessão: pede à API para apagar o cookie de login e só então limpa os dados do aparelho.
 * Se a API não responder, a sessão continua valendo, então avisamos em vez de fingir que saiu.
 */
export async function signOut(
  logout: () => Promise<void>,
  clear: () => void = clearClientSession,
): Promise<SignOutResult> {
  try {
    await logout();
  } catch (error) {
    // 401: o login já tinha expirado, então a sessão já acabou
    if ((error as { status?: number })?.status !== 401) {
      return { ok: false, message: 'Não foi possível sair agora. Verifique a conexão e tente novamente.' };
    }
  }

  clear();
  return { ok: true };
}
