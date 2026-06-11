import axios from 'axios';
import { ApiError } from './api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const authApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

authApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('skinai_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

authApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      return Promise.reject(new ApiError('Cannot connect to server. Please check your connection and ensure the backend is running.', 0));
    }

    const { status, data } = error.response;

    if (status === 401) {
      const hasToken = !!localStorage.getItem('skinai_token');
      localStorage.removeItem('skinai_token');
      localStorage.removeItem('skinai_user');
      if (hasToken) {
        window.location.href = '/';
      }
    }

    let message = 'An unexpected error occurred.';
    if (data?.detail) {
      message = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
    } else if (status === 400) {
      message = 'Invalid request. Please check your input.';
    } else if (status === 401) {
      message = 'Invalid email or password.';
    } else if (status === 404) {
      message = 'Service not found. Please try again later.';
    } else if (status === 500) {
      message = 'Server error. Please try again later.';
    } else if (status === 503) {
      message = 'Service temporarily unavailable. Please try again later.';
    }

    return Promise.reject(new ApiError(message, status, error));
  }
);

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  created_at: string;
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
    return JSON.parse(raw);
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
  const response = await authApi.post<AuthResponse>('/auth/register', {
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
  const response = await authApi.post<AuthResponse>('/auth/login', {
    email,
    password,
  });
  return response.data;
}

export async function updateProfile(
  name: string
): Promise<AuthUser> {
  const response = await authApi.put<AuthUser>('/auth/profile', { name });
  return response.data;
}

export default authApi;
