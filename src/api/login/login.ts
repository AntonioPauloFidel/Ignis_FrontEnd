const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginUser {
  id: string;
  name: string;
  age: number;
  email: string;
  phone: string;
}

export interface LoginResponse {
  accessToken: string;
  user: LoginUser;
}

export async function loginUser(
  payload: LoginPayload,
): Promise<LoginResponse> {
  const response = await fetch(
    `${API_BASE_URL}/auth/login`,
    {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data?.message ?? 'Erro ao fazer login.',
    );
  }

  return data as LoginResponse;
}
