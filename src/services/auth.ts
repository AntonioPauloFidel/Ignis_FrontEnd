import {
    loginUser,
    type LoginPayload,
    type LoginResponse,
} from '../api/login';



export async function signIn(
  payload: LoginPayload,
): Promise<LoginResponse> {
  console.log('SIGN IN EXECUTADO');

  return await loginUser(payload);
}