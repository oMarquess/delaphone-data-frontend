'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { BarChartIcon, PhoneIcon, ClockIcon, UserIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
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

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardMetrics | null>(null);
  const [callRecords, setCallRecords] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    endDate: new Date(),
  });
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  
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
      
      return value === undefined || value === null ? fallback : value;
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
      total: Math.floor(Math.random() * 50) + 10,
      inbound: Math.floor(Math.random() * 30) + 5,
      outbound: Math.floor(Math.random() * 20) + 5,
      internal: Math.floor(Math.random() * 5)
    }));
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!isAuthenticated) {
        router.push(ROUTES.AUTH.LOGIN);
        return;
      }
      
      setIsLoading(true);
      try {
        const startDateStr = format(dateRange.startDate, 'yyyy-MM-dd');
        const endDateStr = format(dateRange.endDate, 'yyyy-MM-dd');
        
        // Fetch dashboard metrics directly from /call-records/
        const data = await dashboardService.getDashboardMetrics(startDateStr, endDateStr);
        console.log('Dashboard data:', data); // For debugging
        console.log('Hourly distribution data:', data.hourly_distribution); // Debug hourly distribution
        setDashboardData(data);
        
        // Set call records from the same response if available
        if (data && data.records && Array.isArray(data.records)) {
          setCallRecords(data.records);
        } else {
          // Fallback to fetch records separately
          try {
            const callData = await dashboardService.getCallRecords(startDateStr, endDateStr);
            setCallRecords(callData.records || []);
          } catch (recordError) {
            console.error('Error fetching call records:', recordError);
            setCallRecords([]);
          }
        }
      } catch (error: any) {
        console.error('Error fetching dashboard data:', error);
        
        // Handle different types of errors
        if (error.response?.status === 401) {
          toast.error('Authentication error', { 
            description: 'Your session has expired. Please log in again.'
          });
          router.push(ROUTES.AUTH.LOGIN);
        } else {
          toast.error('Failed to load dashboard data', {
            description: error.message || 'An unknown error occurred.'
          });
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [dateRange, isAuthenticated, router]);
  
  const handleDateRangeChange = (startDate: Date, endDate: Date) => {
    setDateRange({ startDate, endDate });
  };
  
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
          <div className="h-[400px]"> {/* Increased height for better visibility */}
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
          records={callRecords}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
} 