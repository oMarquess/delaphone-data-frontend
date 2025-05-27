import { useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import tokenManager from '@/services/tokenManager';

export function AuthNotifications() {
  const { isAuthenticated, logout } = useAuth();

  useEffect(() => {
    // Check token expiration periodically
    const checkTokenExpiration = () => {
      if (isAuthenticated && tokenManager.isTokenExpired()) {
        toast.error('Session Expired', {
          description: 'Your session has expired. Please log in again.',
          duration: 5000,
        });
        logout();
      }
    };

    // Check every minute
    const interval = setInterval(checkTokenExpiration, 60000);

    return () => clearInterval(interval);
  }, [isAuthenticated, logout]);

  return null; // This is a utility component that doesn't render anything
}

export function showAuthError(error: any) {
  if (error.response?.status === 401) {
    toast.error('Authentication Error', {
      description: 'Your session has expired. Please log in again.',
      duration: 5000,
    });
  } else if (error.response?.status === 403) {
    toast.error('Access Denied', {
      description: 'You do not have permission to perform this action.',
      duration: 5000,
    });
  } else {
    toast.error('Error', {
      description: error.response?.data?.message || 'An unexpected error occurred.',
      duration: 5000,
    });
  }
}

export function showAuthSuccess(message: string) {
  toast.success('Success', {
    description: message,
    duration: 3000,
  });
}

export function showAuthInfo(message: string) {
  toast.info('Information', {
    description: message,
    duration: 3000,
  });
} 