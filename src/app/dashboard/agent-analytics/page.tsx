'use client';

import React, { useState, useEffect } from 'react';
import { PhoneIcon, UserIcon, ClockIcon, BarChartIcon, FilterIcon, ChevronDownIcon, CalendarIcon, CheckCircleIcon, Settings } from 'lucide-react';
import { SyncOutlined } from '@ant-design/icons';
import { AnalyticsFilters } from '@/components/analytics/AnalyticsFilterBar';
import { AgentAnalyticsFilterBar, AgentAnalyticsFilters } from '@/components/analytics/AgentAnalyticsFilterBar';
import { useAnalyticsData, formatDuration } from '@/services/analytics';
import QuickDateSelector from '@/components/analytics/QuickDateSelector';
import { publishDateChange, publishFilterChange } from '@/components/ai/AIDrawer';
import AgentPerformanceChart from '@/components/analytics/AgentPerformanceChart';
import AgentDispositionChart from '@/components/analytics/AgentDispositionChart';
import AgentEfficiencyGauges from '@/components/analytics/AgentEfficiencyGauges';
import { dashboardService } from '@/services/dashboard';
import { DateRangePicker } from '@/components/DateRangePicker';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettings } from '@/context/SettingsContext';
import { toast } from 'sonner';

export default function AgentAnalyticsPage() {
  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];
  
  // Initial filters
  const initialFilters: AgentAnalyticsFilters = {
    startDate: today,
    endDate: today,
    minCalls: 1,
    disposition: 'all',
    direction: 'all',
    sortBy: 'count',
    limit: 100,
    agent: 'all'
  };

  const [filters, setFilters] = useState<AgentAnalyticsFilters>(initialFilters);
  const { data, isLoading, isError, mutate } = useAnalyticsData(filters, 'agent');
  const [filterVisible, setFilterVisible] = useState(false);
  const [dateRangeLabel, setDateRangeLabel] = useState('Custom');
  const [dateRange, setDateRange] = useState({ startDate: today, endDate: today });
  const { autoRefresh, setRefreshState, lastRefreshTime } = useSettings();

  // State for tab selection in the detailed analysis section
  const [analysisTab, setAnalysisTab] = useState<string>('performance');

  // Debug current filters and data
  useEffect(() => {
    console.log('Current Filters:', filters);
    console.log('Current Data:', data);
  }, [filters, data]);

  // Auto-refresh functionality for Agent Analytics section
  useEffect(() => {
    if (!autoRefresh.enabled || 
        !autoRefresh.enabledSections.agentAnalytics || 
        autoRefresh.interval <= 0) {
      return;
    }

    console.log('🔄 Setting up auto-refresh for Agent Analytics');
    console.log('Interval:', autoRefresh.interval, 'ms');

    const refreshInterval = setInterval(async () => {
      try {
        setRefreshState(true);
        console.log('🔄 Auto-refreshing Agent Analytics data at:', new Date().toISOString());
        
        // Use the mutate function to refresh data in background
        await mutate();
        
        setRefreshState(false, new Date());
        console.log('✅ Agent Analytics auto-refresh completed successfully');
      } catch (error) {
        console.error('❌ Agent Analytics auto-refresh failed:', error);
        setRefreshState(false);
        // Don't show error toast for background refresh failures
      }
    }, autoRefresh.interval);

    return () => {
      console.log('🛑 Cleaning up Agent Analytics auto-refresh interval');
      clearInterval(refreshInterval);
    };
  }, [
    autoRefresh.enabled, 
    autoRefresh.enabledSections.agentAnalytics, 
    autoRefresh.interval,
    setRefreshState,
    mutate
  ]);

  const handleFilterChange = (newFilters: AgentAnalyticsFilters) => {
    console.group('Filter Change Process');
    console.log('1. New filters received from filter bar:', newFilters);
    
    // Ensure we keep the current date range when applying filters
    const updatedFilters = {
      ...newFilters,
      startDate: filters.startDate,
      endDate: filters.endDate
    };
    
    console.log('2. Updated filters with date range:', updatedFilters);
    setFilters(updatedFilters);
    
    // Publish filter changes for AI Drawer to sync
    console.log('3. Publishing filter changes to AI Drawer');
    publishFilterChange('Agent Analytics', updatedFilters);
    
    // Also publish date changes if they're included
    if (updatedFilters.startDate && updatedFilters.endDate) {
      console.log('4. Publishing date changes:', {
        startDate: updatedFilters.startDate,
        endDate: updatedFilters.endDate
      });
      publishDateChange(updatedFilters.startDate, updatedFilters.endDate);
    }

    // Force a re-fetch of the data
    console.log('5. Triggering data refetch with filters:', updatedFilters);
    mutate(undefined, {
      revalidate: true,
      rollbackOnError: true
    }).then(() => {
      console.log('6. Data refetch completed');
      // Close the filter panel after successful data fetch
      setFilterVisible(false);
    }).catch(error => {
      console.error('6. Error during data refetch:', error);
    });
    console.groupEnd();
  };

  // Debug data fetching
  useEffect(() => {
    if (isLoading) {
      console.log('Data is loading...');
    }
    if (isError) {
      console.error('Error loading data');
    }
    if (data) {
      console.log('New data received:', {
        timePeriod: data.time_period,
        filters: data.filters,
        summary: data.summary,
        agents: data.agents
      });
    }
  }, [data, isLoading, isError]);

  const handleDateRangeChange = (value: any, dateStrings: [string, string]) => {
    // Update the date range
    setDateRangeLabel('Custom');
    setDateRange({ startDate: dateStrings[0], endDate: dateStrings[1] });
    
    // Publish date changes for AI Drawer to sync
    publishDateChange(dateStrings[0], dateStrings[1]);
    
    // Update filters with new date range
    const newFilters = {
      ...filters,
      startDate: dateStrings[0],
      endDate: dateStrings[1]
    };
    setFilters(newFilters);
    
    // Publish filter changes
    publishFilterChange('Agent Analytics', newFilters);
  };

  // Manual refresh function
  const handleManualRefresh = async () => {
    try {
      setRefreshState(true);
      await mutate();
      setRefreshState(false, new Date());
      toast.success('Agent analytics refreshed successfully');
    } catch (error) {
      setRefreshState(false);
      toast.error('Failed to refresh agent analytics');
    }
  };

  // Count active filters (excluding empty strings, 'all' values, and date range)
  const activeFilterCount = Object.entries(filters).reduce((count, [key, value]) => {
    // Skip date range and default values
    if (key === 'startDate' || key === 'endDate') return count;
    if (value === 'all' || value === '' || value === null || value === undefined) return count;
    if (key === 'minCalls' && value === 5) return count; // Skip default minCalls
    if (key === 'limit' && value === 100) return count; // Skip default limit
    if (key === 'sortBy' && value === 'call_count') return count; // Skip default sort
    return count + 1;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Header with filter toggle */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Agent Analytics</h1>
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
              startDate={dateRange.startDate}
              endDate={dateRange.endDate}
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
            onChange={handleDateRangeChange} 
            activeLabel={dateRangeLabel}
            filterVisible={filterVisible}
          />
        </div>
      </div> */}
      
      {/* Collapsible filter section */}
      <AnimatePresence>
        {filterVisible && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <AgentAnalyticsFilterBar 
              onFilterChange={handleFilterChange} 
              initialFilters={filters}
              agents={data?.agents || []}
            />
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Error message */}
      {isError && (
        <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg border border-red-200 dark:border-red-800">
          <h2 className="text-lg font-medium text-red-800 dark:text-red-400 mb-2">Error Loading Data</h2>
          <p className="text-red-600 dark:text-red-400">Failed to load analytics data. Please try again later.</p>
        </div>
      )}
      
      {/* Dashboard status with improved styling */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 p-4 rounded-lg border border-green-100 dark:border-green-800">
        <div className="text-sm text-green-800 dark:text-green-300 space-y-1 sm:space-y-0">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="inline-flex items-center">
              <CalendarIcon size={14} className="mr-1.5" />
              <span className="font-medium mr-1.5">Period:</span> {dateRange.startDate} to {dateRange.endDate}
            </span>
            
            <span className="hidden sm:inline-block text-green-300 dark:text-green-700">|</span>
            
            <span className="inline-flex items-center">
              <PhoneIcon size={14} className="mr-1.5" />
              <span className="font-medium">Direction:</span> {filters.direction}
            </span>
            
            <span className="hidden sm:inline-block text-green-300 dark:text-green-700">|</span>
            
            <span className="inline-flex items-center">
              <CheckCircleIcon size={14} className="mr-1.5" />
              <span className="font-medium">Call Type:</span> {filters.disposition}
            </span>
          </div>
        </div>
        
        {isLoading && (
          <div className="flex items-center text-green-700 dark:text-green-400 mt-2 sm:mt-0">
            <div className="animate-spin h-4 w-4 border-2 border-t-transparent border-green-500 rounded-full mr-2"></div>
            <span className="text-sm">Loading insights...</span>
          </div>
        )}
      </div>
      
      {/* Key Metrics Cards - Agent-focused metrics */}
      <section aria-labelledby="summary-metrics" className="pt-2">
        <div className="sr-only" id="summary-metrics">Agent Summary Metrics</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-xl shadow-sm border border-blue-100 dark:border-blue-800/50 transition-all hover:shadow-md">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-sm font-medium text-blue-700 dark:text-blue-400">Total Agents</h3>
              <div className="p-2 rounded-full bg-white/80 dark:bg-gray-800/80 shadow-sm">
                <UserIcon size={18} className="text-blue-500 dark:text-blue-400" />
              </div>
            </div>
            
            <div className="text-3xl font-bold text-gray-800 dark:text-white mb-1">
              {isLoading ? 
                <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div> : 
                data?.summary?.total_agents || 0
              }
            </div>
            
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {(data?.summary?.total_agents || 0) === 1 ? 'Active agent' : 'Active agents'}
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-6 rounded-xl shadow-sm border border-purple-100 dark:border-purple-800/50 transition-all hover:shadow-md">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-sm font-medium text-purple-700 dark:text-purple-400">Avg Calls/Agent</h3>
              <div className="p-2 rounded-full bg-white/80 dark:bg-gray-800/80 shadow-sm">
                <PhoneIcon size={18} className="text-purple-500 dark:text-purple-400" />
              </div>
            </div>
            
            <div className="text-3xl font-bold text-gray-800 dark:text-white mb-1">
              {isLoading ? 
                <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div> : 
                Math.round((data?.summary?.total_calls || 0) / (data?.summary?.total_agents || 1))
              }
            </div>
            
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {Math.round((data?.summary?.total_calls || 0) / (data?.summary?.total_agents || 1)) === 1 ? 
                'Call per agent' : 
                'Calls per agent'}
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 p-6 rounded-xl shadow-sm border border-green-100 dark:border-green-800/50 transition-all hover:shadow-md">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-sm font-medium text-green-700 dark:text-green-400">Avg Handle Time</h3>
              <div className="p-2 rounded-full bg-white/80 dark:bg-gray-800/80 shadow-sm">
                <ClockIcon size={18} className="text-green-500 dark:text-green-400" />
              </div>
            </div>
            
            <div className="text-3xl font-bold text-gray-800 dark:text-white mb-1">
              {isLoading ? 
                <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div> : 
                Math.round(((data?.summary?.avg_handling_time || data?.summary?.avg_handle_time || 
                  (data?.summary?.team_averages?.call_duration || 0)) / 60) || 1)
              }
            </div>
            
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Minutes per call
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-6 rounded-xl shadow-sm border border-amber-100 dark:border-amber-800/50 transition-all hover:shadow-md">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-sm font-medium text-amber-700 dark:text-amber-400">Avg Resolution Rate</h3>
              <div className="p-2 rounded-full bg-white/80 dark:bg-gray-800/80 shadow-sm">
                <CheckCircleIcon size={18} className="text-amber-500 dark:text-amber-400" />
              </div>
            </div>
            
            <div className="text-3xl font-bold text-gray-800 dark:text-white mb-1">
              {isLoading ? 
                <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div> : 
                `${Math.round(data?.summary?.avg_answer_rate || 0)}%`
              }
            </div>
            
            <div className="text-sm text-gray-500 dark:text-gray-400">
              First call resolution
            </div>
          </div>
        </div>
      </section>
      
      {/* Placeholder for agent analytics charts */}
      <section aria-labelledby="agent-analysis" className="pt-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Tab navigation */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setAnalysisTab('performance')}
              className={`px-4 py-3 text-sm font-medium transition-all ${
                analysisTab === 'performance'
                  ? 'bg-green-50 dark:bg-green-900/20 border-b-2 border-green-500 dark:border-green-400 text-green-600 dark:text-green-400'
                  : 'text-gray-600 dark:text-gray-300 hover:text-green-500 dark:hover:text-green-400 hover:bg-green-50/50 dark:hover:bg-green-900/10'
              }`}
            >
              Agent Performance
            </button>
            <button
              onClick={() => setAnalysisTab('efficiency')}
              className={`px-4 py-3 text-sm font-medium transition-all ${
                analysisTab === 'efficiency'
                  ? 'bg-green-50 dark:bg-green-900/20 border-b-2 border-green-500 dark:border-green-400 text-green-600 dark:text-green-400'
                  : 'text-gray-600 dark:text-gray-300 hover:text-green-500 dark:hover:text-green-400 hover:bg-green-50/50 dark:hover:bg-green-900/10'
              }`}
            >
              Efficiency Metrics
            </button>
            <button
              onClick={() => setAnalysisTab('satisfaction')}
              className={`px-4 py-3 text-sm font-medium transition-all ${
                analysisTab === 'satisfaction'
                  ? 'bg-green-50 dark:bg-green-900/20 border-b-2 border-green-500 dark:border-green-400 text-green-600 dark:text-green-400'
                  : 'text-gray-600 dark:text-gray-300 hover:text-green-500 dark:hover:text-green-400 hover:bg-green-50/50 dark:hover:bg-green-900/10'
              }`}
            >
              Customer Satisfaction
            </button>
          </div>
          
          {/* Tab content */}
          <div className="p-6">
            {analysisTab === 'performance' && (
              <div className="h-[400px]">
                <AgentPerformanceChart 
                  agents={data?.agents || []} 
                  isLoading={isLoading}
                  teamAverages={data?.summary?.team_averages}
                />
              </div>
            )}
            
            {analysisTab === 'efficiency' && (
              <div className="h-[400px]">
                <AgentDispositionChart
                  dispositionData={data?.disposition_data || []}
                  isLoading={isLoading}
                />
              </div>
            )}
            
            {analysisTab === 'satisfaction' && (
              <div className="h-[530px]">
                <AgentEfficiencyGauges
                  efficiencyData={data?.gauge_metrics?.efficiency_score || []}
                  isLoading={isLoading}
                />
              </div>
            )}
          </div>
        </div>
      </section>
      
      {/* Auto-refresh status and last updated time at bottom */}
      {autoRefresh.visualIndicators && (autoRefresh.enabled && autoRefresh.enabledSections.agentAnalytics || lastRefreshTime) && (
        <div className="flex flex-col sm:flex-row justify-between items-center text-xs text-gray-400 dark:text-gray-500 pt-4 border-t border-gray-100 dark:border-gray-800">
          {autoRefresh.enabled && autoRefresh.enabledSections.agentAnalytics && (
            <div className="flex items-center space-x-2">
              <div className={`w-1.5 h-1.5 rounded-full ${
                autoRefresh.interval > 0 ? 'bg-green-500' : 'bg-gray-400'
              }`} />
              <span>Auto-refresh: {autoRefresh.interval > 0 ? `${autoRefresh.interval/1000}s` : 'Off'}</span>
            </div>
          )}
          {lastRefreshTime && (
            <div>
              Last updated: {lastRefreshTime.toLocaleTimeString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 