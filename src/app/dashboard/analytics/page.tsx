'use client';

import React, { useState, useEffect } from 'react';
import { PhoneIcon, UserIcon, ClockIcon, BarChartIcon, Settings, CalendarIcon, CheckCircleIcon } from 'lucide-react';
import { SyncOutlined } from '@ant-design/icons';
import SummaryCard from '@/components/dashboard/SummaryCard';
import { AnalyticsFilterBar, AnalyticsFilters } from '@/components/analytics/AnalyticsFilterBar';
import { useAnalyticsData, formatDuration } from '@/services/analytics';
import TopCallerComparisonChart from '@/components/analytics/TopCallerComparisonChart';
import ActivityTimeline from '@/components/analytics/ActivityTimeline';
import CallerMetricsCards from '@/components/analytics/CallerMetricsCards';
import CallPerformanceRadar from '@/components/analytics/CallPerformanceRadar';
import QuickDateSelector from '@/components/analytics/QuickDateSelector';
import { publishDateChange, publishFilterChange } from '@/components/ai/AIDrawer';
import { DateRangePicker } from '@/components/DateRangePicker';
import { motion } from 'framer-motion';
import { useSettings } from '@/context/SettingsContext';
import { toast } from 'sonner';

export default function AnalyticsPage() {
  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];
  
  // Load saved filters from localStorage or use defaults
  const savedFilters = typeof window !== 'undefined' ? localStorage.getItem('analyticsFilters') : null;
  const initialFilters: AnalyticsFilters = savedFilters ? JSON.parse(savedFilters) : {
    startDate: today,
    endDate: today,
    minCalls: 1,
    disposition: 'all',
    direction: 'all',
    sortBy: 'count',
    limit: 100
  };

  const [filters, setFilters] = useState<AnalyticsFilters>(initialFilters);
  const { data, isLoading, isError, mutate } = useAnalyticsData(filters);
  const [filterVisible, setFilterVisible] = useState(false);
  const [dateRangeLabel, setDateRangeLabel] = useState('Custom');
  const { autoRefresh, setRefreshState, lastRefreshTime, setRefreshError, lastRefreshError, consecutiveFailures } = useSettings();

  // State for tab selection in the detailed analysis section
  const [analysisTab, setAnalysisTab] = useState<string>('comparison');

  // Save filters to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('analyticsFilters', JSON.stringify(filters));
  }, [filters]);

  // Auto-refresh functionality for Caller Analytics section
  useEffect(() => {
    if (!autoRefresh.enabled || 
        !autoRefresh.enabledSections.callerAnalytics || 
        autoRefresh.interval <= 0) {
      return;
    }

    console.log('🔄 Setting up auto-refresh for Caller Analytics');
    console.log('Interval:', autoRefresh.interval, 'ms');

    const refreshInterval = setInterval(async () => {
      try {
        setRefreshState(true);
        console.log('🔄 Auto-refreshing Caller Analytics data at:', new Date().toISOString());
        
        // Use the mutate function to refresh data in background
        await mutate();
        
        setRefreshState(false, new Date());
        console.log('✅ Caller Analytics auto-refresh completed successfully');
        // Clear any previous errors on success
        setRefreshError(null);
      } catch (error) {
        console.error('❌ Caller Analytics auto-refresh failed:', error);
        setRefreshState(false);
        
        // Track the error
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        setRefreshError(errorMessage);
        
        // Show user notification after 3 consecutive failures
        if (consecutiveFailures >= 2) { // Will be 3 after setRefreshError increments
          toast.error('Caller Analytics auto-refresh temporarily unavailable', {
            description: 'Check your connection or try manual refresh',
            duration: 5000,
          });
        }
      }
    }, autoRefresh.interval);

    return () => {
      console.log('🛑 Cleaning up Caller Analytics auto-refresh interval');
      clearInterval(refreshInterval);
    };
  }, [
    autoRefresh.enabled, 
    autoRefresh.enabledSections.callerAnalytics, 
    autoRefresh.interval,
    setRefreshState,
    mutate,
    setRefreshError,
    consecutiveFailures
  ]);

  const handleFilterChange = (newFilters: AnalyticsFilters) => {
    setFilters(newFilters);
    
    // Publish filter changes for AI Drawer to sync
    publishFilterChange('Caller Analytics', newFilters);
    
    // Also publish date changes if they're included
    if (newFilters.startDate && newFilters.endDate) {
      publishDateChange(newFilters.startDate, newFilters.endDate);
    }

    // Force a re-fetch of the data
    mutate();
  };

  const handleDateRangeChange = (value: any, dateStrings: [string, string]) => {
    // Update the date range
    const newFilters = {
      ...filters,
      startDate: dateStrings[0],
      endDate: dateStrings[1]
    };
    setFilters(newFilters);
    
    // Publish date changes for AI Drawer to sync
    publishDateChange(dateStrings[0], dateStrings[1]);
    
    // Also publish filter changes
    publishFilterChange('Caller Analytics', newFilters);

    // Force a re-render of the data
    mutate();
  };

  const handlePresetDateChange = (startDate: string, endDate: string, label: string) => {
    setDateRangeLabel(label);
    
    // If Custom is selected, open the advanced filters section
    if (label === 'Custom') {
      setFilterVisible(true);
      
      if (!startDate) {
        // If custom is selected but no dates provided, just update the label and keep current dates
        return;
      }
    } else {
      // If any preset is selected, close the advanced filters
      setFilterVisible(false);
    }
    
    // Update the date range
    const newFilters = {
      ...filters,
      startDate,
      endDate
    };
    setFilters(newFilters);
    
    // Publish date changes for AI Drawer to sync
    publishDateChange(startDate, endDate);
    
    // Also publish filter changes
    publishFilterChange('Caller Analytics', newFilters);
  };

  // Manual refresh function
  const handleManualRefresh = async () => {
    try {
      setRefreshState(true);
      await mutate();
      setRefreshState(false, new Date());
      toast.success('Caller analytics refreshed successfully');
      // Clear any previous errors on success
      setRefreshError(null);
    } catch (error) {
      setRefreshState(false);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setRefreshError(errorMessage);
      toast.error('Failed to refresh caller analytics', {
        description: errorMessage,
        duration: 4000,
      });
    }
  };

  // Format duration from seconds to minutes for display with proper grammar
  const formatDurationDisplay = (seconds: number = 0) => {
    const minutes = Math.floor(seconds / 60);
    return minutes === 1 ? `${minutes} min` : `${minutes} mins`;
  };

  // Count active filters (excluding date range)
  const activeFilterCount = Object.entries(filters).reduce((count, [key, value]) => {
    if (key !== 'startDate' && key !== 'endDate' && value !== 'all' && value !== 1) {
      return count + 1;
    }
    return count;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Header with filter toggle */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Caller Analytics</h1>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Manual refresh button */}
          <button
            onClick={handleManualRefresh}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Manual refresh"
          >
            <SyncOutlined className={`text-lg ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <div className="flex items-center">
            <DateRangePicker 
              onChange={handleDateRangeChange}
              startDate={filters.startDate}
              endDate={filters.endDate}
              disabled={isLoading}
            />
          </div>

          <motion.button 
            onClick={() => setFilterVisible(!filterVisible)}
            className={`p-2 transition-colors relative ${
              filterVisible 
                ? 'text-blue-500 dark:text-blue-400' 
                : 'text-gray-700 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            animate={{ rotate: filterVisible ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            disabled={isLoading}
          >
            <Settings 
              size={20} 
              className={filterVisible ? 'text-blue-500 dark:text-blue-400' : ''} 
            />
            {activeFilterCount > 0 && !filterVisible && (
              <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </motion.button>
        </div>
      </div>
      
      {/* Quick date range selector */}
      {/* <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Quick Select:</span>
          <QuickDateSelector 
            onChange={handlePresetDateChange} 
            activeLabel={dateRangeLabel}
            filterVisible={filterVisible}
          />
        </div>
      </div> */}
      
      {/* Collapsible filter section */}
      <div className={`transition-all duration-300 overflow-hidden ${filterVisible ? 'opacity-100 h-auto' : 'opacity-0 h-0'}`}>
        <AnalyticsFilterBar 
          onFilterChange={handleFilterChange} 
          initialFilters={filters}
          currentDateRange={{
            startDate: filters.startDate,
            endDate: filters.endDate
          }}
          onApply={() => setFilterVisible(false)}
          isLoading={isLoading}
        />
      </div>
      
      {/* Error message */}
      {isError && (
        <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg border border-red-200 dark:border-red-800">
          <h2 className="text-lg font-medium text-red-800 dark:text-red-400 mb-2">Error Loading Data</h2>
          <p className="text-red-600 dark:text-red-400">Failed to load analytics data. Please try again later.</p>
        </div>
      )}
      
      {/* Dashboard status with improved styling */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
        <div className="text-sm text-blue-800 dark:text-blue-300 space-y-1 sm:space-y-0">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="inline-flex items-center">
              <CalendarIcon size={14} className="mr-1.5" />
              <span className="font-medium mr-1.5">Period:</span> {filters.startDate} to {filters.endDate}
            </span>
            
            <span className="hidden sm:inline-block text-blue-300 dark:text-blue-700">|</span>
            
            <span className="inline-flex items-center">
              <PhoneIcon size={14} className="mr-1.5" />
              <span className="font-medium">Direction:</span> {filters.direction === 'all' ? 'All' : filters.direction.charAt(0).toUpperCase() + filters.direction.slice(1)}
            </span>
            
            <span className="hidden sm:inline-block text-blue-300 dark:text-blue-700">|</span>
            
            <span className="inline-flex items-center">
              <CheckCircleIcon size={14} className="mr-1.5" />
              <span className="font-medium">Call Type:</span> {filters.disposition === 'all' ? 'All' : filters.disposition.replace('_', ' ')}
            </span>
          </div>
        </div>
        
        {isLoading && (
          <div className="flex items-center text-blue-700 dark:text-blue-400 mt-2 sm:mt-0">
            <div className="animate-spin h-4 w-4 border-2 border-t-transparent border-blue-500 rounded-full mr-2"></div>
            <span className="text-sm">Loading insights...</span>
          </div>
        )}
      </div>
      
      {/* Key Metrics Cards - Redesigned with gradient backgrounds */}
      <section aria-labelledby="summary-metrics" className="pt-2">
        <div className="sr-only" id="summary-metrics">Summary Metrics</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-xl shadow-sm border border-blue-100 dark:border-blue-800/50 transition-all hover:shadow-md">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-sm font-medium text-blue-700 dark:text-blue-400">Total Calls</h3>
              <div className="p-2 rounded-full bg-white/80 dark:bg-gray-800/80 shadow-sm">
                <PhoneIcon size={18} className="text-blue-500 dark:text-blue-400" />
              </div>
            </div>
            
            <div className="text-3xl font-bold text-gray-800 dark:text-white mb-1">
              {isLoading ? 
                <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div> : 
                data?.summary?.total_calls || 0
              }
            </div>
            
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {data?.time_period?.total_days ? 
                `Over ${data.time_period.total_days} ${data.time_period.total_days === 1 ? 'day' : 'days'}` : 
                'All calls'}
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-6 rounded-xl shadow-sm border border-purple-100 dark:border-purple-800/50 transition-all hover:shadow-md">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-sm font-medium text-purple-700 dark:text-purple-400">Total Callers</h3>
              <div className="p-2 rounded-full bg-white/80 dark:bg-gray-800/80 shadow-sm">
                <UserIcon size={18} className="text-purple-500 dark:text-purple-400" />
              </div>
            </div>
            
            <div className="text-3xl font-bold text-gray-800 dark:text-white mb-1">
              {isLoading ? 
                <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div> : 
                data?.summary?.total_callers || 0
              }
            </div>
            
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {data?.summary?.total_callers === 1 ? 'Unique caller' : 'Unique callers'}
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 p-6 rounded-xl shadow-sm border border-green-100 dark:border-green-800/50 transition-all hover:shadow-md">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-sm font-medium text-green-700 dark:text-green-400">Total Duration</h3>
              <div className="p-2 rounded-full bg-white/80 dark:bg-gray-800/80 shadow-sm">
                <ClockIcon size={18} className="text-green-500 dark:text-green-400" />
              </div>
            </div>
            
            <div className="text-3xl font-bold text-gray-800 dark:text-white mb-1">
              {isLoading ? 
                <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div> : 
                formatDurationDisplay(data?.summary?.total_duration)
              }
            </div>
            
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Total talk time
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-6 rounded-xl shadow-sm border border-amber-100 dark:border-amber-800/50 transition-all hover:shadow-md">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-sm font-medium text-amber-700 dark:text-amber-400">Avg Calls/Caller</h3>
              <div className="p-2 rounded-full bg-white/80 dark:bg-gray-800/80 shadow-sm">
                <BarChartIcon size={18} className="text-amber-500 dark:text-amber-400" />
              </div>
            </div>
            
            <div className="text-3xl font-bold text-gray-800 dark:text-white mb-1">
              {isLoading ? 
                <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div> : 
                Math.round(data?.summary?.avg_calls_per_caller || 0)
              }
            </div>
            
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {Math.round(data?.summary?.avg_calls_per_caller || 0) === 1 ? 
                'Call per caller' : 
                'Calls per caller'}
            </div>
          </div>
        </div>
      </section>
      
      
      {/* Tabbed Chart Section - combines the old charts in a tabbed interface */}
      <section aria-labelledby="detailed-analysis" className="pt-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Tab navigation */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setAnalysisTab('comparison')}
              className={`px-4 py-3 text-sm font-medium transition-all ${
                analysisTab === 'comparison'
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-b-2 border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/10'
              }`}
            >
              Top Caller Comparison
            </button>
            <button
              onClick={() => setAnalysisTab('radar')}
              className={`px-4 py-3 text-sm font-medium transition-all ${
                analysisTab === 'radar'
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-b-2 border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/10'
              }`}
            >
              Performance Radar
            </button>
            <button
              onClick={() => setAnalysisTab('topPerformers')}
              className={`px-4 py-3 text-sm font-medium transition-all ${
                analysisTab === 'topPerformers'
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-b-2 border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/10'
              }`}
            >
              Top Performer Metrics
            </button>
          </div>
          
          {/* Tab content */}
          <div className="p-6">
            {analysisTab === 'comparison' && (
              <div className="h-[400px]">
                <TopCallerComparisonChart 
                  callers={data?.top_callers} 
                  isLoading={isLoading} 
                  sortMetric="call_count"
                />
              </div>
            )}
            
            {analysisTab === 'radar' && (
              <div className="h-[400px]">
                <CallPerformanceRadar 
                  callers={data?.top_callers} 
                  isLoading={isLoading} 
                  maxCallers={5}
                />
              </div>
            )}
            
            {analysisTab === 'topPerformers' && (
              <div>
                <CallerMetricsCards 
                  callers={data?.top_callers} 
                  isLoading={isLoading} 
                />
              </div>
            )}
          </div>
        </div>
      </section>
      
      {/* Auto-refresh status and last updated time at bottom */}
      {autoRefresh.visualIndicators && (autoRefresh.enabled && autoRefresh.enabledSections.callerAnalytics || lastRefreshTime || lastRefreshError) && (
        <div className="flex flex-col sm:flex-row justify-between items-center text-xs text-gray-400 dark:text-gray-500 pt-4 border-t border-gray-100 dark:border-gray-800">
          {autoRefresh.enabled && autoRefresh.enabledSections.callerAnalytics && (
            <div className="flex items-center space-x-2">
              <div className={`w-1.5 h-1.5 rounded-full ${
                lastRefreshError && consecutiveFailures > 0 ? 'bg-red-500' :
                autoRefresh.interval > 0 ? 'bg-green-500' : 'bg-gray-400'
              }`} />
              <span>Auto-refresh: {autoRefresh.interval > 0 ? `${autoRefresh.interval/1000}s` : 'Off'}</span>
              {lastRefreshError && consecutiveFailures > 0 && (
                <span className="text-red-400 dark:text-red-500">
                  (Failed {consecutiveFailures}x)
                </span>
              )}
            </div>
          )}
          <div className="flex flex-col items-end">
            {lastRefreshTime && (
              <div>
                Last updated: {lastRefreshTime.toLocaleTimeString()}
              </div>
            )}
            {lastRefreshError && (
              <div className="text-red-400 dark:text-red-500 mt-1">
                Last error: {lastRefreshError}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 