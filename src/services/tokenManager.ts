import axios from 'axios';
import { API, STORAGE_KEYS } from '@/config/constants';

interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

class TokenManager {
  private static instance: TokenManager;
  private refreshPromise: Promise<TokenData> | null = null;
  private readonly TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes in milliseconds

  private constructor() {
    // Initialize refresh token interceptor
    this.setupRefreshTokenInterceptor();
  }

  public static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  private setupRefreshTokenInterceptor(): void {
    axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // Only attempt refresh if we have a token and it's a 401 error
        if (error.response?.status === 401 && !originalRequest._retry && this.getAccessToken()) {
          originalRequest._retry = true;

          try {
            // Get new tokens
            const tokens = await this.refreshTokens();
            
            // Update the failed request's authorization header
            originalRequest.headers.Authorization = `Bearer ${tokens.access_token}`;
            
            // Retry the original request
            return axios(originalRequest);
          } catch (refreshError) {
            // If refresh fails, clear tokens and redirect to login
            this.clearTokens();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  public async refreshTokens(): Promise<TokenData> {
    // If there's already a refresh in progress, return that promise
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const refresh_token = this.getRefreshToken();
        if (!refresh_token) {
          throw new Error('No refresh token available');
        }

        console.log('Attempting to refresh token');
        
        const response = await axios.post(API.BASE_URL + API.ENDPOINTS.AUTH.REFRESH, {
          refresh_token
        });

        console.log('Token refresh successful', { 
          expires_in: response.data.expires_in 
        });

        const tokens: TokenData = {
          access_token: response.data.access_token,
          refresh_token: response.data.refresh_token,
          expires_at: Date.now() + (response.data.expires_in * 1000)
        };

        this.storeTokens(tokens);
        return tokens;
      } catch (error) {
        console.error('Token refresh failed:', error);
        
        // Clear tokens on refresh failure
        this.clearTokens();
        
        throw error;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  public storeTokens(tokens: TokenData, rememberMe: boolean = false): void {
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem(STORAGE_KEYS.AUTH_TOKEN, tokens.access_token);
    storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refresh_token);
    storage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, tokens.expires_at.toString());
  }

  public getAccessToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) || 
           sessionStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  }

  public getRefreshToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN) || 
           sessionStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  }

  public clearTokens(): void {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRY);
    sessionStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    sessionStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    sessionStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRY);
  }

  public async getValidToken(): Promise<string> {
    const accessToken = this.getAccessToken();
    const expiryTime = parseInt(
      localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY) || 
      sessionStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY) || 
      '0'
    );

    // If token is expired or about to expire (or no token), refresh it
    const now = Date.now();
    const shouldRefresh = !accessToken || now + this.TOKEN_REFRESH_THRESHOLD >= expiryTime;
    
    if (shouldRefresh) {
      console.log(`Token ${!accessToken ? 'missing' : 'expiring soon'}, refreshing...`, {
        now: new Date(now).toISOString(),
        expiry: expiryTime ? new Date(expiryTime).toISOString() : 'none',
        timeToExpiry: expiryTime ? (expiryTime - now) / 1000 : 'n/a'
      });
      
      try {
        const tokens = await this.refreshTokens();
        return tokens.access_token;
      } catch (error) {
        console.error('Failed to refresh token in getValidToken:', error);
        throw error;
      }
    }

    return accessToken as string;
  }

  public isTokenExpired(): boolean {
    const expiryTime = parseInt(
      localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY) || 
      sessionStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY) || 
      '0'
    );
    return Date.now() >= expiryTime;
  }
}

export default TokenManager.getInstance(); 