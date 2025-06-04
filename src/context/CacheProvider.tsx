'use client';

import { SWRConfig } from 'swr';
import { ReactNode } from 'react';

// Create a map to store cached data
const globalCache = new Map();

interface CacheProviderProps {
  children: ReactNode;
}

export default function CacheProvider({ children }: CacheProviderProps) {
  return (
    <SWRConfig
      value={{
        provider: () => globalCache,
        revalidateOnFocus: false,
        dedupingInterval: 2000, // Reduced from 300000ms (5 minutes) to 2000ms (2 seconds)
        shouldRetryOnError: true,
        errorRetryCount: 2,
        revalidateIfStale: true, // Changed: Allow revalidation of stale data
        keepPreviousData: false, // Changed: Don't keep previous data, show fresh data immediately
        refreshWhenHidden: false, // Don't refresh when tab is hidden
        refreshWhenOffline: false, // Don't refresh when offline
        focusThrottleInterval: 5000, // Throttle focus revalidation to 5 seconds
      }}
    >
      {children}
    </SWRConfig>
  );
} 