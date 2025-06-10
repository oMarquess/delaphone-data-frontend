'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { toast } from 'sonner';
import { BarChartIcon, PhoneIcon, ClockIcon, UserIcon, TrendingUpIcon, HeadphonesIcon, ChevronsLeftRight, MoreHorizontal, X, Info, PackageIcon } from 'lucide-react';
import { SyncOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import useSWR, { mutate } from 'swr';
import { motion, AnimatePresence } from 'framer-motion';

// Components for Calls Analytics
import SummaryCard from '@/components/dashboard/SummaryCard';
import CallVolumeChart from '@/components/dashboard/CallVolumeChart';
import CallDispositionChart from '@/components/dashboard/CallDispositionChart';
import HourlyDistributionLineChart from '@/components/dashboard/HourlyDistributionLineChart';
import CallDirectionChart from '@/components/dashboard/CallDirectionChart';
import CallDurationMetricsChart from '@/components/dashboard/CallDurationMetricsChart';
import RecordingMetricsCard from '@/components/dashboard/RecordingMetricsCard';
import CallQualityStatusCard from '@/components/dashboard/CallQualityStatusCard';
import CallDetailsTable from '@/components/dashboard/CallDetailsTable';

// Components for Customer Analytics
import TopCallerComparisonChart from '@/components/analytics/TopCallerComparisonChart';
import CallPerformanceRadar from '@/components/analytics/CallPerformanceRadar';
import CallerMetricsCards from '@/components/analytics/CallerMetricsCards';

// Components for Agent Analytics
import AgentPerformanceChart from '@/components/analytics/AgentPerformanceChart';
import AgentDispositionChart from '@/components/analytics/AgentDispositionChart';
import AgentEfficiencyGauges from '@/components/analytics/AgentEfficiencyGauges';
import { AgentAnalyticsFilters } from '@/components/analytics/AgentAnalyticsFilterBar';

// Date Range Picker (same as call logs)
import { DateRangePicker } from '@/components/DateRangePicker';

// Services and utilities
import { 
  dashboardService, 
  formatDuration, 
  DashboardMetrics,
  extractDirectionDistribution,
  extractCallQualityMetrics,
  extractRecordingMetrics,
  extractDurationMetrics
} from '@/services/dashboard';
import { useAnalyticsData } from '@/services/analytics';
import { useCustomerVoiceSentimentMetrics } from '@/services/aiInsights';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { ROUTES } from '@/config/constants';
import { publishDateChange } from '@/components/ai/AIDrawer';

export default function DashboardPage() {
  // State management
  const [activeTab, setActiveTab] = useState<'calls' | 'customer' | 'agent' | 'products'>('calls');
  const [explanationModal, setExplanationModal] = useState<string | null>(null);
  
  // Date range state (same pattern as call logs)
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
    return {
      startDate: format(startOfDay(today), 'yyyy-MM-dd'),
      endDate: format(endOfDay(today), 'yyyy-MM-dd')
    };
  });
  
  const { isAuthenticated } = useAuth();
  const { autoRefresh, setRefreshState, lastRefreshTime, setRefreshError, lastRefreshError, consecutiveFailures } = useSettings();
  const router = useRouter();

  // Create a unique key for SWR based on date range
  const swrKey = useCallback(() => {
    return isAuthenticated ? [dateRange.startDate, dateRange.endDate] : null;
  }, [dateRange.startDate, dateRange.endDate, isAuthenticated]);

  // Fetcher functions for dashboard metrics
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
      dedupingInterval: 1000,
      shouldRetryOnError: false,
      revalidateIfStale: true,
      refreshInterval: 0,
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
      dedupingInterval: 1000,
      shouldRetryOnError: false,
      revalidateIfStale: true,
      refreshInterval: 0,
      onError: (error) => {
        toast.error('Failed to load call records', {
          description: error.message || 'An unknown error occurred.'
        });
      }
    }
  );

  // Analytics data for Customer Analytics tab
  const { data: customerAnalyticsData, isLoading: isCustomerLoading, mutate: mutateCustomer } = useAnalyticsData({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    minCalls: 1,
    disposition: 'all',
    direction: 'all',
    sortBy: 'count',
    limit: 100
  });

  const { data: agentAnalyticsData, isLoading: isAgentLoading, mutate: mutateAgent } = useAnalyticsData({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    minCalls: 1,
    disposition: 'all',
    direction: 'all',
    sortBy: 'count',
    limit: 100,
    agent: 'all'
  } as AgentAnalyticsFilters, 'agent');

  const { data: customerVoiceData, isLoading: isVoiceLoading, mutate: mutateVoice } = useCustomerVoiceSentimentMetrics(
    dateRange.startDate,
    dateRange.endDate
  );

  // Auto-refresh functionality for Overview section
  useEffect(() => {
    if (!autoRefresh.enabled || 
        !autoRefresh.enabledSections.overview || 
        autoRefresh.interval <= 0) {
      return;
    }

    console.log('🔄 Setting up auto-refresh for Analytics Dashboard');
    console.log('Interval:', autoRefresh.interval, 'ms');

    const refreshInterval = setInterval(async () => {
      try {
        setRefreshState(true);
        console.log('🔄 Auto-refreshing Analytics Dashboard data at:', new Date().toISOString());
        
        // Use SWR's mutate to refresh data with cache-busting
        const currentKey = swrKey();
        if (currentKey) {
          const cacheBustingMetricsFetcher = async (key: [string, string]) => {
            const data = await dashboardService.getDashboardMetrics(key[0], key[1]);
            return data;
          };
          
          const cacheBustingCallRecordsFetcher = async (key: [string, string]) => {
            const data = await dashboardService.getCallRecords(key[0], key[1]);
            return data;
          };
          
          await Promise.all([
            mutate(currentKey, () => cacheBustingMetricsFetcher(currentKey as [string, string]), { 
              revalidate: true,
              populateCache: true,
              optimisticData: undefined
            }),
            mutate(currentKey, () => cacheBustingCallRecordsFetcher(currentKey as [string, string]), { 
              revalidate: true,
              populateCache: true,
              optimisticData: undefined
            }),
            // Refresh analytics data for other tabs
            mutateCustomer(undefined, { 
              revalidate: true,
              populateCache: true,
              optimisticData: undefined
            }),
            mutateAgent(undefined, { 
              revalidate: true,
              populateCache: true,
              optimisticData: undefined
            }),
            mutateVoice()
          ]);
        }
        
        setRefreshState(false, new Date());
        console.log('✅ Auto-refresh completed successfully');
        setRefreshError(null);
      } catch (error) {
        console.error('❌ Auto-refresh failed:', error);
        setRefreshState(false);
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        setRefreshError(errorMessage);
        
        if (consecutiveFailures >= 2) {
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
    consecutiveFailures,
    mutateCustomer,
    mutateAgent,
    mutateVoice
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

  // Date range change handler (same pattern as call logs)
  const handleDateRangeChange = (value: any, dateStrings: [string, string]) => {
    // Update the date range
    setDateRange({ startDate: dateStrings[0], endDate: dateStrings[1] });
    
    // Publish date changes for AI Drawer to sync
    publishDateChange(dateStrings[0], dateStrings[1]);
  };

  // Manual refresh function
  const handleManualRefresh = async () => {
    try {
      setRefreshState(true);
      const currentKey = swrKey();
      if (currentKey) {
        const cacheBustingMetricsFetcher = async (key: [string, string]) => {
          const data = await dashboardService.getDashboardMetrics(key[0], key[1]);
          return data;
        };
        
        const cacheBustingCallRecordsFetcher = async (key: [string, string]) => {
          const data = await dashboardService.getCallRecords(key[0], key[1]);
          return data;
        };
        
        await Promise.all([
          mutate(currentKey, () => cacheBustingMetricsFetcher(currentKey as [string, string]), { 
            revalidate: true,
            populateCache: true,
            optimisticData: undefined
          }),
          mutate(currentKey, () => cacheBustingCallRecordsFetcher(currentKey as [string, string]), { 
            revalidate: true,
            populateCache: true,
            optimisticData: undefined
          }),
          mutateCustomer(undefined, { 
            revalidate: true,
            populateCache: true,
            optimisticData: undefined
          }),
          mutateAgent(undefined, { 
            revalidate: true,
            populateCache: true,
            optimisticData: undefined
          }),
          mutateVoice()
        ]);
      }
      setRefreshState(false, new Date());
      toast.success('Analytics dashboard refreshed successfully');
      setRefreshError(null);
    } catch (error) {
      setRefreshState(false);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setRefreshError(errorMessage);
      toast.error('Failed to refresh analytics dashboard', {
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

  // Enhanced tab definitions with descriptions
  const tabs = [
    { 
      id: 'calls', 
      label: 'Calls Analytics', 
      icon: <PhoneIcon size={18} />,
      color: 'blue',
      description: 'Call metrics & performance'
    },
    { 
      id: 'customer', 
      label: 'Customer Analytics', 
      icon: <UserIcon size={18} />,
      color: 'purple',
      description: 'Customer insights & behavior'
    },
    { 
      id: 'agent', 
      label: 'Agent Analytics', 
      icon: <HeadphonesIcon size={18} />,
      color: 'green',
      description: 'Agent performance & efficiency'
    },
    { 
      id: 'products', 
      label: 'Products & Services', 
      icon: <PackageIcon size={18} />,
      color: 'orange',
      description: 'Product & service analytics'
    }
  ];

  // Explanation data for different charts and metrics
  const explanations = {
    totalCalls: {
      title: "Total Calls",
      description: "The total number of calls processed during the selected time period.",
      details: [
        "Includes inbound, outbound, and internal calls",
        "Counts all call attempts regardless of disposition",
        "Updates in real-time as new calls are processed",
        "Useful for understanding overall call volume trends"
      ],
      insights: "Higher call volumes may indicate increased business activity or seasonal trends."
    },
    avgDuration: {
      title: "Average Call Duration", 
      description: "The average length of all calls in the selected time period.",
      details: [
        "Calculated from total talk time divided by number of calls",
        "Includes only successfully connected calls",
        "Measured in minutes and seconds",
        "Excludes hold time and wrap-up time"
      ],
      insights: "Longer durations may indicate complex issues or thorough customer service."
    },
    answerRate: {
      title: "Answer Rate",
      description: "Percentage of incoming calls that were successfully answered.",
      details: [
        "Calculated as (Answered Calls ÷ Total Incoming Calls) × 100",
        "Industry benchmark is typically 80-85%",
        "Excludes outbound calls from calculation",
        "Key indicator of customer service accessibility"
      ],
      insights: "Low answer rates may indicate understaffing or technical issues."
    },
    uniqueCallers: {
      title: "Unique Callers",
      description: "Number of distinct phone numbers that made calls.",
      details: [
        "Counts unique source numbers for inbound calls",
        "Counts unique destination numbers for outbound calls", 
        "Helps identify customer engagement patterns",
        "Useful for understanding customer base size"
      ],
      insights: "High unique caller counts indicate broad customer reach."
    },
    hourlyDistribution: {
      title: "Hourly Call Distribution",
      description: "Shows call volume patterns throughout the day.",
      details: [
        "Displays calls by hour (0-23) in local time",
        "Helps identify peak and off-peak periods",
        "Useful for staff scheduling optimization",
        "Colors represent different call directions"
      ],
      insights: "Peak hours typically align with business hours and customer activity patterns."
    },
    callDirection: {
      title: "Call Direction Analysis", 
      description: "Breakdown of calls by direction (inbound, outbound, internal).",
      details: [
        "Inbound: Calls received from external numbers",
        "Outbound: Calls made to external numbers",
        "Internal: Calls between internal extensions",
        "Percentages show distribution across categories"
      ],
      insights: "Direction patterns reveal business communication style and customer interaction levels."
    },
    durationMetrics: {
      title: "Duration Metrics",
      description: "Detailed analysis of call duration patterns and statistics.",
      details: [
        "Shows distribution of call lengths",
        "Identifies short vs. long call patterns", 
        "Helps optimize agent scheduling",
        "Useful for capacity planning"
      ],
      insights: "Duration patterns can indicate call complexity and agent efficiency."
    }
  };

  // Explanation Modal Component
  const ExplanationModal = ({ id, onClose }: { id: string, onClose: () => void }) => {
    const explanation = explanations[id as keyof typeof explanations];
    if (!explanation) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Info size={20} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
                  {explanation.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Detailed explanation and insights
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X size={20} />
            </button>
          </div>

          {/* Modal Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
            {/* Description */}
            <div className="mb-6">
              <h4 className="text-lg font-medium text-gray-800 dark:text-white mb-2">Description</h4>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                {explanation.description}
              </p>
            </div>

            {/* Details */}
            <div className="mb-6">
              <h4 className="text-lg font-medium text-gray-800 dark:text-white mb-3">Key Details</h4>
              <ul className="space-y-2">
                {explanation.details.map((detail, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-gray-600 dark:text-gray-300">{detail}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Insights */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800/50">
              <h4 className="text-lg font-medium text-blue-800 dark:text-blue-200 mb-2 flex items-center">
                <TrendingUpIcon size={16} className="mr-2" />
                Insights
              </h4>
              <p className="text-blue-700 dark:text-blue-300 text-sm leading-relaxed">
                {explanation.insights}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  };

  return (
    <>
      {/* Explanation Modal */}
      <AnimatePresence>
        {explanationModal && (
          <ExplanationModal 
            id={explanationModal}
            onClose={() => setExplanationModal(null)}
          />
        )}
      </AnimatePresence>

      <div className="space-y-8 relative overflow-hidden">
      {/* Animated background pattern */}
      <div className="absolute inset-0 -z-10">
        {/* Floating orbs */}
        <motion.div
          className="absolute top-10 right-20 w-32 h-32 bg-gradient-to-r from-blue-200 to-purple-200 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full blur-3xl"
          animate={{
            x: [0, 30, 0],
            y: [0, -20, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-20 left-10 w-24 h-24 bg-gradient-to-r from-green-200 to-teal-200 dark:from-green-900/30 dark:to-teal-900/30 rounded-full blur-3xl"
          animate={{
            x: [0, -25, 0],
            y: [0, 15, 0],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
        />
        <motion.div
          className="absolute top-1/2 left-1/3 w-16 h-16 bg-gradient-to-r from-purple-200 to-pink-200 dark:from-purple-900/20 dark:to-pink-900/20 rounded-full blur-2xl"
          animate={{
            x: [0, 20, 0],
            y: [0, -30, 0],
            scale: [1, 1.2, 1]
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 4
          }}
        />
      </div>

      {/* Header with tabs */}
      <div className="flex flex-col space-y-4 relative z-10">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0">
          <motion.h1 
            className="text-2xl font-bold text-gray-800 dark:text-gray-100"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Analytics Dashboard
          </motion.h1>
          <motion.div 
            className="flex flex-col sm:flex-row gap-3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {/* Manual refresh button */}
            <motion.button
              onClick={handleManualRefresh}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Manual refresh"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <SyncOutlined className={`text-lg ${isLoading ? 'animate-spin' : ''}`} />
            </motion.button>
            
            {/* Date Range Picker (same as call logs) */}
            <div className="flex items-center">
              <DateRangePicker 
                onChange={handleDateRangeChange}
                startDate={dateRange.startDate}
                endDate={dateRange.endDate}
              />
            </div>
          </motion.div>
        </div>

        {/* Simple Tab Navigation */}
        <div className="relative">
          {/* Tab container */}
          <div className="flex flex-col sm:flex-row gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            {tabs.map((tab, index) => (
              <motion.div
                key={tab.id}
                className="flex-1"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
              >
                <motion.button
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`group relative w-full px-4 py-3 rounded-md transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >

                  
                  {/* Content */}
                  <div className="flex items-center space-x-3">
                    {/* Icon */}
                    <div className={`transition-colors duration-200 ${
                      activeTab === tab.id
                        ? 'text-gray-900 dark:text-white'
                        : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'
                    }`}>
                      {React.cloneElement(tab.icon, { size: 18 })}
                    </div>
                    
                    {/* Label and Description */}
                    <div className="flex flex-col">
                      <h3 className={`text-sm font-medium transition-colors duration-200 ${
                        activeTab === tab.id
                          ? 'text-gray-900 dark:text-white'
                          : 'text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white'
                      }`}>
                        {tab.label}
                      </h3>
                      <p className={`text-xs transition-colors duration-200 ${
                        activeTab === tab.id
                          ? 'text-gray-500 dark:text-gray-400'
                          : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-400'
                      }`}>
                        {tab.description}
                      </p>
                    </div>
                  </div>
                </motion.button>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Animated Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'calls' && (
          <motion.div
            key="calls"
            initial={{ opacity: 0, x: -20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          >
            <CallsAnalyticsTab 
              dashboardData={dashboardData}
              callRecordsData={callRecordsData}
              formattedCallRecords={formattedCallRecords}
              isLoading={isLoading}
              getSafeMetric={getSafeMetric}
              generateSampleHourlyData={generateSampleHourlyData}
              onExplainClick={setExplanationModal}
            />
          </motion.div>
        )}

        {activeTab === 'customer' && (
          <motion.div
            key="customer"
            initial={{ opacity: 0, x: -20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          >
            <CustomerAnalyticsTab 
              customerAnalyticsData={customerAnalyticsData}
              customerVoiceData={customerVoiceData}
              isLoading={isCustomerLoading || isVoiceLoading}
            />
          </motion.div>
        )}

        {activeTab === 'agent' && (
          <motion.div
            key="agent"
            initial={{ opacity: 0, x: -20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          >
            <AgentAnalyticsTab 
              agentAnalyticsData={agentAnalyticsData}
              isLoading={isAgentLoading}
            />
          </motion.div>
        )}

        {activeTab === 'products' && (
          <motion.div
            key="products"
            initial={{ opacity: 0, x: -20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          >
            <ProductsAnalyticsTab 
              isLoading={isLoading}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auto-refresh status */}
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
    </>
  );
}

// Calls Analytics Tab Component
function CallsAnalyticsTab({ 
  dashboardData, 
  callRecordsData, 
  formattedCallRecords, 
  isLoading, 
  getSafeMetric, 
  generateSampleHourlyData,
  onExplainClick
}: any) {
  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard 
          title="Total Calls"
          value={getSafeMetric('total_calls')}
          icon={<PhoneIcon size={18} />}
          isLoading={isLoading}
          onExplainClick={() => onExplainClick('totalCalls')}
          explanationId="totalCalls"
        />
        
        <SummaryCard 
          title="Average Call Duration"
          value={formatDuration(getSafeMetric('avg_duration'))}
          icon={<ClockIcon size={18} />}
          isLoading={isLoading}
          onExplainClick={() => onExplainClick('avgDuration')}
          explanationId="avgDuration"
        />
        
        <SummaryCard 
          title="Answer Rate"
          value={`${getSafeMetric('answer_rate', 0).toFixed(1)}%`}
          icon={<BarChartIcon size={18} />}
          isLoading={isLoading}
          onExplainClick={() => onExplainClick('answerRate')}
          explanationId="answerRate"
        />
        
        <SummaryCard 
          title="Unique Callers"
          value={getSafeMetric('total_inbound') + getSafeMetric('total_outbound')}
          icon={<UserIcon size={18} />}
          isLoading={isLoading}
          onExplainClick={() => onExplainClick('uniqueCallers')}
          explanationId="uniqueCallers"
        />
      </div>
      
      {/* Hourly Distribution Chart */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 group">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-800 dark:text-gray-100">Hourly Call Distribution</h2>
          <motion.button
            onClick={() => onExplainClick('hourlyDistribution')}
            className="p-2 rounded-full bg-gray-50 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-all duration-300"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <motion.div
              whileHover={{ 
                rotate: [0, 15, -15, 0],
                scale: [1, 1.2, 1]
              }}
              transition={{ duration: 0.6 }}
            >
              <ChevronsLeftRight size={16} />
            </motion.div>
          </motion.button>
        </div>
        <div className="h-[400px]">
          <HourlyDistributionLineChart 
            data={(dashboardData?.hourly_distribution && dashboardData.hourly_distribution.length > 0) 
              ? dashboardData.hourly_distribution 
              : generateSampleHourlyData()} 
            isLoading={isLoading}
          />
        </div>
      </div>
      
      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 group">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-800 dark:text-gray-100">Call Direction</h2>
            <motion.button
              onClick={() => onExplainClick('callDirection')}
              className="p-2 rounded-full bg-gray-50 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-all duration-300"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <motion.div
                whileHover={{ 
                  rotate: [0, 15, -15, 0],
                  scale: [1, 1.2, 1]
                }}
                transition={{ duration: 0.6 }}
              >
                <ChevronsLeftRight size={16} />
              </motion.div>
            </motion.button>
          </div>
          <div className="h-[320px]">
            <CallDirectionChart 
              data={dashboardData ? extractDirectionDistribution(dashboardData) : []} 
              isLoading={isLoading}
            />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 group">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-800 dark:text-gray-100">Duration Metrics</h2>
            <motion.button
              onClick={() => onExplainClick('durationMetrics')}
              className="p-2 rounded-full bg-gray-50 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-all duration-300"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <motion.div
                whileHover={{ 
                  rotate: [0, 15, -15, 0],
                  scale: [1, 1.2, 1]
                }}
                transition={{ duration: 0.6 }}
              >
                <ChevronsLeftRight size={16} />
              </motion.div>
            </motion.button>
          </div>
          <div className="h-[320px]">
            <CallDurationMetricsChart 
              {...(dashboardData ? extractDurationMetrics(dashboardData) : {})}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
      
      {/* Metrics Cards */}
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
      
      {/* Call Logs Table */}
      <div className="bg-white dark:bg-gray-800 p-0 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <CallDetailsTable 
          records={formattedCallRecords}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}

// Customer Analytics Tab Component
function CustomerAnalyticsTab({ customerAnalyticsData, customerVoiceData, isLoading }: any) {
  const [analysisTab, setAnalysisTab] = useState<string>('comparison');
  
  return (
    <div className="space-y-8">
      {/* Customer Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-xl shadow-sm border border-blue-100 dark:border-blue-800/50">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-sm font-medium text-blue-700 dark:text-blue-400">Total Callers</h3>
            <UserIcon size={18} className="text-blue-500" />
          </div>
          <div className="text-3xl font-bold text-gray-800 dark:text-white mb-1">
            {isLoading ? 
              <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div> : 
              customerAnalyticsData?.summary?.total_callers || 0
            }
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Unique customers</div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-6 rounded-xl shadow-sm border border-purple-100 dark:border-purple-800/50">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-sm font-medium text-purple-700 dark:text-purple-400">Avg Calls/Customer</h3>
            <BarChartIcon size={18} className="text-purple-500" />
          </div>
          <div className="text-3xl font-bold text-gray-800 dark:text-white mb-1">
            {isLoading ? 
              <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div> : 
              Math.round(customerAnalyticsData?.summary?.avg_calls_per_caller || 0)
            }
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Calls per customer</div>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 p-6 rounded-xl shadow-sm border border-green-100 dark:border-green-800/50">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-sm font-medium text-green-700 dark:text-green-400">Total Duration</h3>
            <ClockIcon size={18} className="text-green-500" />
          </div>
          <div className="text-3xl font-bold text-gray-800 dark:text-white mb-1">
            {isLoading ? 
              <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div> : 
              `${Math.round((customerAnalyticsData?.summary?.total_duration || 0) / 60)} min`
            }
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Total talk time</div>
        </div>
        
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-6 rounded-xl shadow-sm border border-amber-100 dark:border-amber-800/50">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-sm font-medium text-amber-700 dark:text-amber-400">Sentiment Score</h3>
            <TrendingUpIcon size={18} className="text-amber-500" />
          </div>
          <div className="text-3xl font-bold text-gray-800 dark:text-white mb-1">
            {isLoading ? 
              <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div> : 
              `${Math.round((customerVoiceData?.averageSentimentScore || 0) * 100)}%`
            }
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Average sentiment</div>
        </div>
      </div>

      {/* Customer Analysis Charts */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setAnalysisTab('comparison')}
            className={`px-4 py-3 text-sm font-medium transition-all ${
              analysisTab === 'comparison'
                ? 'bg-purple-50 dark:bg-purple-900/20 border-b-2 border-purple-500 dark:border-purple-400 text-purple-600 dark:text-purple-400'
                : 'text-gray-600 dark:text-gray-300 hover:text-purple-500 dark:hover:text-purple-400 hover:bg-purple-50/50 dark:hover:bg-purple-900/10'
            }`}
          >
            Top Customer Comparison
          </button>
          <button
            onClick={() => setAnalysisTab('radar')}
            className={`px-4 py-3 text-sm font-medium transition-all ${
              analysisTab === 'radar'
                ? 'bg-purple-50 dark:bg-purple-900/20 border-b-2 border-purple-500 dark:border-purple-400 text-purple-600 dark:text-purple-400'
                : 'text-gray-600 dark:text-gray-300 hover:text-purple-500 dark:hover:text-purple-400 hover:bg-purple-50/50 dark:hover:bg-purple-900/10'
            }`}
          >
            Performance Radar
          </button>
          <button
            onClick={() => setAnalysisTab('metrics')}
            className={`px-4 py-3 text-sm font-medium transition-all ${
              analysisTab === 'metrics'
                ? 'bg-purple-50 dark:bg-purple-900/20 border-b-2 border-purple-500 dark:border-purple-400 text-purple-600 dark:text-purple-400'
                : 'text-gray-600 dark:text-gray-300 hover:text-purple-500 dark:hover:text-purple-400 hover:bg-purple-50/50 dark:hover:bg-purple-900/10'
            }`}
          >
            Customer Metrics
          </button>
        </div>
        
        <div className="p-6">
          {analysisTab === 'comparison' && (
            <div className="h-[400px]">
              <TopCallerComparisonChart 
                callers={customerAnalyticsData?.top_callers} 
                isLoading={isLoading} 
                sortMetric="call_count"
              />
            </div>
          )}
          
          {analysisTab === 'radar' && (
            <div className="h-[400px]">
              <CallPerformanceRadar 
                callers={customerAnalyticsData?.top_callers} 
                isLoading={isLoading} 
                maxCallers={5}
              />
            </div>
          )}
          
          {analysisTab === 'metrics' && (
            <div>
              <CallerMetricsCards 
                callers={customerAnalyticsData?.top_callers} 
                isLoading={isLoading} 
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Agent Analytics Tab Component
function AgentAnalyticsTab({ agentAnalyticsData, isLoading }: any) {
  const [analysisTab, setAnalysisTab] = useState<string>('performance');
  
  return (
    <div className="space-y-8">
      {/* Agent Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 p-6 rounded-xl shadow-sm border border-green-100 dark:border-green-800/50">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-sm font-medium text-green-700 dark:text-green-400">Total Agents</h3>
            <HeadphonesIcon size={18} className="text-green-500" />
          </div>
          <div className="text-3xl font-bold text-gray-800 dark:text-white mb-1">
            {isLoading ? 
              <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div> : 
              agentAnalyticsData?.summary?.total_agents || 0
            }
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Active agents</div>
        </div>
        
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-xl shadow-sm border border-blue-100 dark:border-blue-800/50">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-sm font-medium text-blue-700 dark:text-blue-400">Avg Calls/Agent</h3>
            <BarChartIcon size={18} className="text-blue-500" />
          </div>
          <div className="text-3xl font-bold text-gray-800 dark:text-white mb-1">
            {isLoading ? 
              <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div> : 
              Math.round((agentAnalyticsData?.summary?.total_calls || 0) / (agentAnalyticsData?.summary?.total_agents || 1))
            }
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Calls per agent</div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-6 rounded-xl shadow-sm border border-purple-100 dark:border-purple-800/50">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-sm font-medium text-purple-700 dark:text-purple-400">Avg Handle Time</h3>
            <ClockIcon size={18} className="text-purple-500" />
          </div>
          <div className="text-3xl font-bold text-gray-800 dark:text-white mb-1">
            {isLoading ? 
              <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div> : 
              `${Math.round(((agentAnalyticsData?.summary?.avg_handling_time || agentAnalyticsData?.summary?.avg_handle_time || 
                (agentAnalyticsData?.summary?.team_averages?.call_duration || 0)) / 60) || 1)} min`
            }
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Minutes per call</div>
        </div>
        
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-6 rounded-xl shadow-sm border border-amber-100 dark:border-amber-800/50">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-sm font-medium text-amber-700 dark:text-amber-400">Answer Rate</h3>
            <TrendingUpIcon size={18} className="text-amber-500" />
          </div>
          <div className="text-3xl font-bold text-gray-800 dark:text-white mb-1">
            {isLoading ? 
              <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div> : 
              `${Math.round(agentAnalyticsData?.summary?.avg_answer_rate || 0)}%`
            }
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Team average</div>
        </div>
      </div>

      {/* Agent Analysis Charts */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
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
            Team Efficiency
          </button>
        </div>
        
        <div className="p-6">
          {analysisTab === 'performance' && (
            <div className="h-[400px]">
              <AgentPerformanceChart 
                agents={agentAnalyticsData?.agents || []} 
                isLoading={isLoading}
                teamAverages={agentAnalyticsData?.summary?.team_averages}
              />
            </div>
          )}
          
          {analysisTab === 'efficiency' && (
            <div className="h-[400px]">
              <AgentDispositionChart
                dispositionData={agentAnalyticsData?.disposition_data || []}
                isLoading={isLoading}
              />
            </div>
          )}
          
          {analysisTab === 'satisfaction' && (
            <div className="h-[530px]">
              <AgentEfficiencyGauges
                efficiencyData={agentAnalyticsData?.gauge_metrics?.efficiency_score || []}
                isLoading={isLoading}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Products & Services Analytics Tab Component
function ProductsAnalyticsTab({ isLoading }: any) {
  return (
    <div className="space-y-8">
      {/* Welcome Message */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center py-16"
      >
        <div className="relative">
          {/* Background decoration */}
          <div className="absolute inset-0 -z-10">
            <motion.div
              className="w-32 h-32 bg-gradient-to-r from-orange-200 to-red-200 dark:from-orange-900/30 dark:to-red-900/30 rounded-full blur-3xl mx-auto"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </div>
          
          {/* Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-orange-500 to-red-500 rounded-full shadow-lg mb-6"
          >
            <PackageIcon size={36} className="text-white" />
          </motion.div>
          
          {/* Title */}
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-3xl font-bold text-gray-800 dark:text-white mb-4"
          >
            Products & Services Analytics
          </motion.h2>
          
          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto"
          >
            This section is ready for your custom analytics components. Add charts, metrics, and insights specific to your products and services.
          </motion.p>
          
          {/* Placeholder Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 max-w-4xl mx-auto"
          >
            {/* Product Performance Card */}
            <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 p-6 rounded-xl shadow-sm border border-orange-100 dark:border-orange-800/50">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-sm font-medium text-orange-700 dark:text-orange-400">Product Performance</h3>
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <TrendingUpIcon size={18} className="text-orange-500" />
                </motion.div>
              </div>
              <div className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                Coming Soon
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Track product usage and performance metrics
              </div>
            </div>
            
            {/* Service Quality Card */}
            <div className="bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 p-6 rounded-xl shadow-sm border border-red-100 dark:border-red-800/50">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-sm font-medium text-red-700 dark:text-red-400">Service Quality</h3>
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <BarChartIcon size={18} className="text-red-500" />
                </motion.div>
              </div>
              <div className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                Ready
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Monitor service quality and satisfaction
              </div>
            </div>
            
            {/* Revenue Insights Card */}
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 p-6 rounded-xl shadow-sm border border-yellow-100 dark:border-yellow-800/50">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-sm font-medium text-yellow-700 dark:text-yellow-400">Revenue Insights</h3>
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                >
                  <UserIcon size={18} className="text-yellow-500" />
                </motion.div>
              </div>
              <div className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                Awaiting
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Analyze revenue patterns and trends
              </div>
            </div>
          </motion.div>
          
          {/* Instructions */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.5 }}
            className="mt-12 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 max-w-3xl mx-auto"
          >
            <h4 className="text-lg font-medium text-gray-800 dark:text-white mb-3 flex items-center">
              <Info size={20} className="mr-2 text-orange-500" />
              Ready for Customization
            </h4>
            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
              This tab is prepared for your specific products and services analytics. You can add components for tracking product performance, service quality metrics, revenue analysis, customer satisfaction scores, and any other business-specific KPIs that matter to your organization.
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
} 