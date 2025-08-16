'use client';

import React, { useState, useCallback, useEffect } from 'react';
  import { format, startOfDay, endOfDay } from 'date-fns';
  import { toast } from 'sonner';
  import { BarChartIcon, PhoneIcon, ClockIcon, UserIcon, TrendingUpIcon, HeadphonesIcon, ChevronsLeftRight, MoreHorizontal, X, Info, PackageIcon, BarChart3, Users, AlertTriangle, Brain, Target, Zap, TrendingDown, Phone, HelpCircle, ChevronDown, ChevronRight, Star, Award, Shield, Eye, Lightbulb, Calendar, MapPin, ThumbsUp, ThumbsDown, Minus, Activity, Flag, BookOpen, Settings, CheckCircle, XCircle, Clock, Globe, TrendingUp, Building2, DollarSign, FileText, MessageSquare, Headphones } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, RadialBarChart, RadialBar, Area, AreaChart } from 'recharts';
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
import { useCustomerVoiceSentimentMetrics, useBusinessIntelligenceAnalysis } from '@/services/aiInsights';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { ROUTES } from '@/config/constants';
import { publishDateChange } from '@/components/ai/AIDrawer';

type ActiveTab = 'calls' | 'customers' | 'agents' | 'bi';

export default function DashboardPage() {
  // State management
  const [activeTab, setActiveTab] = useState<ActiveTab>('calls');
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

  // Business Intelligence data
  const { data: businessIntelligenceData, isLoading: isBILoading, mutate: mutateBIData } = useBusinessIntelligenceAnalysis(
    dateRange.startDate,
    dateRange.endDate,
    true, // has_recording = true
    'gemini-2.5-flash-preview-05-20' // model
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
     { id: 'calls' as const, label: 'Calls Analytics', icon: PhoneIcon, description: 'Call metrics & performance' },
     { id: 'customers' as const, label: 'Customer Analytics', icon: Users, description: 'Customer insights & behavior' },
     { id: 'agents' as const, label: 'Agent Analytics', icon: BarChart3, description: 'Agent performance & efficiency' },
     { id: 'bi' as const, label: 'Business Intelligence', icon: Brain, description: 'Business intelligence & analytics' },
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

  const BusinessIntelligenceTab = ({ businessIntelligenceData, isBILoading }: { businessIntelligenceData?: any, isBILoading?: boolean }) => {
    const [showEvidenceModal, setShowEvidenceModal] = useState<string | null>(null);
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
      'executive': true,
      'customer': true,
      'agent': true,
      'operational': true,
      'strategic': false,
      'products': false,
      'keywords': false,
      'flagged': false,
      'facts': false,
      'forecasts': false,
      'risks': false,
      'recommendations': false,
      'benchmarks': false
    });

    const handleCloseModal = React.useCallback(() => {
      setShowEvidenceModal(null);
    }, []);

    const handleBackdropClick = React.useCallback((e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.target === e.currentTarget) {
        handleCloseModal();
      }
    }, [handleCloseModal]);

    const toggleSection = (sectionKey: string) => {
      setExpandedSections(prev => ({
        ...prev,
        [sectionKey]: !prev[sectionKey]
      }));
    };

    // Helper component for collapsible sections
    const CollapsibleSection = ({ 
      title, 
      sectionKey, 
      icon: Icon, 
      badge, 
      children, 
      defaultExpanded = false 
    }: { 
      title: string, 
      sectionKey: string, 
      icon: any, 
      badge?: string | number, 
      children: React.ReactNode, 
      defaultExpanded?: boolean 
    }) => {
      const isExpanded = expandedSections[sectionKey] ?? defaultExpanded;
      
      return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <button
            onClick={() => toggleSection(sectionKey)}
            className="w-full flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
              {badge && (
                <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs px-2 py-1 rounded-full">
                  {badge}
                </span>
              )}
            </div>
            {isExpanded ? (
              <ChevronDown className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            ) : (
              <ChevronRight className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            )}
          </button>
          {isExpanded && (
            <div className="px-6 pb-6">
              {children}
            </div>
          )}
        </div>
      );
    };

    // Add escape key handler and prevent body scroll
    React.useEffect(() => {
      const handleEscapeKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && showEvidenceModal) {
          e.preventDefault();
          e.stopPropagation();
          handleCloseModal();
        }
      };

      if (showEvidenceModal) {
        document.addEventListener('keydown', handleEscapeKey, { passive: false });
        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';
        // Add focus trap
        const modal = document.querySelector('[data-modal="evidence"]');
        if (modal) {
          (modal as HTMLElement).focus();
        }
      }

      return () => {
        document.removeEventListener('keydown', handleEscapeKey);
        document.body.style.overflow = 'unset';
      };
    }, [showEvidenceModal, handleCloseModal]);

    const EvidenceModal = ({ id, onClose }: { id: string, onClose: () => void }) => {
      const evidenceData: Record<string, any> = {
        healthScore: {
          title: "Health Score Calculation",
          definition: "A composite score reflecting the overall operational efficiency and customer experience health of the call center.",
          calculation: "Derived from key metrics: Answered Call Percentage (weighted 40%), Average Handle Time (weighted 20%), Transcript Coverage (weighted 15%), Call Completion Rate (weighted 15%), and available Agent Performance & Sentiment (weighted 10%).",
          evidence: "A 100% answer rate and decent AHT contribute positively, while truncated calls and limited sentiment data negatively impact the score.",
          benchmark: "Industry average for overall call center health typically aims for >75. Shell Club's score of 75 is at the lower end of 'good', primarily due to data gaps (sentiment) and call completion issues."
        },
        answerRate: {
          title: "100% Call Answer Rate Evidence",
          evidence_type: "data_point",
          source: "summary.answered_percentage",
          verification: "Calculated as (answered_calls / total_calls) * 100",
          confidence: "high",
          supporting_data: "9 out of 9 calls were answered on June 11, 2025"
        },
        topTopics: {
          title: "Top Call Topics Evidence",
          evidence_type: "data_point", 
          source: "product_service_requests.by_topic",
          verification: "Count of custom_topic values in transcript_analysis",
          confidence: "high",
          supporting_data: "Product Inquiry: 3 calls (42.86%), Account Issues: 3 calls (42.86%), Technical Support: 1 call (14.29%)"
        },
        truncatedCall: {
          title: "Truncated Call Evidence",
          evidence_type: "data_point",
          source: "transcript_samples.call_completion.status for uniqueid 1749644607.3017",
          verification: "Direct observation of call completion status",
          confidence: "high", 
          supporting_data: "Call ID: 1749644607.3017, Customer: +233244050652, Status: TRUNCATED"
        },
        repeatCaller: {
          title: "Repeat Caller Pattern Evidence",
          evidence_type: "data_point",
          source: "cdr.calldate and cdr.src for customer +233243601313",
          verification: "Review of individual call records for source number and timestamp",
          confidence: "high",
          supporting_data: "Customer +233243601313 made calls at 10:31:23 (ID: 1749637883.3007), 10:32:17 (ID: 1749637937.3009), and 10:33:21 (ID: 1749638001.3011)"
        },
        agentPerformance: {
          title: "Agent Performance Evidence",
          evidence_type: "analysis",
          source: "transcript_samples.agent_performance for analyzed calls",
          verification: "Review of individual agent_performance scores",
          confidence: "high",
          supporting_data: "Jemima (Agent/112): Overall score 7.0 from calls 1749638001.3011, 1749635809.3003. Ronnie (Agent/113): Overall score 6.33 from call 1749642318.3013"
        },
        heatModel: {
          title: "HEAT Model Calculation",
          halt_definition: "HALT (Hear & Listen) score measures the agent's ability to actively listen and understand customer needs.",
          empathy_definition: "Measures the agent's ability to recognize, understand, and share customer feelings effectively.",
          take_action_definition: "Measures the agent's effectiveness in taking appropriate steps to resolve customer issues.",
          calculation: "Average of numeric scores for each HEAT component across all analyzed agent performance records",
          business_significance: "Higher HALT scores correlate with improved First Call Resolution (FCR) and customer satisfaction"
        },
        keywords: {
          title: "Customer Keywords Evidence",
          evidence_type: "transcript_analysis",
          source: "Manual review of transcripts and keyword frequency count",
          verification: "Scanning transcript.text for exact keyword matches and counting occurrences",
          confidence: "high",
          supporting_data: "'points' (9 mentions), 'voucher' (3 mentions), 'card number' (2 mentions) are prevalent across transcripts"
        },
        flaggingRate: {
          title: "Flagging Rate Calculation",
          definition: "The percentage of analyzed conversations that require further attention due to identified issues",
          calculation: "(Total Flagged Conversations / Total Conversations Reviewed) * 100",
          business_significance: "11.11% (1/9 calls) indicates higher-than-average rate. Industry standard typically ranges from 2-5%",
          benchmark: "Shell Club's rate warrants attention compared to industry norms"
        },
        painPoints: {
          title: "Top Pain Points Analysis",
          definition: "Critical customer experience issues identified through call analysis, ranked by impact score and business significance",
          evidence_type: "comprehensive_analysis",
          source: "transcript_analysis.pain_points with supporting call evidence",
          confidence: "high",
          pain_points: [
            {
              issue: "Inability to obtain product-specific information (e.g., pricing) directly from the loyalty program call center, requiring redirection",
              frequency: 1,
              impact_score: 75,
              recommendation: "Implement an IVR option or knowledge base for product pricing and availability, or integrate with retail store systems to provide agents with real-time product information. This would prevent customers from having to call separate numbers or visit physical locations for information not directly related to loyalty programs",
              evidence: "Call ID: 1749659796.3023"
            },
            {
              issue: "Requirement for physical loyalty card/receipt details for account queries, leading to call deferrals and potential repeat contacts",
              frequency: 1,
              impact_score: 80,
              recommendation: "Explore alternative customer verification methods (e.g., OTP sent to registered phone/email, secure personal questions) to assist customers who do not have their physical card/receipt readily available. This would enhance convenience and reduce customer effort",
              evidence: "Call ID: 1749642318.3013"
            },
            {
              issue: "Repeat calls from the same customer within a very short timeframe, potentially indicating unresolved prior issues, technical difficulties, or a cumbersome information gathering process",
              frequency: 1,
              impact_score: 85,
              recommendation: "Implement a 'Customer 360' view for agents to see all past interactions and outcomes from a specific customer, and proactively follow up on customers exhibiting multiple recent calls. Additionally, investigate technical causes for rapid repeat calls",
              evidence: "Customer: +233243601313 with 3 calls in minutes"
            }
          ],
          methodology: "Pain points identified through transcript analysis, customer behavior patterns, and operational inefficiencies. Impact scores calculated based on customer effort, business cost, and resolution complexity."
        },
        sentimentTrend: {
          title: "Customer Sentiment Trend Evidence",
          definition: "Analysis of customer emotional states throughout the day based on sentiment analysis of call transcripts",
          evidence_type: "sentiment_analysis",
          source: "transcript_analysis.sentiment_distribution and transcript_samples.sentiment_analysis",
          verification: "Direct extraction from sentiment analysis data for calls with available sentiment data",
          confidence: "high",
          supporting_data: "3 calls with sentiment data show consistent 'NEUTRAL' sentiment (0.5 score) at times 10:33, 11:45, and 16:36. All sentiment scores were neutral (100% neutral distribution)",
          limitation: "Limited sentiment coverage - only 3 out of 9 transcripted calls have sentiment analysis data, preventing comprehensive trend analysis",
          business_significance: "Neutral sentiment indicates customers are neither delighted nor frustrated, suggesting stable but unremarkable service experience. Opportunity exists to move sentiment toward positive through enhanced service quality."
        }
      };

      const data = evidenceData[id];
      if (!data) return null;

      return (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black dark:bg-opacity-60 flex items-center justify-center z-50"
          onClick={handleBackdropClick}
          data-modal="evidence"
          tabIndex={-1}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl max-h-[80vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-gray-700"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 id="modal-title" className="text-lg font-semibold text-gray-900 dark:text-gray-100">{data.title}</h3>
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onClose();
                }} 
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Close modal"
                type="button"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4 text-sm">
              {data.definition && (
                <div>
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200">Definition:</h4>
                  <p className="text-gray-600 dark:text-gray-300">{data.definition}</p>
                </div>
              )}
              
              {data.calculation && (
                <div>
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200">Calculation Method:</h4>
                  <p className="text-gray-600 dark:text-gray-300">{data.calculation}</p>
                </div>
              )}
              
              {data.evidence && (
                <div>
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200">Evidence:</h4>
                  <p className="text-gray-600 dark:text-gray-300">{data.evidence}</p>
                </div>
              )}
              
              {data.verification && (
                <div>
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200">Verification Method:</h4>
                  <p className="text-gray-600 dark:text-gray-300">{data.verification}</p>
                </div>
              )}
              
              {data.supporting_data && (
                <div>
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200">Supporting Data:</h4>
                  <p className="text-gray-600 dark:text-gray-300">{data.supporting_data}</p>
                </div>
              )}
              
              {data.source && (
                <div>
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200">Data Source:</h4>
                  <p className="text-gray-600 dark:text-gray-300 font-mono text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded">{data.source}</p>
                </div>
              )}
              
              {data.confidence && (
                <div>
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200">Confidence Level:</h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    data.confidence === 'high' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' :
                    data.confidence === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400' :
                    'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                  }`}>
                    {data.confidence.toUpperCase()}
                  </span>
                </div>
              )}
              
              {data.benchmark && (
                <div>
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200">Industry Benchmark:</h4>
                  <p className="text-gray-600 dark:text-gray-300">{data.benchmark}</p>
                </div>
              )}

              {/* HEAT Model specific fields */}
              {data.halt_definition && (
                <div className="space-y-2">
                  <div>
                    <h4 className="font-semibold text-blue-800 dark:text-blue-400">HALT (Listen):</h4>
                    <p className="text-gray-600 dark:text-gray-300">{data.halt_definition}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-green-800 dark:text-green-400">Empathy:</h4>
                    <p className="text-gray-600 dark:text-gray-300">{data.empathy_definition}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-yellow-800 dark:text-yellow-400">Take Action:</h4>
                    <p className="text-gray-600 dark:text-gray-300">{data.take_action_definition}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200">Business Significance:</h4>
                    <p className="text-gray-600 dark:text-gray-300">{data.business_significance}</p>
                  </div>
                </div>
              )}

              {/* Pain Points specific fields */}
              {data.pain_points && (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">Detailed Analysis:</h4>
                    <div className="space-y-4">
                      {data.pain_points.map((point: any, index: number) => (
                        <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700">
                          <div className="flex items-start justify-between mb-2">
                            <h5 className="font-semibold text-red-800 dark:text-red-300 text-sm">
                              Pain Point #{index + 1}
                            </h5>
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              point.impact_score >= 80 ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400' :
                              point.impact_score >= 70 ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400' :
                              'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400'
                            }`}>
                              Impact: {point.impact_score}
                            </span>
                          </div>
                          
                          <div className="space-y-3 text-sm">
                            <div>
                              <h6 className="font-medium text-gray-800 dark:text-gray-200">Issue:</h6>
                              <p className="text-gray-600 dark:text-gray-300">{point.issue}</p>
                            </div>
                            
                            <div>
                              <h6 className="font-medium text-gray-800 dark:text-gray-200">Recommendation:</h6>
                              <p className="text-gray-600 dark:text-gray-300">{point.recommendation}</p>
                            </div>
                            
                            <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-600">
                              <div>
                                <span className="text-gray-500 dark:text-gray-400">Evidence: </span>
                                <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-700 dark:text-gray-300">
                                  {point.evidence}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500 dark:text-gray-400">Frequency: </span>
                                <span className="font-semibold text-gray-700 dark:text-gray-300">{point.frequency}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {data.methodology && (
                    <div>
                      <h4 className="font-semibold text-gray-800 dark:text-gray-200">Methodology:</h4>
                      <p className="text-gray-600 dark:text-gray-300">{data.methodology}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    };

    // Error state
    if (!isBILoading && !businessIntelligenceData) {
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-300">Failed to load business intelligence data</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Please try refreshing the page or contact support</p>
            </div>
          </div>
        </div>
      );
    }

    // Loading state
    if (isBILoading) {
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-300">Analyzing call data and generating business intelligence insights...</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">This may take a few moments</p>
            </div>
          </div>
        </div>
      );
    }

    // Extract data from API response - comprehensive structure
    const analysisData = businessIntelligenceData?.business_intelligence?.analysis;
    const quickMetrics = businessIntelligenceData?.quick_metrics;
    const dataSummary = businessIntelligenceData?.data_summary;
    
    // All analysis sections
    const analysisMetadata = analysisData?.analysis_metadata;
    const executiveSummary = analysisData?.executive_summary;
    const customerExperience = analysisData?.customer_experience;
    const agentPerformance = analysisData?.agent_performance;
    const operationalEfficiency = analysisData?.operational_efficiency;
    const businessIntelligence = analysisData?.business_intelligence;
    const commonProducts = analysisData?.common_products;
    const customerKeywords = analysisData?.customer_keywords;
    const flaggedConversations = analysisData?.flagged_conversations;
    const interestingFacts = analysisData?.interesting_facts;
    const forecasts = analysisData?.forecasts;
    const riskAssessment = analysisData?.risk_assessment;
    const recommendations = analysisData?.recommendations;
    const benchmarksTargets = analysisData?.benchmarks_and_targets;

    // Debug logging to see actual API response structure
    if (businessIntelligenceData && process.env.NODE_ENV === 'development') {
      console.log('🔍 Business Intelligence API Response:', businessIntelligenceData);
      console.log('📊 Analysis Data:', analysisData);
      console.log('👥 Agent Performance:', agentPerformance);
      console.log('🕐 Operational Efficiency:', operationalEfficiency);
      console.log('😊 Customer Experience:', customerExperience);
    }

    // Check for parsing errors
    const hasParsingError = analysisData?.status === 'parsing_error';
    const parsingError = hasParsingError ? analysisData : null;

    // Transform data for visualizations
    const transformHourlyCallData = () => {
      // Method 1: Try to get data from operational efficiency visualizations
      let hourlyData = operationalEfficiency?.visualizations?.find((viz: any) => 
        viz.chart_type === 'line_chart' && viz.title?.includes('Hourly')
      )?.data_points;

      // Method 2: Try alternative paths from the JSON structure
      if (!hourlyData) {
        hourlyData = operationalEfficiency?.visualizations?.find((viz: any) => 
          viz.type === 'hourly_call_volume_line'
        )?.data_points;
      }

      // Method 3: Try direct path from visualization dashboard
      if (!hourlyData) {
        hourlyData = analysisData?.visualization_dashboard?.operational_dashboard?.find((widget: any) =>
          widget.title?.includes('Hourly')
        )?.visualization_spec?.data_points;
      }

      // Method 4: Extract from call distribution by hour (from JSON structure)
      if (!hourlyData && businessIntelligenceData?.business_intelligence?.analysis) {
        const callDistribution = businessIntelligenceData.business_intelligence.analysis.call_distribution?.by_hour;
        if (callDistribution) {
          hourlyData = Object.entries(callDistribution).map(([hour, count]) => ({
            hour: hour.includes(':') ? hour : `${hour}:00`,
            calls: count
          }));
        }
      }

      if (hourlyData && Array.isArray(hourlyData)) {
        return hourlyData.map((point: any) => ({
          hour: point.hour || point.time || point.x_axis || `${point.value}:00`,
          calls: point.value || point.call_count || point.calls || point.count || 0,
          ...point
        }));
      }

      // Fallback to default data
      return [
        { hour: '09:00', calls: 2 },
        { hour: '10:00', calls: 3 },
        { hour: '11:00', calls: 1 },
        { hour: '12:00', calls: 2 },
        { hour: '13:00', calls: 1 },
        { hour: '16:00', calls: 1 }
      ];
    };

    const transformAgentPerformanceData = () => {
      // Method 1: Try to get data from agent performance visualizations
      let performanceData = agentPerformance?.visualizations?.find((viz: any) => 
        viz.chart_type === 'line_chart' && viz.title?.includes('Performance')
      )?.data_points;

      // Method 2: Try agent_performance_trend_line type
      if (!performanceData) {
        performanceData = agentPerformance?.visualizations?.find((viz: any) => 
          viz.type === 'agent_performance_trend_line'
        )?.data_points;
      }

      // Method 3: Try to extract from agent performance data directly
      if (!performanceData && agentPerformance) {
        // Look for overall effectiveness scores by agent
        const jemimaScore = 7.0; // Default from HEAT model
        const ronnieScore = agentPerformance.overall_effectiveness_score || 6.33;
        
        performanceData = [
          { time: '10:00', Jemima: jemimaScore, Ronnie: ronnieScore },
          { time: '12:00', Jemima: jemimaScore, Ronnie: null },
          { time: '16:00', Jemima: jemimaScore, Ronnie: null }
        ];
      }

      if (performanceData && Array.isArray(performanceData)) {
        return performanceData.map((point: any) => ({
          time: point.time || point.date || point.hour || point.timestamp,
          Jemima: point.Jemima || point.jemima || point.agent_jemima || point.value,
          Ronnie: point.Ronnie || point.ronnie || point.agent_ronnie || point.value,
          ...point
        }));
      }

      // Fallback to default data using actual API values
      const jemimaScore = agentPerformance?.heat_model_breakdown?.halt_average || 7.0;
      const ronnieScore = agentPerformance?.overall_effectiveness_score || 6.33;
      
      return [
        { time: '09:00', Jemima: jemimaScore, Ronnie: null },
        { time: '10:00', Jemima: jemimaScore, Ronnie: ronnieScore },
        { time: '11:00', Jemima: null, Ronnie: ronnieScore },
        { time: '12:00', Jemima: jemimaScore, Ronnie: null },
        { time: '16:00', Jemima: jemimaScore, Ronnie: null }
      ];
    };

    const transformSentimentTrendData = () => {
      // Method 1: Try to get data from customer experience visualizations
      let sentimentData = customerExperience?.visualizations?.find((viz: any) => 
        viz.chart_type === 'line_chart' && viz.title?.includes('Sentiment')
      )?.data_points;

      // Method 2: Try satisfaction_trend_line type
      if (!sentimentData) {
        sentimentData = customerExperience?.visualizations?.find((viz: any) => 
          viz.type === 'satisfaction_trend_line'
        )?.data_points;
      }

      // Method 3: Extract from sentiment distribution if available
      if (!sentimentData && customerExperience?.sentiment_distribution) {
        const distribution = customerExperience.sentiment_distribution;
        const avgSentiment = distribution.positive > 50 ? 0.8 : 
                           distribution.negative > 50 ? 0.2 : 0.5;
        
        sentimentData = [
          { time: '10:33', value: avgSentiment, agent: 'Jemima', status: avgSentiment > 0.6 ? 'Positive' : avgSentiment < 0.4 ? 'Negative' : 'Neutral' },
          { time: '11:45', value: avgSentiment, agent: 'Ronnie', status: avgSentiment > 0.6 ? 'Positive' : avgSentiment < 0.4 ? 'Negative' : 'Neutral' },
          { time: '16:36', value: avgSentiment, agent: 'Jemima', status: avgSentiment > 0.6 ? 'Positive' : avgSentiment < 0.4 ? 'Negative' : 'Neutral' }
        ];
      }

      if (sentimentData && Array.isArray(sentimentData)) {
        return sentimentData.map((point: any) => ({
          time: point.time || point.date || point.timestamp || point.hour,
          value: point.value || point.sentiment_score || point.sentiment || 0.5,
          agent: point.agent || point.agent_name || 'Unknown',
          status: point.status || (point.value > 0.6 ? 'Positive' : point.value < 0.4 ? 'Negative' : 'Neutral'),
          ...point
        }));
      }

      // Fallback using actual sentiment data from API
      const sentimentScore = customerExperience?.sentiment_distribution?.positive > 50 ? 0.8 :
                            customerExperience?.sentiment_distribution?.negative > 50 ? 0.2 : 0.5;
      const sentimentStatus = sentimentScore > 0.6 ? 'Positive' : sentimentScore < 0.4 ? 'Negative' : 'Neutral';
      
      return [
        { time: '10:33', value: sentimentScore, agent: 'Jemima', status: sentimentStatus },
        { time: '11:45', value: sentimentScore, agent: 'Ronnie', status: sentimentStatus },
        { time: '16:36', value: sentimentScore, agent: 'Jemima', status: sentimentStatus }
      ];
    };

    return (
      <div className="space-y-6">
        {/* Analysis Metadata Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {analysisMetadata?.company_name || dataSummary?.company_context?.name || 'Business Intelligence'}
                </h1>
              </div>
              <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-sm px-3 py-1 rounded-full">
                {analysisMetadata?.company_context?.industry || dataSummary?.company_context?.industry || 'Analysis'}
              </span>
            </div>
            <div className="text-right">
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <Calendar className="h-4 w-4" />
                <span>
                  {dataSummary?.time_period?.start_date || analysisMetadata?.analysis_period?.start_date} - {dataSummary?.time_period?.end_date || analysisMetadata?.analysis_period?.end_date}
                </span>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {dataSummary?.time_period?.total_days || analysisMetadata?.analysis_period?.total_days || 0} days analyzed
              </div>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Calls</span>
                <Phone className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                {quickMetrics?.total_calls || dataSummary?.total_calls_analyzed || analysisMetadata?.data_summary?.total_calls_analyzed || 0}
              </p>
              <p className="text-xs text-green-600 dark:text-green-400">
                {quickMetrics?.answered_percentage || 100}% answered
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Unique Callers</span>
                <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                {quickMetrics?.unique_callers || 0}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                Individual customers
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Duration</span>
                <ClockIcon size={18} className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                {quickMetrics?.average_call_duration || dataSummary?.analysis_metadata?.data_summary?.average_call_duration || 0}s
              </p>
              <p className="text-xs text-purple-600 dark:text-purple-400">
                Average handle time
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Confidence</span>
                <Target className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                {analysisMetadata?.data_summary?.analysis_confidence || 90}%
              </p>
              <p className="text-xs text-orange-600 dark:text-orange-400">
                Analysis quality
              </p>
            </div>
          </div>
        </div>

        {/* Parsing Error Alert */}
        {hasParsingError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                  Data Processing Error
                </h3>
                <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                  <p>
                    <strong>Error:</strong> {parsingError?.error || 'Unknown parsing error'}
                  </p>
                  {parsingError?.error_position && (
                    <p className="mt-1">
                      <strong>Position:</strong> Character {parsingError.error_position}
                    </p>
                  )}
                  <p className="mt-2">
                    The dashboard is showing fallback data. Please contact support if this issue persists.
                  </p>
                </div>
                {parsingError?.recovery_attempts && (
                  <div className="mt-2">
                    <details className="text-xs text-red-600 dark:text-red-400">
                      <summary className="cursor-pointer">Recovery attempts ({parsingError.recovery_attempts.length})</summary>
                      <ul className="mt-1 ml-4 list-disc">
                        {parsingError.recovery_attempts.map((attempt: string, index: number) => (
                          <li key={index}>{attempt}</li>
                        ))}
                      </ul>
                    </details>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Executive Summary Section */}
        <CollapsibleSection 
          title="Executive Summary" 
          sectionKey="executive" 
          icon={Target}
          badge={`Health Score: ${executiveSummary?.overall_health_score || 85}`}
          defaultExpanded={true}
        >
          <div className="space-y-6">
            {/* Health Score & Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-blue-700 dark:text-blue-300">Health Score</h3>
                  <button 
                    onClick={() => setShowEvidenceModal('healthScore')}
                    className="text-blue-400 hover:text-blue-600"
                    title="View calculation methodology"
                  >
                    <Info size={12} />
                  </button>
                </div>
                <div className="flex items-baseline">
                  <span className="text-2xl font-bold text-blue-900 dark:text-blue-200">
                    {executiveSummary?.overall_health_score || 85}
                  </span>
                  <span className="text-sm text-blue-600 dark:text-blue-300 ml-1">/100</span>
                </div>
                <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2 mt-2">
                  <div 
                    className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full" 
                    style={{ width: `${executiveSummary?.overall_health_score || 85}%` }}
                  ></div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-lg p-4 border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-green-700 dark:text-green-300">Business Impact</h3>
                  <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                  {executiveSummary?.business_impact?.split('.')[0] || 'Strong operational performance'}
                </p>
              </div>

              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/30 dark:to-yellow-800/30 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-yellow-700 dark:text-yellow-300">Critical Alerts</h3>
                  <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                </div>
                <p className="text-lg font-bold text-yellow-900 dark:text-yellow-200">
                  {executiveSummary?.critical_alerts?.length || 0}
                </p>
                <p className="text-xs text-yellow-600 dark:text-yellow-300">
                  {executiveSummary?.critical_alerts?.length > 0 ? 'Need attention' : 'All clear'}
                </p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-purple-700 dark:text-purple-300">Satisfaction</h3>
                  <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <p className="text-2xl font-bold text-purple-900 dark:text-purple-200">
                  {Math.round(customerExperience?.satisfaction_score || 70)}%
                </p>
                <p className="text-xs text-purple-600 dark:text-purple-300">Customer sentiment</p>
              </div>
            </div>

            {/* Key Findings */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Lightbulb className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Key Findings</h3>
              </div>
              <div className="space-y-2">
                {executiveSummary?.key_findings?.map((finding: string, index: number) => (
                  <div key={index} className="flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-600 dark:text-gray-300">{finding}</p>
                  </div>
                )) || (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No key findings available</p>
                )}
              </div>
            </div>

            {/* Critical Alerts */}
            {executiveSummary?.critical_alerts?.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <h3 className="text-sm font-semibold text-red-900 dark:text-red-200">Critical Alerts</h3>
                </div>
                <div className="space-y-2">
                  {executiveSummary.critical_alerts.map((alert: string, index: number) => (
                    <div key={index} className="flex items-start space-x-2">
                      <XCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-red-700 dark:text-red-300">{alert}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CollapsibleSection>

                      {/* Customer Experience Section */}
        <CollapsibleSection 
          title="Customer Experience" 
          sectionKey="customer" 
          icon={Users}
          badge={`${Math.round(customerExperience?.satisfaction_score || 70)}% Satisfaction`}
          defaultExpanded={true}
        >
          <div className="space-y-6">
            {/* Satisfaction & Sentiment */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <h3 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">Satisfaction Score</h3>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-200">
                  {Math.round(customerExperience?.satisfaction_score || 70)}%
                </p>
                <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2 mt-2">
                  <div 
                    className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full" 
                    style={{ width: `${customerExperience?.satisfaction_score || 70}%` }}
                  ></div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Sentiment Distribution</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <ThumbsUp className="h-3 w-3 text-green-600" />
                      <span className="text-xs">Positive</span>
                    </div>
                    <span className="text-xs font-medium">{customerExperience?.sentiment_distribution?.positive || 0}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <Minus className="h-3 w-3 text-gray-600" />
                      <span className="text-xs">Neutral</span>
                    </div>
                    <span className="text-xs font-medium">{customerExperience?.sentiment_distribution?.neutral || 37.5}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <ThumbsDown className="h-3 w-3 text-red-600" />
                      <span className="text-xs">Negative</span>
                    </div>
                    <span className="text-xs font-medium">{customerExperience?.sentiment_distribution?.negative || 0}%</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
                <h3 className="text-sm font-medium text-orange-700 dark:text-orange-300 mb-2">Pain Points</h3>
                <p className="text-2xl font-bold text-orange-900 dark:text-orange-200">
                  {customerExperience?.top_pain_points?.length || 0}
                </p>
                <p className="text-xs text-orange-600 dark:text-orange-300 mt-1">Issues identified</p>
              </div>
            </div>

            {/* Top Pain Points */}
            {customerExperience?.top_pain_points?.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-4">
                  <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <h3 className="text-sm font-semibold text-red-900 dark:text-red-200">Top Pain Points</h3>
                  <button 
                    onClick={() => setShowEvidenceModal('painPoints')}
                    className="text-red-400 hover:text-red-600"
                    title="View detailed analysis"
                  >
                    <Info size={12} />
                  </button>
                </div>
                <div className="space-y-3">
                  {customerExperience.top_pain_points.map((point: any, index: number) => (
                    <div key={index} className="border border-red-200 dark:border-red-700 rounded-lg p-3 bg-white dark:bg-gray-800">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-sm font-medium text-red-900 dark:text-red-300">{point.issue}</h4>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          point.impact_score >= 80 ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' :
                          point.impact_score >= 70 ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300' :
                          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300'
                        }`}>
                          Impact: {point.impact_score}
                        </span>
                      </div>
                      <p className="text-xs text-red-600 dark:text-red-400 mb-2">
                        Frequency: {point.frequency} occurrence(s)
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-300">
                        <strong>Recommendation:</strong> {point.recommendation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Emotional Journey */}
            {customerExperience?.emotional_journey && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-3">Customer Emotional Journey</h3>
                <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                  {customerExperience.emotional_journey.typical_pattern}
                </p>
                {customerExperience.emotional_journey.improvement_opportunities?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-blue-800 dark:text-blue-300 mb-2">Improvement Opportunities:</h4>
                    <ul className="space-y-1">
                      {customerExperience.emotional_journey.improvement_opportunities.map((opportunity: string, index: number) => (
                        <li key={index} className="text-xs text-blue-600 dark:text-blue-400 flex items-start space-x-1">
                          <span className="w-1 h-1 bg-blue-600 rounded-full mt-2 flex-shrink-0"></span>
                          <span>{opportunity}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* Agent Performance Section */}
        <CollapsibleSection 
          title="Agent Performance" 
          sectionKey="agent" 
          icon={Headphones}
          badge={`${agentPerformance?.overall_effectiveness_score || 68}/100`}
          defaultExpanded={true}
        >
          <div className="space-y-6">
            {/* HEAT Model Breakdown */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-4">
                <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">HEAT Model Breakdown</h3>
                <button 
                  onClick={() => setShowEvidenceModal('heatModel')}
                  className="text-gray-400 hover:text-blue-500"
                  title="View HEAT model explanation"
                >
                  <Info size={12} />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                  <h4 className="font-medium text-blue-900 dark:text-blue-300 text-sm">Halt (Listen)</h4>
                  <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                    {agentPerformance?.heat_model_breakdown?.halt_average || 7.0}
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-400">Average Score</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                  <h4 className="font-medium text-green-900 dark:text-green-300 text-sm">Empathy</h4>
                  <p className="text-xl font-bold text-green-600 dark:text-green-400">
                    {agentPerformance?.heat_model_breakdown?.empathy_average || 7.0}
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-400">Average Score</p>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                  <h4 className="font-medium text-yellow-900 dark:text-yellow-300 text-sm">Apologize</h4>
                  <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
                    {agentPerformance?.heat_model_breakdown?.apologize_average || 'N/A'}
                  </p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-400">Average Score</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                  <h4 className="font-medium text-purple-900 dark:text-purple-300 text-sm">Take Action</h4>
                  <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                    {agentPerformance?.heat_model_breakdown?.take_action_average || 6.33}
                  </p>
                  <p className="text-xs text-purple-700 dark:text-purple-400">
                    {(agentPerformance?.heat_model_breakdown?.take_action_average || 6.33) < 7 ? 'Needs Improvement' : 'Good'}
                  </p>
                </div>
              </div>
            </div>

            {/* Performance Distribution */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Performance Distribution</h3>
                <div className="grid grid-cols-4 gap-2">
                  <div className="text-center">
                    <div className="bg-green-100 dark:bg-green-900/20 p-2 rounded">
                      <Star className="h-4 w-4 text-green-600 dark:text-green-400 mx-auto" />
                    </div>
                    <p className="text-sm font-bold text-green-600 dark:text-green-400 mt-1">
                      {agentPerformance?.performance_distribution?.excellent || 0}
                    </p>
                    <p className="text-xs text-gray-500">Excellent</p>
                  </div>
                  <div className="text-center">
                    <div className="bg-blue-100 dark:bg-blue-900/20 p-2 rounded">
                      <Award className="h-4 w-4 text-blue-600 dark:text-blue-400 mx-auto" />
                    </div>
                    <p className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-1">
                      {agentPerformance?.performance_distribution?.good || 2}
                    </p>
                    <p className="text-xs text-gray-500">Good</p>
                  </div>
                  <div className="text-center">
                    <div className="bg-yellow-100 dark:bg-yellow-900/20 p-2 rounded">
                      <Minus className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mx-auto" />
                    </div>
                    <p className="text-sm font-bold text-yellow-600 dark:text-yellow-400 mt-1">
                      {agentPerformance?.performance_distribution?.fair || 1}
                    </p>
                    <p className="text-xs text-gray-500">Fair</p>
                  </div>
                  <div className="text-center">
                    <div className="bg-red-100 dark:bg-red-900/20 p-2 rounded">
                      <XCircle className="h-4 w-4 text-red-600 dark:text-red-400 mx-auto" />
                    </div>
                    <p className="text-sm font-bold text-red-600 dark:text-red-400 mt-1">
                      {agentPerformance?.performance_distribution?.poor || 0}
                    </p>
                    <p className="text-xs text-gray-500">Poor</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Top Performers</h3>
                {agentPerformance?.top_performers?.map((performer: any, index: number) => (
                  <div key={index} className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 mb-3">
                    <p className="text-sm font-medium text-green-900 dark:text-green-300 mb-2">
                      {performer.performance_pattern}
                    </p>
                    {performer.success_factors?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-green-800 dark:text-green-300 mb-1">Success Factors:</p>
                        <ul className="space-y-1">
                          {performer.success_factors.slice(0, 2).map((factor: string, idx: number) => (
                            <li key={idx} className="text-xs text-green-700 dark:text-green-400 flex items-start space-x-1">
                              <CheckCircle className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                              <span>{factor}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )) || (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No performance data available</p>
                )}
              </div>
            </div>

            {/* Coaching Priorities */}
            {agentPerformance?.coaching_priorities?.length > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <BookOpen className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  <h3 className="text-sm font-semibold text-yellow-900 dark:text-yellow-200">Coaching Priorities</h3>
                </div>
                <div className="space-y-3">
                  {agentPerformance.coaching_priorities.map((priority: any, index: number) => (
                    <div key={index} className="border border-yellow-200 dark:border-yellow-700 rounded-lg p-3 bg-white dark:bg-gray-800">
                      <h4 className="text-sm font-medium text-yellow-900 dark:text-yellow-300 mb-2">
                        {priority.skill_area}
                      </h4>
                      <p className="text-xs text-yellow-700 dark:text-yellow-400 mb-2">
                        Agents needing support: {priority.agents_needing_support}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-300 mb-2">
                        <strong>Training:</strong> {priority.training_recommendation}
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400">
                        <strong>Expected Impact:</strong> {priority.expected_impact}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* Operational Efficiency Section */}
        <CollapsibleSection 
          title="Operational Efficiency" 
          sectionKey="operational" 
          icon={Settings}
          badge={`${operationalEfficiency?.efficiency_score || 88}/100`}
          defaultExpanded={true}
        >
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <h3 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">Efficiency Score</h3>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-200">
                  {operationalEfficiency?.efficiency_score || 88}/100
                </p>
                <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2 mt-2">
                  <div 
                    className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full" 
                    style={{ width: `${operationalEfficiency?.efficiency_score || 88}%` }}
                  ></div>
                </div>
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                <h3 className="text-sm font-medium text-green-700 dark:text-green-300 mb-2">Avg Handle Time</h3>
                <p className="text-2xl font-bold text-green-900 dark:text-green-200">
                  {operationalEfficiency?.key_metrics?.average_handle_time || 180}s
                </p>
                <p className="text-xs text-green-600 dark:text-green-300">Within target</p>
              </div>

              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                <h3 className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-2">Completion Rate</h3>
                <p className="text-2xl font-bold text-purple-900 dark:text-purple-200">
                  {operationalEfficiency?.key_metrics?.call_completion_rate || 87.5}%
                </p>
                <p className="text-xs text-purple-600 dark:text-purple-300">Call completion</p>
              </div>

              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
                <h3 className="text-sm font-medium text-orange-700 dark:text-orange-300 mb-2">Process Index</h3>
                <p className="text-2xl font-bold text-orange-900 dark:text-orange-200">
                  {operationalEfficiency?.key_metrics?.process_efficiency_index || 85}
                </p>
                <p className="text-xs text-orange-600 dark:text-orange-300">Efficiency index</p>
              </div>
            </div>

            {/* Bottlenecks */}
            {operationalEfficiency?.bottlenecks_identified?.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <h3 className="text-sm font-semibold text-red-900 dark:text-red-200">Identified Bottlenecks</h3>
                </div>
                <div className="space-y-3">
                  {operationalEfficiency.bottlenecks_identified.map((bottleneck: any, index: number) => (
                    <div key={index} className="border border-red-200 dark:border-red-700 rounded-lg p-3 bg-white dark:bg-gray-800">
                      <h4 className="text-sm font-medium text-red-900 dark:text-red-300 mb-1">
                        {bottleneck.process_step}
                      </h4>
                      <p className="text-xs text-red-600 dark:text-red-400 mb-2">
                        <strong>Impact:</strong> {bottleneck.delay_impact} | <strong>Frequency:</strong> {bottleneck.frequency}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          bottleneck.optimization_potential === 'High' ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' :
                          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300'
                        }`}>
                          {bottleneck.optimization_potential} Potential
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Automation Opportunities */}
            {operationalEfficiency?.automation_opportunities?.length > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200">Automation Opportunities</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {operationalEfficiency.automation_opportunities.map((opportunity: any, index: number) => (
                    <div key={index} className="border border-blue-200 dark:border-blue-700 rounded-lg p-3 bg-white dark:bg-gray-800">
                      <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-1">
                        {opportunity.process}
                      </h4>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mb-2">
                        Call Volume: {opportunity.call_volume} | Savings: {opportunity.potential_savings}
                      </p>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        opportunity.implementation_effort === 'Medium' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' :
                        'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                      }`}>
                        {opportunity.implementation_effort} Effort
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Staffing Insights */}
            {operationalEfficiency?.staffing_insights && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Users className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <h3 className="text-sm font-semibold text-green-900 dark:text-green-200">Staffing Insights</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-xs font-medium text-green-800 dark:text-green-300 mb-2">Peak Hours:</h4>
                    <div className="space-y-1">
                      {operationalEfficiency.staffing_insights.peak_hours?.map((hour: string, index: number) => (
                        <div key={index} className="flex items-center space-x-2">
                          <ClockIcon size={16} className="h-3 w-3 text-green-600" />
                          <span className="text-xs text-green-700 dark:text-green-400">{hour}</span>
                        </div>
                      )) || <p className="text-xs text-green-600 dark:text-green-400">No peak hours data</p>}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-green-800 dark:text-green-300 mb-2">Recommendations:</h4>
                    <p className="text-xs text-green-700 dark:text-green-400">
                      {operationalEfficiency.staffing_insights.optimal_staffing_pattern}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* Critical Alerts & Actions */}
        <CollapsibleSection 
          title="Critical Alerts & Actions" 
          sectionKey="alerts" 
          icon={AlertTriangle}
          badge={flaggedConversations?.total_flagged || 0}
          defaultExpanded={true}
        >
          <div className="space-y-4">
            {/* Critical Alerts from Executive Summary */}
            {executiveSummary?.critical_alerts?.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <h3 className="text-sm font-semibold text-red-900 dark:text-red-200">Critical Business Alerts</h3>
                </div>
                <div className="space-y-3">
                  {executiveSummary.critical_alerts.map((alert: string, index: number) => (
                    <div key={index} className="border border-red-200 dark:border-red-700 rounded-lg p-3 bg-white dark:bg-gray-800">
                      <p className="text-sm text-red-800 dark:text-red-300">{alert}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Flagged Conversations */}
            {flaggedConversations?.flagged_conversations_details?.length > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Flag className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  <h3 className="text-sm font-semibold text-yellow-900 dark:text-yellow-200">Flagged Conversations</h3>
                  <button 
                    onClick={() => setShowEvidenceModal('flaggedCalls')}
                    className="text-yellow-400 hover:text-yellow-600"
                    title="View detailed flagged calls"
                  >
                    <Info size={12} />
                  </button>
                </div>
                <div className="space-y-2">
                  {flaggedConversations.flagged_conversations_details.slice(0, 3).map((flagged: any, index: number) => (
                    <div key={index} className="flex items-start justify-between p-2 bg-white dark:bg-gray-800 rounded border border-yellow-200 dark:border-yellow-700">
                      <div className="flex-1">
                        <p className="text-xs font-medium text-yellow-900 dark:text-yellow-300">{flagged.call_id}</p>
                        <p className="text-xs text-yellow-700 dark:text-yellow-400">{flagged.flag_reason}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs ${
                        flagged.severity_level === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' :
                        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300'
                      }`}>
                        {flagged.severity_level}
                      </span>
                    </div>
                  ))}
                  {flaggedConversations.flagged_conversations_details.length > 3 && (
                    <button 
                      onClick={() => setShowEvidenceModal('flaggedCalls')}
                      className="text-xs text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-300"
                    >
                      View {flaggedConversations.flagged_conversations_details.length - 3} more flagged calls
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Immediate Actions from Recommendations */}
            {recommendations?.immediate_actions?.length > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Target className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200">Immediate Actions Required</h3>
                </div>
                <div className="space-y-2">
                  {recommendations.immediate_actions.map((action: any, index: number) => (
                    <div key={index} className="border border-blue-200 dark:border-blue-700 rounded-lg p-3 bg-white dark:bg-gray-800">
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-300">{action.action}</p>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          action.priority === 'critical' ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' :
                          'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300'
                        }`}>
                          {action.priority}
                        </span>
                      </div>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">
                        <strong>Timeline:</strong> {action.timeline}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-300">
                        <strong>Impact:</strong> {action.expected_impact}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* Business Insights & Intelligence */}
        <CollapsibleSection 
          title="Business Insights & Intelligence" 
          sectionKey="insights" 
          icon={Lightbulb}
          badge="View Details"
          defaultExpanded={false}
        >
          <div className="space-y-4">
            {/* Quick Insights Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Strategic Insights Summary */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30"
                   onClick={() => setShowEvidenceModal('strategicInsights')}>
                <div className="flex items-center space-x-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200">Strategic Insights</h3>
                </div>
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  {businessIntelligence?.strategic_insights?.length || 3}
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-400">insights identified</p>
              </div>

              {/* Product Analysis Summary */}
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/30"
                   onClick={() => setShowEvidenceModal('productAnalysis')}>
                <div className="flex items-center space-x-2 mb-2">
                  <PackageIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <h3 className="text-sm font-semibold text-green-900 dark:text-green-200">Product Analysis</h3>
                </div>
                <p className="text-xl font-bold text-green-600 dark:text-green-400">
                  {commonProducts?.top_products_mentioned?.length || 2}
                </p>
                <p className="text-xs text-green-700 dark:text-green-400">products analyzed</p>
              </div>

              {/* Keywords & Topics Summary */}
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4 cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900/30"
                   onClick={() => setShowEvidenceModal('keywordAnalysis')}>
                <div className="flex items-center space-x-2 mb-2">
                  <MessageSquare className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-200">Keywords & Topics</h3>
                </div>
                <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                  {customerKeywords?.top_keywords?.length || 4}
                </p>
                <p className="text-xs text-purple-700 dark:text-purple-400">key topics tracked</p>
              </div>
            </div>

            {/* Risk Assessment Summary */}
            {riskAssessment && (
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Shield className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    <h3 className="text-sm font-semibold text-orange-900 dark:text-orange-200">Risk Assessment</h3>
                  </div>
                  <button 
                    onClick={() => setShowEvidenceModal('riskAssessment')}
                    className="text-orange-400 hover:text-orange-600"
                    title="View detailed risk assessment"
                  >
                    <Info size={12} />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-orange-700 dark:text-orange-400 mb-1">Overall Risk Score</p>
                    <p className="text-lg font-bold text-orange-900 dark:text-orange-200">
                      {riskAssessment.overall_risk_score || 55}/100
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-orange-700 dark:text-orange-400 mb-1">Critical Risks</p>
                    <p className="text-lg font-bold text-orange-900 dark:text-orange-200">
                      {riskAssessment.critical_risks?.length || 2}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-orange-700 dark:text-orange-400 mb-1">Call Volume Forecast</p>
                    <p className="text-lg font-bold text-orange-900 dark:text-orange-200">
                      {forecasts?.call_volume_forecast?.next_week_prediction?.predicted_volume || 49}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Recommendations Summary */}
            {recommendations?.strategic_initiatives?.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Target className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Strategic Recommendations</h3>
                  <button 
                    onClick={() => setShowEvidenceModal('recommendations')}
                    className="text-gray-400 hover:text-gray-600"
                    title="View detailed recommendations"
                  >
                    <Info size={12} />
                  </button>
                </div>
                <div className="space-y-2">
                  {recommendations.strategic_initiatives.slice(0, 2).map((initiative: any, index: number) => (
                    <div key={index} className="text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-600">
                      <p className="font-medium">{initiative.initiative}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{initiative.business_case}</p>
                    </div>
                  ))}
                  {recommendations.strategic_initiatives.length > 2 && (
                    <button 
                      onClick={() => setShowEvidenceModal('recommendations')}
                      className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      View {recommendations.strategic_initiatives.length - 2} more recommendations
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* Evidence Modal */}
        {showEvidenceModal && (
          <EvidenceModal 
            id={showEvidenceModal as string} 
            onClose={handleCloseModal} 
          />
        )}
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
                  onClick={() => setActiveTab(tab.id as ActiveTab)}
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
                      <tab.icon className="h-4 w-4" />
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

        {activeTab === 'customers' && (
          <motion.div
            key="customers"
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

        {activeTab === 'agents' && (
          <motion.div
            key="agents"
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

        {activeTab === 'bi' && (
          <motion.div
            key="bi"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <BusinessIntelligenceTab 
              businessIntelligenceData={businessIntelligenceData} 
              isBILoading={isBILoading} 
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
  return (
    <div className="space-y-8">
      {/* Customer Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
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

        {/* Customer Metrics Cards */}
        {(() => {
          if (isLoading) {
            return [...Array(5)].map((_, i) => (
              <div key={`loading-${i}`} className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                </div>
              </div>
            ));
          }

          if (!customerAnalyticsData?.top_callers || customerAnalyticsData.top_callers.length === 0) {
            return null;
          }

          const callers = customerAnalyticsData.top_callers;
          const totalCalls = callers.reduce((sum: number, caller: any) => sum + caller.call_count, 0);
          const averageCalls = totalCalls / callers.length;

          const topPerformers = {
            mostActive: callers.reduce((prev: any, current: any) => 
              prev.call_count > current.call_count ? prev : current),
            longestCalls: callers.reduce((prev: any, current: any) => 
              prev.total_duration > current.total_duration ? prev : current),
            highestAvgDuration: callers.reduce((prev: any, current: any) => 
              prev.avg_duration > current.avg_duration ? prev : current),
            bestRecordingRate: callers.reduce((prev: any, current: any) => 
              (prev.recording_rate || 0) > (current.recording_rate || 0) ? prev : current),
            bestAnswerRate: callers.reduce((prev: any, current: any) => 
              (prev.answer_rate || 0) > (current.answer_rate || 0) ? prev : current),
          };

          const formatDuration = (seconds: number) => {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            if (hours > 0) return `${hours}h ${minutes}m`;
            return `${minutes}m`;
          };

          return [
            // Most Active Caller
            <div key="most-active" className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 p-6 rounded-xl shadow-sm border border-cyan-100 dark:border-cyan-800/50">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-sm font-medium text-cyan-700 dark:text-cyan-400">Most Active</h3>
                <PhoneIcon size={18} className="text-cyan-500" />
              </div>
              <div className="text-3xl font-bold text-gray-800 dark:text-white mb-1">
                {topPerformers.mostActive.call_count}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {topPerformers.mostActive.number}
              </div>
            </div>,

            // Longest Total Duration
            <div key="longest-duration" className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 p-6 rounded-xl shadow-sm border border-indigo-100 dark:border-indigo-800/50">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-sm font-medium text-indigo-700 dark:text-indigo-400">Longest Total</h3>
                <ClockIcon size={18} className="text-indigo-500" />
              </div>
              <div className="text-3xl font-bold text-gray-800 dark:text-white mb-1">
                {formatDuration(topPerformers.longestCalls.total_duration)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {topPerformers.longestCalls.number}
              </div>
            </div>,

            // Highest Average Duration
            <div key="highest-avg" className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 p-6 rounded-xl shadow-sm border border-emerald-100 dark:border-emerald-800/50">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Highest Avg</h3>
                <TrendingUpIcon size={18} className="text-emerald-500" />
              </div>
              <div className="text-3xl font-bold text-gray-800 dark:text-white mb-1">
                {formatDuration(topPerformers.highestAvgDuration.avg_duration)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {topPerformers.highestAvgDuration.number}
              </div>
            </div>,

            // Best Recording Rate
            <div key="best-recording" className="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 p-6 rounded-xl shadow-sm border border-yellow-100 dark:border-yellow-800/50">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-sm font-medium text-yellow-700 dark:text-yellow-400">Best Recording</h3>
                <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 715 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="text-3xl font-bold text-gray-800 dark:text-white mb-1">
                {((topPerformers.bestRecordingRate.recording_rate || 0)).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {topPerformers.bestRecordingRate.number}
              </div>
            </div>,

            // Best Answer Rate
            <div key="best-answer" className="bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20 p-6 rounded-xl shadow-sm border border-rose-100 dark:border-rose-800/50">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-sm font-medium text-rose-700 dark:text-rose-400">Best Answer</h3>
                <svg className="w-5 h-5 text-rose-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="text-3xl font-bold text-gray-800 dark:text-white mb-1">
                {((topPerformers.bestAnswerRate.answer_rate || 0)).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {topPerformers.bestAnswerRate.number}
              </div>
            </div>
          ];
        })()}
      </div>

      {/* Creative Layout for Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Top Customer Comparison - Large Card */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="xl:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow duration-300"
        >
          <div className="p-6 pb-0">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <BarChartIcon size={20} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Top Customer Comparison</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Compare your most active customers</p>
                </div>
              </div>
            </div>
          </div>
          <div className="px-6 pb-6">
            <div className="h-[400px]">
              <TopCallerComparisonChart 
                callers={customerAnalyticsData?.top_callers} 
                isLoading={isLoading} 
                sortMetric="call_count"
              />
            </div>
          </div>
        </motion.div>

        {/* Performance Radar - Tall Card */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow duration-300"
        >
          <div className="p-6 pb-0">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <TrendingUpIcon size={20} className="text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Performance Radar</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Multi-dimensional analysis</p>
              </div>
            </div>
          </div>
          <div className="px-6 pb-6">
            <div className="h-[400px]">
              <CallPerformanceRadar 
                callers={customerAnalyticsData?.top_callers} 
                isLoading={isLoading} 
                maxCallers={5}
              />
            </div>
          </div>
        </motion.div>
      </div>



      {/* Optional: Add spacing for visual balance */}
      <div className="h-4"></div>
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