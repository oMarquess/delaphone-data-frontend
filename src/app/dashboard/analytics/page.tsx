'use client';

import React, { useState } from 'react';
import { PhoneIcon, UserIcon, ClockIcon, BarChartIcon, FilterIcon, ChevronDownIcon, CalendarIcon } from 'lucide-react';
import SummaryCard from '@/components/dashboard/SummaryCard';
import { AnalyticsFilterBar, AnalyticsFilters } from '@/components/analytics/AnalyticsFilterBar';
import { useAnalyticsData, formatDuration } from '@/services/analytics';
import TopCallerComparisonChart from '@/components/analytics/TopCallerComparisonChart';
import ActivityTimeline from '@/components/analytics/ActivityTimeline';
import CallerMetricsCards from '@/components/analytics/CallerMetricsCards';
import CallPerformanceRadar from '@/components/analytics/CallPerformanceRadar';
import QuickDateSelector from '@/components/analytics/QuickDateSelector';
import { publishDateChange, publishFilterChange } from '@/components/ai/AIDrawer';

export default function AnalyticsPage() {
  // Initial filters
  const initialFilters: AnalyticsFilters = {
    startDate: '2023-01-01',
    endDate: '2023-01-10',
    minCalls: 3,
    disposition: 'ANSWERED',
    direction: 'outbound',
    sortBy: 'count',
    limit: 10
  };

  const [filters, setFilters] = useState<AnalyticsFilters>(initialFilters);
  const { data, isLoading, isError } = useAnalyticsData(filters);
  const [filterVisible, setFilterVisible] = useState(false);
  const [dateRangeLabel, setDateRangeLabel] = useState('Custom');

  const handleFilterChange = (newFilters: AnalyticsFilters) => {
    setFilters(newFilters);
    
    // Publish filter changes for AI Drawer to sync
    publishFilterChange('Call Analytics', newFilters);
    
    // Also publish date changes if they're included
    if (newFilters.startDate && newFilters.endDate) {
      publishDateChange(newFilters.startDate, newFilters.endDate);
    }
  };

  const handleDateRangeChange = (startDate: string, endDate: string, label: string) => {
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
    
    // Publish date changes for AI Drawer to sync
    publishDateChange(startDate, endDate);
    
    const newFilters = {
      ...filters,
      startDate,
      endDate
    };
    setFilters(newFilters);
    
    // If we select a preset, automatically apply the filter
    if (label !== 'Custom') {
      // No need to call handleFilterChange here since we're already publishing the date change
      // and we'll update filters below
      publishFilterChange('Call Analytics', newFilters);
    }
  };

  // Format duration from seconds to minutes for display
  const formatDurationDisplay = (seconds: number = 0) => {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} min`;
  };

  return (
    <div className="space-y-6">
      {/* Header with filter toggle */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Call Analytics</h1>
        
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
              {data?.time_period?.start_date} to {data?.time_period?.end_date}
            </span>
          </div>
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
      <div className={`transition-all duration-300 overflow-hidden ${filterVisible ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
        <AnalyticsFilterBar 
          onFilterChange={handleFilterChange} 
          initialFilters={initialFilters}
        />
      </div>
      
      {/* Error message */}
      {isError && (
        <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg border border-red-200 dark:border-red-800">
          <h2 className="text-lg font-medium text-red-800 dark:text-red-400 mb-2">Error Loading Data</h2>
          <p className="text-red-600 dark:text-red-400">Failed to load analytics data. Please try again later.</p>
        </div>
      )}
      
      {/* Dashboard status */}
      <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800">
        <div className="text-sm text-blue-800 dark:text-blue-300">
          <span className="font-medium">Period:</span> {filters.startDate} to {filters.endDate}{' '}
          <span className="mx-2">•</span>
          <span className="font-medium">Direction:</span> {filters.direction}{' '}
          <span className="mx-2">•</span>
          <span className="font-medium">Call Type:</span> {filters.disposition}{' '}
        </div>
        {isLoading && (
          <div className="flex items-center text-blue-700 dark:text-blue-400">
            <div className="animate-spin h-4 w-4 border-2 border-t-transparent border-blue-500 rounded-full mr-2"></div>
            <span className="text-sm">Loading...</span>
          </div>
        )}
      </div>
      
      {/* Key Metrics Section */}
      <section aria-labelledby="summary-metrics">
        <div className="sr-only" id="summary-metrics">Summary Metrics</div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <SummaryCard 
            title="Total Calls"
            value={data?.summary?.total_calls || 0}
            icon={<PhoneIcon size={18} />}
            isLoading={isLoading}
          />
          
          <SummaryCard 
            title="Total Callers"
            value={data?.summary?.total_callers || 0}
            icon={<UserIcon size={18} />}
            isLoading={isLoading}
          />
          
          <SummaryCard 
            title="Total Duration"
            value={formatDurationDisplay(data?.summary?.total_duration)}
            icon={<ClockIcon size={18} />}
            isLoading={isLoading}
          />
          
          <SummaryCard 
            title="Avg Calls/Caller"
            value={(data?.summary?.avg_calls_per_caller || 0).toFixed(2)}
            icon={<BarChartIcon size={18} />}
            isLoading={isLoading}
          />
        </div>
      </section>
      
      {/* Top Performers Section */}
      <section aria-labelledby="top-performers" className="pt-2">
        <h2 id="top-performers" className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 px-1">Top Performers</h2>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <CallerMetricsCards 
            callers={data?.top_callers} 
            isLoading={isLoading} 
          />
        </div>
      </section>
      
      {/* Detailed Analysis Section - Side by side charts */}
      <section aria-labelledby="detailed-analysis" className="pt-2">
        <h2 id="detailed-analysis" className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 px-1">Detailed Analysis</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-md font-medium text-gray-800 dark:text-gray-100 mb-4">Top Caller Comparison</h3>
            <TopCallerComparisonChart 
              callers={data?.top_callers} 
              isLoading={isLoading} 
              sortMetric="call_count"
            />
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-md font-medium text-gray-800 dark:text-gray-100 mb-4">Caller Performance Radar</h3>
            <CallPerformanceRadar 
              callers={data?.top_callers} 
              isLoading={isLoading} 
              maxCallers={3}
            />
          </div>
        </div>
      </section>
      
      {/* Activity Timeline Section - Full width */}
      <section aria-labelledby="activity-timeline" className="pt-2">
        <h2 id="activity-timeline" className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 px-1">Activity Over Time</h2>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <ActivityTimeline 
            data={{
              top_callers: data?.top_callers,
              time_period: data?.time_period
            }} 
            isLoading={isLoading}
          />
        </div>
      </section>
    </div>
  );
} 