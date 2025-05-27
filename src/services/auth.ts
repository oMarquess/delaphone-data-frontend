import axios from 'axios';
import { API, STORAGE_KEYS } from '@/config/constants';
import tokenManager from './tokenManager';

// Create a clean axios instance for unauthenticated routes (login, register, etc.)
const publicApi = axios.create({
  baseURL: API.BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Create an authenticated axios instance with token interceptor
const authenticatedApi = axios.create({
  baseURL: API.BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token interceptor only to the authenticated instance
authenticatedApi.interceptors.request.use(async (config) => {
  try {
    const token = await tokenManager.getValidToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  } catch (error) {
    return Promise.reject(error);
  }
});

export interface LoginCredentials {
  email: string;
  password: string;
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
  user_id: string;
  username: string;
  email: string;
  company_id: string;
  company_code: string;
  is_verified: boolean;
  user?: {
    id: string;
    username: string;
    email: string;
    is_verified: boolean;
  };
  verification_required: boolean;
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
      console.log('Attempting registration with credentials:', { ...credentials, password: '***' });
      console.log('API endpoint:', `${API.BASE_URL}${API.ENDPOINTS.AUTH.REGISTER}`);
      
      const response = await publicApi.post<{
        success: boolean;
        errors: string[];
        data: {
          id: string;
          email: string;
          username: string;
          full_name: string;
          company_id: string;
          company_name: string;
          created_at: string;
          is_verified: boolean;
          verification_required: boolean;
          message: string;
        }
      }>(API.ENDPOINTS.AUTH.REGISTER, credentials);
      
      console.log('Registration response:', response.data);
      
      // Check if the response indicates an error
      if (!response.data.success) {
        throw {
          success: false,
          errors: response.data.errors,
          data: null
        };
      }
      
      // Create user data from response
      const userData = {
        id: response.data.data.id,
        username: response.data.data.username,
        email: response.data.data.email,
        is_verified: response.data.data.is_verified,
        company_id: response.data.data.company_id,
        company_name: response.data.data.company_name,
        full_name: response.data.data.full_name
      };
      
      // Store user data
      localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
      
      // Return the response in the expected format
      return {
        access_token: '', // No token on registration
        token_type: 'bearer',
        user_id: response.data.data.id,
        username: response.data.data.username,
        email: response.data.data.email,
        company_id: response.data.data.company_id,
        company_code: '', // Not provided in registration response
        is_verified: response.data.data.is_verified,
        user: userData,
        verification_required: !response.data.data.is_verified
      };
    } catch (error) {
      console.error('Register error:', error);
      
      if (axios.isAxiosError(error)) {
        // Handle 422 validation errors
        if (error.response?.status === 422) {
          const errorData = error.response.data;
          console.log('Validation error details:', errorData);
          
          // Handle FastAPI validation errors
          if (errorData.detail) {
            if (Array.isArray(errorData.detail)) {
              // Format: [{loc: [...], msg: "...", type: "..."}, ...]
              const validationErrors = errorData.detail.map((err: any) => {
                const field = err.loc[err.loc.length - 1];
                return `${field}: ${err.msg}`;
              });
              throw {
                success: false,
                errors: validationErrors,
                data: null
              };
            } else if (typeof errorData.detail === 'string') {
              throw {
                success: false,
                errors: [errorData.detail],
                data: null
              };
            }
          }
          
          // Handle other validation error formats
          if (errorData.errors && Array.isArray(errorData.errors)) {
            throw {
              success: false,
              errors: errorData.errors,
              data: null
            };
          }
        }
        
        // Handle other response formats
        if (error.response?.data && 'success' in error.response.data && error.response.data.success === false) {
          throw error.response.data;
        }
        
        // Handle email already exists message
        if (error.response?.data?.message && typeof error.response.data.message === 'string') {
          const message = error.response.data.message;
          if (message.includes('email') || message.includes('Email')) {
            throw {
              success: false,
              errors: [message],
              data: null
            };
          }
        }
      }
      
      // Default error
      throw new Error('Registration failed. Please check your input and try again.');
    }
  }

  async login(credentials: LoginCredentials, rememberMe: boolean = false): Promise<AuthResponse> {
    try {
      // Ensure we're sending the correct format
      const loginData = {
        email: credentials.email,
        password: credentials.password
      };

      console.log('Attempting login with credentials:', { email: loginData.email, password: '***' });
      console.log('API endpoint:', `${API.BASE_URL}${API.ENDPOINTS.AUTH.LOGIN}`);
      
      const response = await publicApi.post<{
        access_token: string;
        refresh_token: string;
        token_type: string;
        expires_in: number;
        user_info: {
          is_verified: boolean;
          is_active: boolean;
          company_id: string;
          company_code: string;
          username: string;
        }
      }>(API.ENDPOINTS.AUTH.LOGIN, loginData);
      
      console.log('Login response:', response.data);

      // Check if user is verified
      if (!response.data.user_info.is_verified) {
        throw {
          type: 'verification_required',
          message: 'Your account is pending verification. Please check your email for verification instructions. This process may take 24-48 hours.',
          detail: response.data
        };
      }

      // Check if user is active
      if (!response.data.user_info.is_active) {
        throw {
          type: 'account_inactive',
          message: 'Your account is currently inactive. Please contact support.',
          detail: response.data
        };
      }

      // Store the tokens using token manager
      tokenManager.storeTokens({
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_at: Date.now() + (response.data.expires_in * 1000)
      }, rememberMe);

      // Create user data from response
      const userData = {
        id: `user_${Date.now()}`, // Generate a temporary ID since API doesn't provide one
        username: response.data.user_info.username,
        email: credentials.email, // Use email from login credentials
        is_verified: response.data.user_info.is_verified
      };

      // Store user data
      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));

      return {
        ...response.data,
        user_id: userData.id,
        username: response.data.user_info.username,
        email: credentials.email,
        company_id: response.data.user_info.company_id,
        company_code: response.data.user_info.company_code,
        is_verified: response.data.user_info.is_verified,
        verification_required: !response.data.user_info.is_verified,
        user: userData
      };
    } catch (error) {
      console.error('Login error:', error);
      
      if (axios.isAxiosError(error)) {
        console.error('Axios error details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          headers: error.response?.headers,
          config: {
            url: error.config?.url,
            method: error.config?.method,
            headers: error.config?.headers,
          }
        });
        
        // Handle validation errors (422)
        if (error.response?.status === 422) {
          const errorData = error.response.data;
          if (errorData.detail) {
            if (Array.isArray(errorData.detail)) {
              const validationErrors = errorData.detail.map((err: any) => {
                const field = err.loc[err.loc.length - 1];
                return `${field}: ${err.msg}`;
              });
              throw {
                type: 'validation',
                message: 'Invalid login credentials',
                errors: validationErrors
              };
            } else if (typeof errorData.detail === 'string') {
              throw {
                type: 'validation',
                message: errorData.detail
              };
            }
          }
        }
        
        // Handle other response formats
        if (error.response?.data?.detail) {
          const detail = error.response.data.detail;
          
          // Handle verification status response
          if (typeof detail === 'object' && detail.verification_required) {
            throw {
              type: 'verification',
              message: detail.message,
              detail
            };
          }
          
          // Handle rate limiting errors
          if (typeof detail === 'object' && detail.status === 'delayed') {
            throw {
              type: 'delay',
              message: detail.message,
              delay: detail.delay,
              attemptsRemaining: detail.rate_limit_info.attempts_remaining,
              detail
            };
          } else if (typeof detail === 'object' && detail.status === 'locked') {
            throw {
              type: 'lockout',
              message: detail.message,
              lockoutTime: detail.lockout_time,
              detail
            };
          }
        }
      }
      
      throw error;
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
    tokenManager.clearTokens();
    localStorage.removeItem(STORAGE_KEYS.USER_DATA);
    sessionStorage.removeItem(STORAGE_KEYS.USER_DATA);
  }

  isAuthenticated(): boolean {
    return !!tokenManager.getAccessToken() && !tokenManager.isTokenExpired();
  }

  getCurrentUser(): any {
    const userData = localStorage.getItem(STORAGE_KEYS.USER_DATA) || 
                    sessionStorage.getItem(STORAGE_KEYS.USER_DATA);
    return userData ? JSON.parse(userData) : null;
  }

  getAuthToken(): string | null {
    return tokenManager.getAccessToken();
  }

  async checkEmailAvailability(email: string): Promise<{ isAvailable: boolean; message?: string }> {
    try {
      console.log('Checking email availability for:', email);
      
      const response = await publicApi.get(`${API.ENDPOINTS.AUTH.CHECK_EMAIL}?email=${encodeURIComponent(email)}`);
      console.log('Email availability response:', response.data);
      
      return { 
        isAvailable: response.data.available, 
        message: response.data.message 
      };
    } catch (error) {
      console.error('Error checking email availability:', error);
      
      if (axios.isAxiosError(error) && error.response) {
        const errorData = error.response.data;
        console.log('Email check error response:', errorData);
        
        if (errorData && typeof errorData === 'object') {
          if ('available' in errorData && errorData.available === false) {
            return { 
              isAvailable: false, 
              message: errorData.message || 'Email is already registered' 
            };
          }
          
          if ('detail' in errorData && typeof errorData.detail === 'string') {
            return { 
              isAvailable: false, 
              message: errorData.detail 
            };
          }
        }
      }
      
      return { 
        isAvailable: false, 
        message: 'Unable to verify email availability. Please try again.' 
      };
    }
  }
}

// Export the singleton instance
const authService = AuthService.getInstance();
export default authService; 