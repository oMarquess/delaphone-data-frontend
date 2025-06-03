'use client';

import { useState, useEffect } from 'react';
import { SyncOutlined } from '@ant-design/icons';
import { DateRangePicker } from '@/components/DateRangePicker';
import { useSettings } from '@/context/SettingsContext';
import { toast } from 'sonner';
import { publishDateChange } from '@/components/ai/AIDrawer';

export default function AIInsightsPage() {
  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];
  
  const [dateRange, setDateRange] = useState({
    startDate: today,
    endDate: today,
  });
  const [isLoading, setIsLoading] = useState(false);
  const { autoRefresh, setRefreshState, lastRefreshTime, setRefreshError, lastRefreshError, consecutiveFailures } = useSettings();

  const handleDateRangeChange = (value: any, dateStrings: [string, string]) => {
    // Update the date range
    setDateRange({
      startDate: dateStrings[0],
      endDate: dateStrings[1]
    });
    
    // Publish date changes for AI Drawer to sync
    publishDateChange(dateStrings[0], dateStrings[1]);
  };

  // Manual refresh function
  const handleManualRefresh = async () => {
    try {
      setRefreshState(true);
      setIsLoading(true);
      
      // Simulate API call for now
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setRefreshState(false, new Date());
      setIsLoading(false);
      toast.success('AI insights refreshed successfully');
      // Clear any previous errors on success
      setRefreshError(null);
    } catch (error) {
      setRefreshState(false);
      setIsLoading(false);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setRefreshError(errorMessage);
      toast.error('Failed to refresh AI insights', {
        description: errorMessage,
        duration: 4000,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with date range picker */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <div className="flex items-center space-x-2">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">AI Insights</h1>
          <span className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100 text-xs px-2 py-1 rounded-full">New</span>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          {/* Manual refresh button */}
          <button
            onClick={handleManualRefresh}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Manual refresh"
          >
            <SyncOutlined className={`text-lg ${isLoading ? 'animate-spin' : ''}`} />
          </button>
         
          {/* Date Range Picker */}
          <div className="flex items-center">
            <DateRangePicker
              onChange={handleDateRangeChange}
              startDate={dateRange.startDate}
              endDate={dateRange.endDate}
            />
          </div>
          
          {/* Manual Refresh Button */}
          {/* <button
            onClick={handleManualRefresh}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <SyncOutlined 
              className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} 
            />
            Refresh
          </button> */}
        </div>
      </div>

      {/* Content Area - Empty for now */}
      <div className="flex items-center justify-center h-96 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="text-center">
          <div className="text-gray-400 dark:text-gray-500 text-lg mb-2">
            AI Insights Coming Soon
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Select a date range to begin analyzing your call data
          </p>
        </div>
      </div>
    </div>
  );
} 