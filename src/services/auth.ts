import axios from 'axios';
import { API, STORAGE_KEYS } from '@/config/constants';

// Create an axios instance with default config
const api = axios.create({
  baseURL: API.BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercept requests to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface LoginCredentials {
  email: string;
  username: string;
  password: string;
  company_code: string;
}

export interface RegisterCredentials {
  email: string;
  username: string;
  password: string;
  full_name: string;
  company_code: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: {
    id: string;
    email: string;
    username: string;
  };
}

export interface RateLimitInfo {
  identifier: string;
  identifier_type: string;
  current_attempts: number;
  max_attempts: number;
  attempts_remaining: number;
  expiry_seconds: number;
}

export interface RateLimitError {
  error: string;
  status: 'delayed' | 'locked';
  delay?: number;
  lockout_time?: number;
  attempts_remaining?: number;
  message: string;
  security_event: string;
  rate_limit_info: RateLimitInfo;
  username: string;
}

class AuthService {
  private static instance: AuthService;

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    try {
      const response = await api.post<AuthResponse>(API.ENDPOINTS.AUTH.REGISTER, credentials);
      
      // Store the token securely
      if (response.data.access_token) {
        localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, response.data.access_token);
        localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(response.data.user));
      }
      
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.detail) {
        const detail = error.response.data.detail;
        throw new Error(typeof detail === 'string' ? detail : detail.message || 'Registration failed');
      }
      
      throw new Error('Registration failed. Please try again.');
    }
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await api.post<AuthResponse>(API.ENDPOINTS.AUTH.LOGIN, credentials);

      // Store the token securely
      if (response.data.access_token) {
        localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, response.data.access_token);
        // Store minimal user data
        localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(response.data.user));
      }

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.detail) {
        const detail = error.response.data.detail as RateLimitError;
        
        // Handle different rate limiting scenarios
        if (detail.status === 'delayed') {
          throw {
            type: 'delay',
            message: detail.message,
            delay: detail.delay,
            attemptsRemaining: detail.rate_limit_info.attempts_remaining,
            detail
          };
        } else if (detail.status === 'locked') {
          throw {
            type: 'lockout',
            message: detail.message,
            lockoutTime: detail.lockout_time,
            detail
          };
        }
        
        throw new Error(detail.message || 'Login failed');
      }
      
      throw new Error('Login failed. Please check your credentials and try again.');
    }
  }

  formatRemainingTime(seconds: number): string {
    if (seconds < 60) {
      return `${seconds} second${seconds !== 1 ? 's' : ''}`;
    }
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes < 60) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    return `${hours}h ${remainingMinutes}m ${remainingSeconds}s`;
  }

  logout(): void {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER_DATA);
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  }

  getCurrentUser(): any {
    const user = localStorage.getItem(STORAGE_KEYS.USER_DATA);
    return user ? JSON.parse(user) : null;
  }

  getAuthToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  }
}

export const authService = AuthService.getInstance(); 