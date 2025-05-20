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
        dedupingInterval: 300000, // 5 minutes
        shouldRetryOnError: true,
        errorRetryCount: 2,
        revalidateIfStale: false,
        keepPreviousData: true,
      }}
    >
      {children}
    </SWRConfig>
  );
} 