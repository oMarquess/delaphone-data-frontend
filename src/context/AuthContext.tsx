'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import authService from '@/services/auth';
import tokenManager from '@/services/tokenManager';
import { toast } from 'sonner';
import { ROUTES } from '@/config/constants';

interface AuthContextType {
  isAuthenticated: boolean;
  user: any;
  login: (credentials: { email: string; password: string }, rememberMe: boolean) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check authentication status on mount
    const checkAuth = async () => {
      try {
        const authenticated = authService.isAuthenticated();
        setIsAuthenticated(authenticated);
        if (authenticated) {
          setUser(authService.getCurrentUser());
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Set up token refresh mechanism
  useEffect(() => {
    // Only attempt token refresh if the user is authenticated
    if (!isAuthenticated) return;

    // Function to check and refresh token if needed
    const checkTokenValidity = async () => {
      try {
        await tokenManager.getValidToken();
      } catch (error) {
        console.error('Token refresh failed in background check:', error);
        // If token refresh fails, log the user out
        logout();
      }
    };

    // Check token immediately
    checkTokenValidity();

    // Set up interval to check token validity periodically (every 5 minutes)
    const intervalId = setInterval(checkTokenValidity, 5 * 60 * 1000);

    // Clean up interval on unmount
    return () => {
      clearInterval(intervalId);
    };
  }, [isAuthenticated]);

  const logout = useCallback(() => {
    authService.logout();
    setIsAuthenticated(false);
    setUser(null);
    router.push(ROUTES.AUTH.LOGIN);
  }, [router]);

  const login = async (credentials: { email: string; password: string }, rememberMe: boolean) => {
    try {
      setLoading(true);
      const response = await authService.login(credentials, rememberMe);
      setIsAuthenticated(true);
      
      // Extract user data from response - access from top level since login spreads response.data
      const userData = {
        username: response.username,
        is_verified: response.is_verified,
        is_active: (response.user as any)?.is_active,
        company_id: response.company_id,
        company_code: response.company_code
      };
      
      setUser(userData);
      router.push(ROUTES.APP.DASHBOARD);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };



  const value = {
    isAuthenticated,
    user,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 