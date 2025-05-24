'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { FilterIcon, ChevronDownIcon, CalendarIcon, Download, Settings } from 'lucide-react';
import useSWR from 'swr';
import CallLogsAdvancedFilter, { CallLogsFilterValues } from '@/components/dashboard/CallLogsAdvancedFilter';
import CallLogsTable, { CallLog } from '@/components/dashboard/CallLogsTable';
import { dashboardService } from '@/services/dashboard';
import { publishDateChange, publishFilterChange } from '@/components/ai/AIDrawer';
import { DateRangePicker } from '@/components/DateRangePicker';
import { motion, AnimatePresence } from 'framer-motion';

export default function CallLogsPage() {
  const [filterVisible, setFilterVisible] = useState(false);
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
    return {
      startDate: format(startOfDay(today), 'yyyy-MM-dd'),
      endDate: format(endOfDay(today), 'yyyy-MM-dd')
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
    return dashboardService.getCallLogs(startDate, endDate, { 
      ...filterValues,
      page
    });
  };
  
  // Use SWR for data fetching
  const { data, error, isLoading, mutate } = useSWR(swrKey(), fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5000,
    shouldRetryOnError: false,
    onSuccess: () => {
      // Close the advanced filters section when data is successfully loaded
      setFilterVisible(false);
    }
  });
  
  // Add debugging to see API response
  useEffect(() => {
    if (data) {
      console.log('API Response:', {
        data,
        totalCount: data.total_count,
        filteredCount: data.filtered_count,
        recordsLength: data.records?.length,
        pageSize: parseInt(filters.limit || '100'),
        totalPages: Math.ceil((data.filtered_count || 0) / parseInt(filters.limit || '100'))
      });
      // Ensure filters are closed after data is loaded
      setFilterVisible(false);
    }
  }, [data, filters.limit]);
  
  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, dateRange.startDate, dateRange.endDate]);
  
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
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Call Logs</h1>
        
        <div className="flex flex-col sm:flex-row gap-3">
         
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
    </div>
  );
} 