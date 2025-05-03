'use client';

import { UI } from '@/config/constants';

export function LoadingSpinner({ size = 'medium' }: { size?: 'small' | 'medium' | 'large' }) {
  const sizeClasses = {
    small: 'h-6 w-6 border-2',
    medium: 'h-10 w-10 border-2',
    large: 'h-16 w-16 border-3',
  };

  return (
    <div className={`animate-spin rounded-full ${sizeClasses[size]} border-t-primary border-solid border-gray-200 dark:border-gray-700`}></div>
  );
}

export function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
      <LoadingSpinner size="large" />
    </div>
  );
} 