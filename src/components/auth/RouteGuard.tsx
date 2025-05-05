'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ROUTES } from '@/config/constants';
import { LoadingScreen } from '@/components/ui/LoadingSpinner';

export default function RouteGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading) {
      // Check if the route requires authentication
      const isProtectedRoute = pathname.startsWith('/dashboard');
      
      if (isProtectedRoute && !isAuthenticated) {
        // Redirect to login
        router.push(`${ROUTES.AUTH.LOGIN}?redirect=${encodeURIComponent(pathname)}`);
      }
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  // Show loading indicator if we're still checking authentication
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Check if this is a protected route and user is not authenticated
  const isProtectedRoute = pathname.startsWith('/dashboard');
  if (isProtectedRoute && !isAuthenticated) {
    // Don't render children, routing will happen in useEffect
    return null;
  }

  // Otherwise, render the children
  return <>{children}</>;
} 