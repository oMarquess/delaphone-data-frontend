// API Configuration
export const API = {
  BASE_URL: 'http://localhost:8000',
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/auth/login',
      REGISTER: '/auth/register',
      FORGOT_PASSWORD: '/auth/forgot-password',
      RESET_PASSWORD: '/auth/reset-password',
      CHECK_EMAIL: '/auth/check-email',
      REFRESH: '/auth/refresh',
    }
  }
} as const;

// Rate Limiting Configuration
export const RATE_LIMIT = {
  MAX_ATTEMPTS: 5,
  WINDOW_DURATION: 5 * 60 * 1000, // 5 minutes in milliseconds
  BLOCK_DURATION: 15 * 60 * 1000, // 15 minutes in milliseconds
} as const;

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  TOKEN_EXPIRY: 'token_expiry',
  USER_DATA: 'user',
} as const;

// Form Validation
export const VALIDATION = {
  PASSWORD: {
    MIN_LENGTH: 8,
    PATTERN: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
    MESSAGE: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number',
  },
  COMPANY_CODE: {
    PATTERN: '[A-Z0-9]{8}',
    MESSAGE: 'Company code must be 8 characters long and contain only uppercase letters and numbers',
  }
} as const;

// Routes
export const ROUTES = {
  AUTH: {
    LOGIN: '/login',
    REGISTER: '/register',
    FORGOT_PASSWORD: '/forgot-password',
    RESET_PASSWORD: '/reset-password',
  },
  APP: {
    DASHBOARD: '/dashboard',
    PROFILE: '/profile',
  },
  API: {
    AUTH: '/api/auth',
    DASHBOARD: '/api/dashboard',
  },
  UI: {
    LIGHT_THEME: 'light',
    DARK_THEME: 'dark',
  }
} as const;

// API Constants
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// UI Configuration
export const UI = {
  TOAST_DURATION: 5000, // 5 seconds
  ANIMATION_DURATION: 200, // 0.2 seconds
  THEME: {
    PRIMARY: '#8c45ff',
    PRIMARY_DARK: '#5F17ED',
    BACKGROUND: 'bg-gray-900/40',
    BORDER: 'border-white/15',
  }
} as const; 