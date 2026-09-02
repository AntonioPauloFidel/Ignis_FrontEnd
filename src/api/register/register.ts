const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export interface RegisterPayload {
  name: string;
  age: number;
  email: string;
  phone: string;
  password: string;
}

export interface RegisterUser {
  id: string;
  name: string;
  age: number;
  email: string;
  phone: string;
  createdAt: string;
}

export interface RegisterResponse {
  message: string;
  user: RegisterUser;
}

export async function registerUser(
  payload: RegisterPayload,
): Promise<RegisterResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.message ?? 'Erro ao realizar cadastro.');
  }

  return data as RegisterResponse;
}

export default registerUser;
