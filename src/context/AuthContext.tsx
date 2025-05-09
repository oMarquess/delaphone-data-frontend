'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
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

  const login = async (credentials: { email: string; password: string }, rememberMe: boolean) => {
    try {
      setLoading(true);
      const response = await authService.login(credentials, rememberMe);
      setIsAuthenticated(true);
      setUser(response.user || {
        username: response.user_info.username,
        is_verified: response.user_info.is_verified,
        is_active: response.user_info.is_active,
        company_id: response.user_info.company_id,
        company_code: response.user_info.company_code
      });
      router.push(ROUTES.APP.DASHBOARD);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setIsAuthenticated(false);
    setUser(null);
    router.push(ROUTES.AUTH.LOGIN);
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