'use client';

import React, { useState } from 'react';
import { PhoneIcon, UserIcon, ClockIcon, BarChartIcon } from 'lucide-react';
import SummaryCard from '@/components/dashboard/SummaryCard';
import { AnalyticsFilterBar, AnalyticsFilters } from '@/components/analytics/AnalyticsFilterBar';
import { useAnalyticsData, formatDuration } from '@/services/analytics';
import TopCallerComparisonChart from '@/components/analytics/TopCallerComparisonChart';
import ActivityTimeline from '@/components/analytics/ActivityTimeline';
import CallerMetricsCards from '@/components/analytics/CallerMetricsCards';
import CallPerformanceRadar from '@/components/analytics/CallPerformanceRadar';

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

  const handleFilterChange = (newFilters: AnalyticsFilters) => {
    setFilters(newFilters);
  };

  // Format duration from seconds to minutes for display
  const formatDurationDisplay = (seconds: number = 0) => {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} min`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Call Analytics</h1>
      </div>
      
      <AnalyticsFilterBar 
        onFilterChange={handleFilterChange} 
        initialFilters={initialFilters}
      />
      
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
      
      {isError && (
        <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg border border-red-200 dark:border-red-800">
          <h2 className="text-lg font-medium text-red-800 dark:text-red-400 mb-2">Error Loading Data</h2>
          <p className="text-red-600 dark:text-red-400">Failed to load analytics data. Please try again later.</p>
        </div>
      )}
      
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-medium text-gray-800 dark:text-gray-100 mb-4">Key Performance Metrics</h2>
        <CallerMetricsCards 
          callers={data?.top_callers} 
          isLoading={isLoading} 
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-800 dark:text-gray-100 mb-4">Top Caller Comparison</h2>
          <TopCallerComparisonChart 
            callers={data?.top_callers} 
            isLoading={isLoading} 
            sortMetric="call_count"
          />
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-800 dark:text-gray-100 mb-4">Caller Performance Radar</h2>
          <CallPerformanceRadar 
            callers={data?.top_callers} 
            isLoading={isLoading} 
            maxCallers={3}
          />
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-medium text-gray-800 dark:text-gray-100 mb-4">Activity Timeline</h2>
        <ActivityTimeline 
          data={{
            top_callers: data?.top_callers,
            time_period: data?.time_period
          }} 
          isLoading={isLoading}
        />
      </div>
    </div>
  );
} 