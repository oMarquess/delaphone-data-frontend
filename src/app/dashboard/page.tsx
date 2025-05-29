'use client';

import { useState, useCallback, useEffect } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { BarChartIcon, PhoneIcon, ClockIcon, UserIcon } from 'lucide-react';
import { SyncOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import useSWR, { mutate } from 'swr';
import DateRangePicker from '@/components/dashboard/DateRangePicker';
import SummaryCard from '@/components/dashboard/SummaryCard';
import CallVolumeChart from '@/components/dashboard/CallVolumeChart';
import CallDispositionChart from '@/components/dashboard/CallDispositionChart';
import HourlyDistributionLineChart from '@/components/dashboard/HourlyDistributionLineChart';
import CallDirectionChart from '@/components/dashboard/CallDirectionChart';
import CallDurationMetricsChart from '@/components/dashboard/CallDurationMetricsChart';
import RecordingMetricsCard from '@/components/dashboard/RecordingMetricsCard';
import CallQualityStatusCard from '@/components/dashboard/CallQualityStatusCard';
import CallDetailsTable from '@/components/dashboard/CallDetailsTable';
import { 
  dashboardService, 
  formatDuration, 
  DashboardMetrics,
  extractDirectionDistribution,
  extractCallQualityMetrics,
  extractRecordingMetrics,
  extractDurationMetrics
} from '@/services/dashboard';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { ROUTES } from '@/config/constants';
import { publishDateChange } from '@/components/ai/AIDrawer';

export default function DashboardPage() {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(), // Today instead of 7 days ago
    endDate: new Date(),
  });
  const { isAuthenticated } = useAuth();
  const { autoRefresh, setRefreshState, lastRefreshTime, setRefreshError, lastRefreshError, consecutiveFailures } = useSettings();
  const router = useRouter();

  // Create a unique key for SWR based on date range
  const swrKey = useCallback(() => {
    const startDateStr = format(dateRange.startDate, 'yyyy-MM-dd');
    const endDateStr = format(dateRange.endDate, 'yyyy-MM-dd');
    return isAuthenticated ? [startDateStr, endDateStr] : null;
  }, [dateRange.startDate, dateRange.endDate, isAuthenticated]);

  // Fetcher function for dashboard metrics
  const metricsFetcher = async ([startDate, endDate]: [string, string]) => {
    try {
      const data = await dashboardService.getDashboardMetrics(startDate, endDate);
      return data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        router.push(ROUTES.AUTH.LOGIN);
      }
      throw error;
    }
  };

  // Fetcher function for call records
  const callRecordsFetcher = async ([startDate, endDate]: [string, string]) => {
    try {
      const data = await dashboardService.getCallRecords(startDate, endDate);
      return data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        router.push(ROUTES.AUTH.LOGIN);
      }
      throw error;
    }
  };

  // Use SWR for dashboard metrics
  const { 
    data: dashboardData, 
    error: dashboardError, 
    isLoading: isDashboardLoading 
  } = useSWR(
    swrKey(),
    metricsFetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
      shouldRetryOnError: false,
      onError: (error) => {
        toast.error('Failed to load dashboard data', {
          description: error.message || 'An unknown error occurred.'
        });
      }
    }
  );

  // Use SWR for call records
  const { 
    data: callRecordsData, 
    error: callRecordsError, 
    isLoading: isCallRecordsLoading 
  } = useSWR(
    swrKey(),
    callRecordsFetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
      shouldRetryOnError: false,
      onError: (error) => {
        toast.error('Failed to load call records', {
          description: error.message || 'An unknown error occurred.'
        });
      }
    }
  );

  // NEW: Auto-refresh functionality for Overview section
  useEffect(() => {
    if (!autoRefresh.enabled || 
        !autoRefresh.enabledSections.overview || 
        autoRefresh.interval <= 0) {
      return;
    }

    console.log('🔄 Setting up auto-refresh for Overview');
    console.log('Interval:', autoRefresh.interval, 'ms');

    const refreshInterval = setInterval(async () => {
      try {
        setRefreshState(true);
        console.log('🔄 Auto-refreshing Overview data at:', new Date().toISOString());
        
        // Use SWR's mutate to refresh data in background
        const currentKey = swrKey();
        if (currentKey) {
          await Promise.all([
            mutate(currentKey, () => metricsFetcher(currentKey as [string, string]), { revalidate: false }),
            mutate(currentKey, () => callRecordsFetcher(currentKey as [string, string]), { revalidate: false })
          ]);
        }
        
        setRefreshState(false, new Date());
        console.log('✅ Auto-refresh completed successfully');
        // Clear any previous errors on success
        setRefreshError(null);
      } catch (error) {
        console.error('❌ Auto-refresh failed:', error);
        setRefreshState(false);
        
        // Track the error
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        setRefreshError(errorMessage);
        
        // Show user notification after 3 consecutive failures
        if (consecutiveFailures >= 2) { // Will be 3 after setRefreshError increments
          toast.error('Auto-refresh temporarily unavailable', {
            description: 'Check your connection or try manual refresh',
            duration: 5000,
          });
        }
      }
    }, autoRefresh.interval);

    return () => {
      console.log('🛑 Cleaning up auto-refresh interval');
      clearInterval(refreshInterval);
    };
  }, [
    autoRefresh.enabled, 
    autoRefresh.enabledSections.overview, 
    autoRefresh.interval,
    swrKey,
    setRefreshState,
    setRefreshError,
    consecutiveFailures
  ]);

  // Combine loading states
  const isLoading = isDashboardLoading || isCallRecordsLoading;

  // Helper function to safely access nested properties
  const getSafeMetric = (path: string, fallback: any = 0) => {
    try {
      if (!dashboardData || !dashboardData.summary) return fallback;
      
      const keys = path.split('.');
      let value: any = dashboardData.summary;
      
      for (const key of keys) {
        if (value === undefined || value === null) return fallback;
        value = value[key];
      }
      
      // Handle non-numeric values
      if (value === undefined || value === null) return fallback;
      if (typeof value === 'string') {
        const parsed = parseFloat(value);
        return isNaN(parsed) ? fallback : parsed;
      }
      if (typeof value !== 'number') return fallback;
      
      return value;
    } catch (e) {
      console.error(`Error accessing ${path}:`, e);
      return fallback;
    }
  };

  // Helper function to generate sample hourly distribution data if none is available
  const generateSampleHourlyData = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    return hours.map(hour => ({
      hour,
      total: 0,
      inbound: 0,
      outbound: 0,
      internal: 0,
      unknown: 0
    }));
  };

  const handleDateRangeChange = (startDate: Date, endDate: Date) => {
    setDateRange({ startDate, endDate });
    
    // Publish date change to keep AIDrawer in sync
    const startDateStr = format(startDate, 'yyyy-MM-dd');
    const endDateStr = format(endDate, 'yyyy-MM-dd');
    publishDateChange(startDateStr, endDateStr);
  };

  // Manual refresh function
  const handleManualRefresh = async () => {
    try {
      setRefreshState(true);
      const currentKey = swrKey();
      if (currentKey) {
        await Promise.all([
          mutate(currentKey, () => metricsFetcher(currentKey as [string, string]), { revalidate: false }),
          mutate(currentKey, () => callRecordsFetcher(currentKey as [string, string]), { revalidate: false })
        ]);
      }
      setRefreshState(false, new Date());
      toast.success('Dashboard refreshed successfully');
      // Clear any previous errors on success
      setRefreshError(null);
    } catch (error) {
      setRefreshState(false);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setRefreshError(errorMessage);
      toast.error('Failed to refresh dashboard', {
        description: errorMessage,
        duration: 4000,
      });
    }
  };

  // Format call records for the table
  const formattedCallRecords = callRecordsData?.top_sources?.map((source: any) => ({
    src: source.src,
    dst: "N/A",
    calldate: callRecordsData?.time_period?.start_date || "N/A",
    duration: source.duration,
    billsec: source.duration,
    disposition: "ANSWERED",
    direction: source.unknown > 0 ? "unknown" : 
              source.inbound > 0 ? "inbound" : 
              source.outbound > 0 ? "outbound" : "internal",
    calls: source.calls,
    avg_duration: source.avg_duration
  })) || [];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Dashboard Overview</h1>
        </div>
        <div className="flex items-center space-x-3">
          {/* NEW: Manual refresh button */}
          <button
            onClick={handleManualRefresh}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Manual refresh"
          >
            <SyncOutlined className={`text-lg ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <DateRangePicker onChange={handleDateRangeChange} className="w-auto" />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Summary Cards */}
        <SummaryCard 
          title="Total Calls"
          value={getSafeMetric('total_calls')}
          icon={<PhoneIcon size={18} />}
          isLoading={isLoading}
        />
        
        <SummaryCard 
          title="Average Call Duration"
          value={formatDuration(getSafeMetric('avg_duration'))}
          icon={<ClockIcon size={18} />}
          isLoading={isLoading}
        />
        
        <SummaryCard 
          title="Answer Rate"
          value={`${getSafeMetric('answer_rate', 0).toFixed(1)}%`}
          icon={<BarChartIcon size={18} />}
          isLoading={isLoading}
        />
        
        <SummaryCard 
          title="Unique Callers"
          value={getSafeMetric('total_inbound') + getSafeMetric('total_outbound')}
          icon={<UserIcon size={18} />}
          isLoading={isLoading}
        />
      </div>
      
      {/* Main visualization area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Hourly Distribution - Full width on large screens */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 lg:col-span-3">
          <h2 className="text-lg font-medium text-gray-800 dark:text-gray-100 mb-4">Hourly Call Distribution</h2>
          <div className="h-[400px]">
            <HourlyDistributionLineChart 
              data={(dashboardData?.hourly_distribution && dashboardData.hourly_distribution.length > 0) 
                ? dashboardData.hourly_distribution 
                : generateSampleHourlyData()} 
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
      
      {/* Secondary charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-800 dark:text-gray-100 mb-4">Call Direction</h2>
          <div className="h-[320px]">
            <CallDirectionChart 
              data={dashboardData ? extractDirectionDistribution(dashboardData) : []} 
              isLoading={isLoading}
            />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-800 dark:text-gray-100 mb-4">Duration Metrics</h2>
          <div className="h-[320px]">
            <CallDurationMetricsChart 
              {...(dashboardData ? extractDurationMetrics(dashboardData) : {})}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
      
      {/* Metrics cards row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <CallQualityStatusCard 
            {...(dashboardData ? extractCallQualityMetrics(dashboardData) : {})}
            isLoading={isLoading}
          />
        </div>
        <div>
          <RecordingMetricsCard 
            {...(dashboardData ? extractRecordingMetrics(dashboardData) : {})}
            isLoading={isLoading}
          />
        </div>
      </div>
      
      {/* Call details table - full width */}
      <div className="bg-white dark:bg-gray-800 p-0 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <CallDetailsTable 
          records={formattedCallRecords}
          isLoading={isLoading}
        />
      </div>
      
      {/* Auto-refresh status and last updated time at bottom */}
      {autoRefresh.visualIndicators && (autoRefresh.enabled && autoRefresh.enabledSections.overview || lastRefreshTime || lastRefreshError) && (
        <div className="flex flex-col sm:flex-row justify-between items-center text-xs text-gray-400 dark:text-gray-500 pt-4 border-t border-gray-100 dark:border-gray-800">
          {autoRefresh.enabled && autoRefresh.enabledSections.overview && (
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