'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { FilterIcon, ChevronDownIcon, CalendarIcon, Download } from 'lucide-react';
import useSWR from 'swr';
import QuickDateSelector from '@/components/analytics/QuickDateSelector';
import CallLogsAdvancedFilter, { CallLogsFilterValues } from '@/components/dashboard/CallLogsAdvancedFilter';
import CallLogsTable, { CallLog } from '@/components/dashboard/CallLogsTable';
import { dashboardService } from '@/services/dashboard';
import { publishDateChange, publishFilterChange } from '@/components/ai/AIDrawer';

export default function CallLogsPage() {
  const [filterVisible, setFilterVisible] = useState(false);
  const [dateRangeLabel, setDateRangeLabel] = useState('Last 7 Days');
  const [dateRange, setDateRange] = useState({
    startDate: format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
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
    shouldRetryOnError: false
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
  
  const handleDateRangeChange = (startDate: string, endDate: string, label: string) => {
    setDateRangeLabel(label);
    
    // If Custom is selected, open the advanced filters section
    if (label === 'Custom') {
      setFilterVisible(true);
      
      // Don't update date range if no dates provided (this prevents API call with empty dates)
      if (!startDate || !endDate) {
        return;
      }
    } else {
      // If any preset is selected, close the advanced filters
      setFilterVisible(false);
    }
    
    // Update dates only if we have valid values
    setDateRange({ startDate, endDate });
    
    // Publish date changes for AI Drawer to sync
    publishDateChange(startDate, endDate);
    
    // Reset page and trigger data refetch
    setCurrentPage(1);
  };
  
  const handleFilterChange = (newFilters: CallLogsFilterValues) => {
    setFilters(newFilters);
    // If the advanced filter includes date changes, update the dateRange state too
    if (newFilters.startDate && newFilters.endDate) {
      setDateRange({
        startDate: newFilters.startDate,
        endDate: newFilters.endDate
      });
      
      // Publish date changes if they're updated
      publishDateChange(newFilters.startDate, newFilters.endDate);
    }
    
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
          <button 
            onClick={() => setFilterVisible(!filterVisible)}
            className="flex items-center gap-2 py-2 px-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <FilterIcon size={16} />
            <span>Advanced Filters</span>
            <ChevronDownIcon size={16} className={`transition-transform ${filterVisible ? 'rotate-180' : ''}`} />
          </button>
          
          <div className="flex items-center gap-2 py-2 px-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md">
            <CalendarIcon size={16} className="text-gray-500 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {dateRange.startDate} to {dateRange.endDate}
            </span>
          </div>
          
          <button className="flex items-center gap-2 py-2 px-4 bg-gray-800 dark:bg-gray-700 text-white rounded-md">
            <Download size={16} />
            <span>Download Logs</span>
          </button>
        </div>
      </div>
      
      {/* Quick date range selector */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Quick Select:</span>
          <QuickDateSelector 
            onChange={handleDateRangeChange} 
            activeLabel={dateRangeLabel}
            filterVisible={filterVisible}
          />
        </div>
      </div>
      
      {/* Collapsible filter section */}
      <div className={`transition-all duration-300 overflow-hidden ${filterVisible ? 'max-h-[1200px] opacity-100 mb-10' : 'max-h-0 opacity-0'}`}>
        <CallLogsAdvancedFilter 
          visible={filterVisible} 
          onFilterChange={handleFilterChange} 
          initialValues={filters}
        />
      </div>
      
      {/* Dashboard status */}
      <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800">
        <div className="text-sm text-blue-800 dark:text-blue-300">
          <span className="inline-flex items-center">
            <CalendarIcon size={14} className="mr-1.5" />
            <span className="font-medium mr-1.5">Period:</span> {dateRange.startDate} to {dateRange.endDate}
          </span>
          <span className="mx-2">•</span>
          <span className="font-medium">Results:</span> {callLogsData.filteredCount} calls
          {data?.summary && (
            <>
              <span className="mx-2">•</span>
              <span className="font-medium">Answered:</span> {data.summary.answered_calls} ({data.summary.answer_rate}%)
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