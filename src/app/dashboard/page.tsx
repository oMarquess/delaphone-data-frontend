'use client';

import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { BarChartIcon, PhoneIcon, ClockIcon, UserIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
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
import { ROUTES } from '@/config/constants';
import { publishDateChange } from '@/components/ai/AIDrawer';

export default function DashboardPage() {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    endDate: new Date(),
  });
  const { isAuthenticated } = useAuth();
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
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Dashboard Overview</h1>
        <DateRangePicker onChange={handleDateRangeChange} className="w-auto" />
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
    </div>
  );
} 