'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { FilterIcon, ChevronDownIcon, CalendarIcon, Download, Settings } from 'lucide-react';
import { SyncOutlined } from '@ant-design/icons';
import useSWR, { mutate } from 'swr';
import CallLogsAdvancedFilter, { CallLogsFilterValues } from '@/components/dashboard/CallLogsAdvancedFilter';
import CallLogsTable, { CallLog } from '@/components/dashboard/CallLogsTable';
import { dashboardService } from '@/services/dashboard';
import { publishDateChange, publishFilterChange } from '@/components/ai/AIDrawer';
import { DateRangePicker } from '@/components/DateRangePicker';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettings } from '@/context/SettingsContext';
import { toast } from 'sonner';

export default function CallLogsPage() {
  const [filterVisible, setFilterVisible] = useState(false);
  const [dateRange, setDateRange] = useState(() => {
    // Set to 2025-06-09 for testing (date with transcript data)
    const testDate = new Date('2025-06-09');
    return {
      startDate: format(startOfDay(testDate), 'yyyy-MM-dd'),
      endDate: format(endOfDay(testDate), 'yyyy-MM-dd')
    };
  });
  const [filters, setFilters] = useState<CallLogsFilterValues>({
    callDirection: 'all',
    callStatus: 'all',
    hasRecording: 'all',
    sourceNumber: '',
    destinationNumber: '',
    direction: 'all',
    minDuration: '',
    maxDuration: '',
    did: '',
    extension: '',
    callerName: '',
    queue: '',
    uniqueCallersOnly: false,
    limit: '100',
    sortBy: 'calldate',
    sortOrder: 'desc'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const { autoRefresh, setRefreshState, lastRefreshTime, setRefreshError, lastRefreshError, consecutiveFailures } = useSettings();
  
  // Count active filters (excluding empty strings and 'all' values)
  const activeFilterCount = Object.entries(filters).reduce((count, [key, value]) => {
    if (key === 'uniqueCallersOnly') {
      return value ? count + 1 : count;
    }
    if (value && value !== 'all' && value !== '') {
      return count + 1;
    }
    return count;
  }, 0);
  
  // Create a unique key for SWR based on filters, date range, and pagination
  const swrKey = useCallback(() => {
    return [
      '/call-records/logs',
      dateRange.startDate,
      dateRange.endDate,
      filters,
      currentPage
    ];
  }, [dateRange.startDate, dateRange.endDate, filters, currentPage]);
  
  // Fetcher function for SWR
  const fetcher = async ([url, startDate, endDate, filterValues, page]: [string, string, string, CallLogsFilterValues, number]) => {
    console.log('🚀 Fetcher called with:', { url, startDate, endDate, page });
    return dashboardService.getCallLogs(startDate, endDate, { 
      ...filterValues,
      page,
      includeTranscripts: true // Explicitly request transcripts
    });
  };
  
  // Use SWR for data fetching
  const { data, error, isLoading, mutate: mutateSWR } = useSWR(swrKey(), fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 1000,
    shouldRetryOnError: false,
    revalidateIfStale: true,
    refreshInterval: 0,
    onSuccess: () => {
      // Close the advanced filters section when data is successfully loaded
      setFilterVisible(false);
    },
    onError: (error) => {
      toast.error('Failed to load call logs', {
        description: error.message || 'An unknown error occurred.'
      });
    }
  });

  // Auto-refresh functionality for Call Logs section
  useEffect(() => {
    if (!autoRefresh.enabled || 
        !autoRefresh.enabledSections.callLogs || 
        autoRefresh.interval <= 0) {
      return;
    }

    console.log('🔄 Setting up auto-refresh for Call Logs');
    console.log('Interval:', autoRefresh.interval, 'ms');

    const refreshInterval = setInterval(async () => {
      try {
        setRefreshState(true);
        console.log('🔄 Auto-refreshing Call Logs data at:', new Date().toISOString());
        
        // Use SWR's mutate to refresh data with cache-busting
        const currentKey = swrKey();
        if (currentKey) {
          // Create cache-busting fetcher that forces fresh data
          const cacheBustingFetcher = async (key: [string, string, string, CallLogsFilterValues, number]) => {
            const data = await dashboardService.getCallLogs(key[1], key[2], { 
              ...key[3],
              page: key[4],
              includeTranscripts: true // Ensure transcripts are included
            });
            return data;
          };
          
          await mutate(currentKey, () => cacheBustingFetcher(currentKey as [string, string, string, CallLogsFilterValues, number]), { 
            revalidate: true,
            populateCache: true,
            optimisticData: undefined
          });
        }
        
        setRefreshState(false, new Date());
        console.log('✅ Call Logs auto-refresh completed successfully');
        // Clear any previous errors on success
        setRefreshError(null);
      } catch (error) {
        console.error('❌ Call Logs auto-refresh failed:', error);
        setRefreshState(false);
        
        // Track the error
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        setRefreshError(errorMessage);
        
        // Show user notification after 3 consecutive failures
        if (consecutiveFailures >= 2) { // Will be 3 after setRefreshError increments
          toast.error('Call Logs auto-refresh temporarily unavailable', {
            description: 'Check your connection or try manual refresh',
            duration: 5000,
          });
        }
      }
    }, autoRefresh.interval);

    return () => {
      console.log('🛑 Cleaning up Call Logs auto-refresh interval');
      clearInterval(refreshInterval);
    };
  }, [
    autoRefresh.enabled, 
    autoRefresh.enabledSections.callLogs, 
    autoRefresh.interval,
    swrKey,
    setRefreshState,
    setRefreshError,
    consecutiveFailures
  ]);
  
  // Add debugging to see API response
  useEffect(() => {
    if (data) {
      console.log('📊 Call Logs Page - API Response:', {
        totalCount: data.total_count,
        filteredCount: data.filtered_count,
        recordsLength: data.records?.length,
        pageSize: parseInt(filters.limit || '100'),
        totalPages: Math.ceil((data.filtered_count || 0) / parseInt(filters.limit || '100')),
        transcriptedRecords: data.records?.filter((r: any) => r.transcript_id)?.length || 0,
        sampleTranscript: data.records?.[0]?.transcript_text ? data.records[0].transcript_text.substring(0, 100) + '...' : 'No transcript'
      });
      console.log('🗓️ Current date range:', dateRange);
      console.log('🔍 Current filters:', filters);
      // Ensure filters are closed after data is loaded
      setFilterVisible(false);
    }
  }, [data, filters.limit]);
  
  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, dateRange]);
  
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleDateRangeChange = (value: any, dateStrings: [string, string]) => {
    // Close the advanced filters section first
    setFilterVisible(false);
    
    // Update the date range
    setDateRange({ startDate: dateStrings[0], endDate: dateStrings[1] });
    
    // Publish date changes for AI Drawer to sync
    publishDateChange(dateStrings[0], dateStrings[1]);
    
    // Reset page and trigger data refetch
    setCurrentPage(1);
  };
  
  const handleFilterChange = (newFilters: CallLogsFilterValues) => {
    setFilters(newFilters);
    
    // Publish filter changes for AI Drawer to sync
    publishFilterChange('Call Logs', newFilters);
    
    // Reset page and trigger data refetch
    setCurrentPage(1);
  };

  // Manual refresh function
  const handleManualRefresh = async () => {
    try {
      setRefreshState(true);
      const currentKey = swrKey();
      if (currentKey) {
        // Create cache-busting fetcher that forces fresh data
        const cacheBustingFetcher = async (key: [string, string, string, CallLogsFilterValues, number]) => {
          const data = await dashboardService.getCallLogs(key[1], key[2], { 
            ...key[3],
            page: key[4],
            includeTranscripts: true // Ensure transcripts are included
          });
          return data;
        };
        
        await mutate(currentKey, () => cacheBustingFetcher(currentKey as [string, string, string, CallLogsFilterValues, number]), { 
          revalidate: true,  // Force revalidation
          populateCache: true,  // Ensure cache is updated
          optimisticData: undefined  // Don't use optimistic updates
        });
      }
      setRefreshState(false, new Date());
      toast.success('Call logs refreshed successfully');
      // Clear any previous errors on success
      setRefreshError(null);
    } catch (error) {
      setRefreshState(false);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setRefreshError(errorMessage);
      toast.error('Failed to refresh call logs', {
        description: errorMessage,
        duration: 4000,
      });
    }
  };
  
  // Extract data for UI display
  const callLogsData = {
    records: data?.records || [],
    totalCount: data?.total_count || 0,
    filteredCount: data?.filtered_count || 0
  };
  
  // Calculate page size from limit
  const pageSize = parseInt(filters.limit || '100');
  
  return (
    <div className="space-y-6">
      {/* Header with filter toggle */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Call Logs</h1>
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
            <CallLogsAdvancedFilter 
              visible={filterVisible} 
              onFilterChange={handleFilterChange} 
              initialValues={filters}
              currentDateRange={dateRange}
            />
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Dashboard status */}
      <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800">
        <div className="text-sm text-blue-800 dark:text-blue-300">
          <span className="inline-flex items-center">
            <CalendarIcon size={14} className="mr-1.5" />
            <span className="font-medium mr-1.5">Period:</span> {dateRange.startDate} to {dateRange.endDate}
          </span>
          <span className="mx-2">•</span>
          <span className="font-medium">Results:</span> {callLogsData.filteredCount} calls
          {data?.summary && filters.callStatus === 'all' && (
            <>
              <span className="mx-2">•</span>
              <span className="font-medium">Answered:</span> {data.summary.answered_calls} ({data.summary.answer_rate}%)
            </>
          )}
          {data?.summary && filters.callStatus !== 'all' && (
            <>
              <span className="mx-2">•</span>
              <span className="font-medium">Filtered by:</span> {filters.callStatus.replace('_', ' ').toLowerCase()}
            </>
          )}
        </div>
        {isLoading && (
          <div className="flex items-center text-blue-700 dark:text-blue-400">
            <div className="animate-spin h-4 w-4 border-2 border-t-transparent border-blue-500 rounded-full mr-2"></div>
            <span className="text-sm">Loading...</span>
          </div>
        )}
        {error && (
          <div className="text-sm text-red-600 dark:text-red-400">
            Error loading data. Please try again.
          </div>
        )}
      </div>
      
      {/* Call Logs Table */}
      <CallLogsTable 
        records={callLogsData.records}
        totalCount={callLogsData.totalCount}
        filteredCount={callLogsData.filteredCount}
        currentPage={currentPage}
        onPageChange={handlePageChange}
        pageSize={pageSize}
        isLoading={isLoading}
      />
      
      {/* Auto-refresh status and last updated time at bottom */}
      {autoRefresh.visualIndicators && (autoRefresh.enabled && autoRefresh.enabledSections.callLogs || lastRefreshTime || lastRefreshError) && (
        <div className="flex flex-col sm:flex-row justify-between items-center text-xs text-gray-400 dark:text-gray-500 pt-4 border-t border-gray-100 dark:border-gray-800">
          {autoRefresh.enabled && autoRefresh.enabledSections.callLogs && (
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