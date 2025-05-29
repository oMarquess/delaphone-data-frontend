'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface AutoRefreshSettings {
  enabled: boolean;
  interval: number; // in milliseconds
  enabledSections: {
    overview: boolean;
    callLogs: boolean;
    callerAnalytics: boolean;
    agentAnalytics: boolean;
  };
  visualIndicators: boolean;
  pauseOnUserActivity: boolean;
}

export interface SettingsContextType {
  autoRefresh: AutoRefreshSettings;
  updateAutoRefreshSettings: (settings: Partial<AutoRefreshSettings>) => void;
  resetToDefaults: () => void;
  isRefreshing: boolean;
  lastRefreshTime: Date | null;
  setRefreshState: (isRefreshing: boolean, lastRefreshTime?: Date | null) => void;
}

const defaultSettings: AutoRefreshSettings = {
  enabled: true,
  interval: 30000, // 30 seconds
  enabledSections: {
    overview: true,
    callLogs: false,
    callerAnalytics: false,
    agentAnalytics: false,
  },
  visualIndicators: true,
  pauseOnUserActivity: false,
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [autoRefresh, setAutoRefresh] = useState<AutoRefreshSettings>(defaultSettings);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('dashboardSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setAutoRefresh({ ...defaultSettings, ...parsed.autoRefresh });
        console.log('📋 Loaded settings from localStorage:', parsed);
      } catch (error) {
        console.error('Failed to parse saved settings:', error);
      }
    } else {
      console.log('📋 Using default settings');
    }
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    const settingsToSave = {
      autoRefresh,
      version: '1.0',
      lastUpdated: new Date().toISOString(),
    };
    localStorage.setItem('dashboardSettings', JSON.stringify(settingsToSave));
    console.log('💾 Saved settings to localStorage:', settingsToSave);
  }, [autoRefresh]);

  const updateAutoRefreshSettings = (newSettings: Partial<AutoRefreshSettings>) => {
    setAutoRefresh(prev => ({
      ...prev,
      ...newSettings,
    }));
    console.log('⚙️ Updated auto-refresh settings:', newSettings);
  };

  const resetToDefaults = () => {
    setAutoRefresh(defaultSettings);
    setIsRefreshing(false);
    setLastRefreshTime(null);
    console.log('🔄 Reset settings to defaults');
  };

  const setRefreshState = (refreshing: boolean, refreshTime?: Date | null) => {
    setIsRefreshing(refreshing);
    if (refreshTime !== undefined) {
      setLastRefreshTime(refreshTime);
    }
  };

  const value: SettingsContextType = {
    autoRefresh,
    updateAutoRefreshSettings,
    resetToDefaults,
    isRefreshing,
    lastRefreshTime,
    setRefreshState,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}; 