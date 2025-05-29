import { useState, useEffect, useCallback } from 'react';

interface AutoRefreshOptions {
  enabled: boolean;
  interval: number;
  onRefresh: () => Promise<any>;
  dependencies?: any[];
}

interface AutoRefreshReturn {
  isRefreshing: boolean;
  lastRefreshTime: Date | null;
  forceRefresh: () => Promise<void>;
}

export const useAutoRefresh = ({
  enabled,
  interval,
  onRefresh,
  dependencies = []
}: AutoRefreshOptions): AutoRefreshReturn => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);

  const performRefresh = useCallback(async () => {
    if (isRefreshing) return;
    
    try {
      setIsRefreshing(true);
      console.log('🔄 Auto-refresh triggered at:', new Date().toISOString());
      
      await onRefresh();
      setLastRefreshTime(new Date());
      
      console.log('✅ Auto-refresh completed successfully');
    } catch (error) {
      console.error('❌ Auto-refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefresh, isRefreshing]);

  // Set up auto-refresh interval
  useEffect(() => {
    if (!enabled || interval <= 0) {
      return;
    }

    console.log('🚀 Setting up auto-refresh with interval:', interval, 'ms');
    
    const intervalId = setInterval(performRefresh, interval);

    return () => {
      console.log('🛑 Cleaning up auto-refresh interval');
      clearInterval(intervalId);
    };
  }, [enabled, interval, performRefresh, ...dependencies]);

  const forceRefresh = useCallback(async () => {
    await performRefresh();
  }, [performRefresh]);

  return {
    isRefreshing,
    lastRefreshTime,
    forceRefresh
  };
}; 