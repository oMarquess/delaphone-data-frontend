// API Configuration
export const API = {
  BASE_URL: 'http://localhost:8000',
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/auth/login',
      REGISTER: '/auth/register',
      FORGOT_PASSWORD: '/auth/forgot-password',
      RESET_PASSWORD: '/auth/reset-password',
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
  USER_DATA: 'user',
} as const;

// Form Validation
export const VALIDATION = {
  PASSWORD: {
    MIN_LENGTH: 8,
    PATTERN: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/,
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
    SIGNUP: '/signup',
    FORGOT_PASSWORD: '/forgot-password',
  },
  APP: {
    DASHBOARD: '/dashboard',
    PROFILE: '/profile',
  }
} as const;

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