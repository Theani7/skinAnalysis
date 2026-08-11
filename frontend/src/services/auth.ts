import api, { ApiError, API_BASE_URL } from './api';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  created_at: string;
  profile_data?: Record<string, any>;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

const TOKEN_KEY = 'skinai_token';
const USER_KEY = 'skinai_user';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.id && parsed.email) {
      return parsed as AuthUser;
    }
    return null;
  } catch {
    return null;
  }
}

export function storeAuth(token: string, user: AuthUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isAuthenticated(): boolean {
  return !!getStoredToken();
}

export async function registerUser(
  name: string,
  email: string,
  password: string
): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>('/auth/register', {
    name,
    email,
    password,
  });
  return response.data;
}

export async function loginUser(
  email: string,
  password: string
): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>('/auth/login', {
    email,
    password,
  });
  return response.data;
}

export async function updateProfile(
  name: string,
  profile_data?: Record<string, any>
): Promise<AuthUser> {
  const payload: any = { name };
  if (profile_data !== undefined) {
    payload.profile_data = profile_data;
  }
  const response = await api.put<AuthUser>('/auth/profile', payload);
  return response.data;
}

export async function changePassword(current_password: string, new_password: string): Promise<void> {
  await api.put('/auth/password', { current_password, new_password });
}

export async function deleteAccount(): Promise<void> {
  await api.delete('/auth/account');
}

export { api as authApi, ApiError, API_BASE_URL };
