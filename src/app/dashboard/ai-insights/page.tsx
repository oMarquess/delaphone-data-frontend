'use client';

import { useState, useEffect } from 'react';
import { SyncOutlined, TrophyOutlined, ClockCircleOutlined, UserOutlined, SmileOutlined, InfoCircleOutlined, MessageOutlined, BarChartOutlined, HeartOutlined, CustomerServiceOutlined, RiseOutlined } from '@ant-design/icons';
import { Tooltip as AntTooltip, Progress } from 'antd';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, Sector } from 'recharts';
import type { PieSectorDataItem } from 'recharts/types/polar/Pie';
import { DateRangePicker } from '@/components/DateRangePicker';
import { useSettings } from '@/context/SettingsContext';
import { toast } from 'sonner';
import { publishDateChange } from '@/components/ai/AIDrawer';
import { useAgentPerformanceMetrics, useCustomerVoiceSentimentMetrics } from '@/services/aiInsights';

export default function AIInsightsPage() {
  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];
  
  const [dateRange, setDateRange] = useState({
    startDate: today,
    endDate: today,
  });
  
  // Use the SWR hook for agent performance metrics
  const { data: metrics, error, isLoading: metricsLoading, mutate } = useAgentPerformanceMetrics(
    dateRange.startDate,
    dateRange.endDate
  );

  // Use the SWR hook for customer voice & sentiment metrics
  const { 
    data: customerMetrics, 
    feedbackExcerpts, 
    error: customerError, 
    isLoading: customerLoading, 
    mutate: customerMutate 
  } = useCustomerVoiceSentimentMetrics(
    dateRange.startDate,
    dateRange.endDate
  );

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
      
      // Refresh the agent performance metrics
      await mutate();
      
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

  // Format percentage values
  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;
  
  // Format time values
  const formatTime = (minutes: number) => `${minutes.toFixed(1)} min`;

  // Topic distribution chart data and colors
  const topicColors = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#6B7280'];
  const topicLabels = {
    productInquiries: 'Product Inquiries',
    technicalSupport: 'Technical Support',
    billing: 'Billing',
    general: 'General',
    other: 'Other'
  };

  const topicChartData = customerMetrics ? [
    { name: topicLabels.productInquiries, value: customerMetrics.topicDistribution.productInquiries, color: topicColors[0] },
    { name: topicLabels.technicalSupport, value: customerMetrics.topicDistribution.technicalSupport, color: topicColors[1] },
    { name: topicLabels.billing, value: customerMetrics.topicDistribution.billing, color: topicColors[2] },
    { name: topicLabels.general, value: customerMetrics.topicDistribution.general, color: topicColors[3] },
    { name: topicLabels.other, value: customerMetrics.topicDistribution.other, color: topicColors[4] }
  ].filter(item => item.value > 0) : [];

  // Custom tooltip for topic chart
  const TopicTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded shadow-lg">
          <p className="font-medium text-gray-800 dark:text-gray-200">{payload[0].name}</p>
          <p className="text-gray-700 dark:text-gray-300 text-sm">
            Percentage: <span className="font-medium">{payload[0].value.toFixed(1)}%</span>
          </p>
        </div>
      );
    }
    return null;
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
            disabled={isLoading || metricsLoading}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Manual refresh"
          >
            <SyncOutlined className={`text-lg ${(isLoading || metricsLoading) ? 'animate-spin' : ''}`} />
          </button>
         
          {/* Date Range Picker */}
          <div className="flex items-center">
            <DateRangePicker
              onChange={handleDateRangeChange}
              startDate={dateRange.startDate}
              endDate={dateRange.endDate}
            />
          </div>
        </div>
      </div>

      {/* Agent Performance Section */}
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <TrophyOutlined className="text-xl text-yellow-500" />
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Agent Performance</h2>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="text-red-800 dark:text-red-200 font-medium">Failed to load agent performance data</div>
            <div className="text-red-600 dark:text-red-300 text-sm mt-1">
              {error.message || 'An unexpected error occurred'}
            </div>
          </div>
        )}

        {/* Loading State */}
        {metricsLoading && !metrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Agent Performance Metrics */}
        {metrics && !metricsLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Call Completion Rate */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Call Completion Rate</p>
                    <AntTooltip
                      title={
                        <div className="space-y-2">
                          <div className="font-semibold">Call Completion Rate</div>
                          <div>Percentage of calls that were successfully completed by agents.</div>
                          <div className="text-xs space-y-1 mt-2 pt-2 border-t border-gray-600">
                            <div><strong>Calculation:</strong></div>
                            <div>• Completed calls: {metrics && metrics.totalCallsProcessed > 0 ? 
                              Math.round((metrics.callCompletionRate / 100) * metrics.totalCallsProcessed) : 0}</div>
                            <div>• Total calls: {metrics?.totalCallsProcessed || 0}</div>
                            <div>• Rate: {formatPercentage(metrics?.callCompletionRate || 0)}</div>
                          </div>
                        </div>
                      }
                    >
                      <InfoCircleOutlined className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help" />
                    </AntTooltip>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                    {formatPercentage(metrics.callCompletionRate)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {metrics.totalCallsProcessed} total calls
                  </p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
                  <TrophyOutlined className="text-green-600 dark:text-green-400 text-xl" />
                </div>
              </div>
            </div>

            {/* Average Handle Time */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Handle Time</p>
                    <AntTooltip
                      title={
                        <div className="space-y-2">
                          <div className="font-semibold">Average Handle Time</div>
                          <div>Average duration agents spend on each call, including talk time and processing.</div>
                          <div className="text-xs space-y-1 mt-2 pt-2 border-t border-gray-600">
                            <div><strong>Breakdown:</strong></div>
                            <div>• Average words per call: {metrics?.averageWordCount || 0}</div>
                            <div>• Average duration: {formatTime(metrics?.averageHandleTime || 0)}</div>
                            <div>• Efficiency indicator for agent performance</div>
                          </div>
                        </div>
                      }
                    >
                      <InfoCircleOutlined className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help" />
                    </AntTooltip>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                    {formatTime(metrics.averageHandleTime)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {metrics.averageWordCount} avg words
                  </p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                  <ClockCircleOutlined className="text-blue-600 dark:text-blue-400 text-xl" />
                </div>
              </div>
            </div>

            {/* Agent Efficiency */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Agent Efficiency</p>
                    <AntTooltip
                      title={
                        <div className="space-y-2">
                          <div className="font-semibold">Agent Efficiency</div>
                          <div>Composite score measuring agent effectiveness based on call completion and transcription quality.</div>
                          <div className="text-xs space-y-1 mt-2 pt-2 border-t border-gray-600">
                            <div><strong>Factors:</strong></div>
                            <div>• Transcription success rate</div>
                            <div>• Call completion quality</div>
                            <div>• Communication clarity</div>
                            <div>• Score capped at 95% for realistic benchmarking</div>
                          </div>
                        </div>
                      }
                    >
                      <InfoCircleOutlined className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help" />
                    </AntTooltip>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                    {formatPercentage(metrics.agentEfficiency)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Transcription quality
                  </p>
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-full">
                  <UserOutlined className="text-purple-600 dark:text-purple-400 text-xl" />
                </div>
              </div>
            </div>

            {/* Customer Satisfaction */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Customer Satisfaction</p>
                    <AntTooltip
                      title={
                        <div className="space-y-2">
                          <div className="font-semibold">Customer Satisfaction</div>
                          <div>Estimated satisfaction score based on call completion and interaction quality.</div>
                          <div className="text-xs space-y-1 mt-2 pt-2 border-t border-gray-600">
                            <div><strong>Estimated from:</strong></div>
                            <div>• Call completion success rate</div>
                            <div>• Multi-speaker engagement: {formatPercentage(metrics?.multiSpeakerCallsPercentage || 0)}</div>
                            <div>• Agent-customer interaction quality</div>
                            <div>• Scale: 1.0 (poor) to 5.0 (excellent)</div>
                          </div>
                        </div>
                      }
                    >
                      <InfoCircleOutlined className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help" />
                    </AntTooltip>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                    {metrics.customerSatisfaction.toFixed(1)}/5.0
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {formatPercentage(metrics.multiSpeakerCallsPercentage)} multi-speaker
                  </p>
                </div>
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-full">
                  <SmileOutlined className="text-yellow-600 dark:text-yellow-400 text-xl" />
                </div>
              </div>
            </div>

            {/* Recording Success Rate */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Recording Success Rate</p>
                    <AntTooltip
                      title={
                        <div className="space-y-2">
                          <div className="font-semibold">Recording Success Rate</div>
                          <div>Percentage of calls that were successfully recorded for quality assurance and analysis.</div>
                          <div className="text-xs space-y-1 mt-2 pt-2 border-t border-gray-600">
                            <div><strong>Impact on:</strong></div>
                            <div>• Compliance monitoring</div>
                            <div>• Training opportunities</div>
                            <div>• Quality assurance</div>
                            <div>• Performance evaluation accuracy</div>
                          </div>
                        </div>
                      }
                    >
                      <InfoCircleOutlined className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help" />
                    </AntTooltip>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                    {formatPercentage(metrics.recordingSuccessRate)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Audio capture quality
                  </p>
                </div>
                <div className="p-3 bg-indigo-100 dark:bg-indigo-900/20 rounded-full">
                  <div className="w-6 h-6 bg-indigo-600 dark:bg-indigo-400 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Transcription Accuracy */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Transcription Accuracy</p>
                    <AntTooltip
                      title={
                        <div className="space-y-2">
                          <div className="font-semibold">Transcription Accuracy</div>
                          <div>Estimated accuracy of speech-to-text conversion for call analysis and insights.</div>
                          <div className="text-xs space-y-1 mt-2 pt-2 border-t border-gray-600">
                            <div><strong>Based on:</strong></div>
                            <div>• Word count vs. call duration ratio</div>
                            <div>• Audio quality indicators</div>
                            <div>• Speech clarity and background noise</div>
                            <div>• Used for sentiment and topic analysis</div>
                          </div>
                        </div>
                      }
                    >
                      <InfoCircleOutlined className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help" />
                    </AntTooltip>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                    {formatPercentage(metrics.transcriptionAccuracy)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Speech-to-text quality
                  </p>
                </div>
                <div className="p-3 bg-teal-100 dark:bg-teal-900/20 rounded-full">
                  <div className="w-6 h-6 bg-teal-600 dark:bg-teal-400 rounded text-white flex items-center justify-center text-xs font-bold">
                    T
                  </div>
                </div>
              </div>
            </div>

            {/* Audio Quality Score */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Audio Quality Score</p>
                    <AntTooltip
                      title={
                        <div className="space-y-2">
                          <div className="font-semibold">Audio Quality Score</div>
                          <div>Overall quality score for audio recordings affecting analysis accuracy.</div>
                          <div className="text-xs space-y-1 mt-2 pt-2 border-t border-gray-600">
                            <div><strong>Factors:</strong></div>
                            <div>• Recording success rate</div>
                            <div>• Audio clarity and noise levels</div>
                            <div>• Processing success rate</div>
                            <div>• Affects downstream AI analysis quality</div>
                          </div>
                        </div>
                      }
                    >
                      <InfoCircleOutlined className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help" />
                    </AntTooltip>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                    {formatPercentage(metrics.audioQualityScore)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Overall audio quality
                  </p>
                </div>
                <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-full">
                  <div className="w-6 h-6 bg-orange-600 dark:bg-orange-400 rounded text-white flex items-center justify-center text-xs">
                    ♪
                  </div>
                </div>
              </div>
            </div>

            {/* Multi-Speaker Calls */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Multi-Speaker Calls</p>
                    <AntTooltip
                      title={
                        <div className="space-y-2">
                          <div className="font-semibold">Multi-Speaker Calls</div>
                          <div>Percentage of calls with multiple speakers detected, indicating interactive conversations.</div>
                          <div className="text-xs space-y-1 mt-2 pt-2 border-t border-gray-600">
                            <div><strong>Indicates:</strong></div>
                            <div>• Agent-customer engagement level</div>
                            <div>• Conversation interactivity</div>
                            <div>• Two-way communication quality</div>
                            <div>• Higher engagement typically correlates with better outcomes</div>
                          </div>
                        </div>
                      }
                    >
                      <InfoCircleOutlined className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help" />
                    </AntTooltip>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                    {formatPercentage(metrics.multiSpeakerCallsPercentage)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Interactive conversations
                  </p>
                </div>
                <div className="p-3 bg-pink-100 dark:bg-pink-900/20 rounded-full">
                  <div className="flex space-x-1">
                    <UserOutlined className="text-pink-600 dark:text-pink-400 text-sm" />
                    <UserOutlined className="text-pink-600 dark:text-pink-400 text-sm" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* No Data State */}
        {!metricsLoading && !error && metrics && metrics.totalCallsProcessed === 0 && (
          <div className="flex items-center justify-center h-64 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="text-center">
              <div className="text-gray-400 dark:text-gray-500 text-lg mb-2">
                No call data found
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                No agent performance data available for the selected date range
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Customer Voice & Sentiment Section */}
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <MessageOutlined className="text-xl text-gray-800" />
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Customer Voice & Sentiment</h2>
        </div>

        {/* Error State */}
        {customerError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="text-red-800 dark:text-red-200 font-medium">Failed to load customer voice and sentiment data</div>
            <div className="text-red-600 dark:text-red-300 text-sm mt-1">
              {customerError.message || 'An unexpected error occurred'}
            </div>
          </div>
        )}

        {/* Loading State */}
        {customerLoading && !customerMetrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Customer Voice & Sentiment Metrics */}
        {customerMetrics && !customerLoading && (
          <div className="space-y-6">
            {/* Topic Distribution Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <BarChartOutlined className="text-lg text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Topic Distribution</h3>
                  </div>
                  <AntTooltip
                    title={
                      <div className="space-y-2">
                        <div className="font-semibold">Topic Distribution</div>
                        <div>Breakdown of call topics to understand customer needs and interests.</div>
                        <div className="text-xs space-y-1 mt-2 pt-2 border-t border-gray-600">
                          <div><strong>Categories:</strong></div>
                          <div>• Product Inquiries: Questions about features</div>
                          <div>• Technical Support: Help with issues</div>
                          <div>• Billing: Payment and account questions</div>
                          <div>• General: Information requests</div>
                        </div>
                      </div>
                    }
                  >
                    <InfoCircleOutlined className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help" />
                  </AntTooltip>
                </div>
              </div>
              
              <div className="p-4">
                {topicChartData.length > 0 ? (
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={topicChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value, percent }) => {
                            // Only show label if percentage is above 5%
                            if (percent < 0.05) return null;
                            return `${value.toFixed(1)}%`;
                          }}
                          outerRadius={80}
                          innerRadius={60}
                          fill="#8884d8"
                          dataKey="value"
                          paddingAngle={2}
                          activeIndex={0}
                          activeShape={(props: PieSectorDataItem) => (
                            <Sector
                              {...props}
                              outerRadius={(props.outerRadius || 0) + 10}
                            />
                          )}
                        >
                          {topicChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend 
                          layout="vertical" 
                          verticalAlign="middle" 
                          align="right"
                          iconType="circle"
                          formatter={(value, entry: any) => (
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {value} ({entry.payload.value.toFixed(1)}%)
                            </span>
                          )}
                          wrapperStyle={{ paddingLeft: '20px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[250px] flex items-center justify-center">
                    <div className="text-center">
                      <BarChartOutlined className="text-4xl text-gray-400 dark:text-gray-500 mb-4" />
                      <div className="text-gray-500 dark:text-gray-400 text-lg mb-2">
                        No topic data available
                      </div>
                      <p className="text-gray-400 dark:text-gray-500 text-sm">
                        No topic analysis data found for the selected date range
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <RiseOutlined className="text-green-500" />
                  <span>Showing distribution of {customerMetrics?.totalAnalyzedCalls || 0} analyzed calls</span>
                </div>
              </div>
            </div>

            {/* Sentiment Analysis Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6">
              <div className="flex items-center space-x-2 mb-4">
                <HeartOutlined className="text-lg text-pink-600" />
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Sentiment Analysis</h3>
                <AntTooltip
                  title={
                    <div className="space-y-2">
                      <div className="font-semibold">Sentiment Analysis</div>
                      <div>Customer emotional tone analysis from call transcriptions.</div>
                      <div className="text-xs space-y-1 mt-2 pt-2 border-t border-gray-600">
                        <div><strong>Sentiment Categories:</strong></div>
                        <div>• Positive: Happy, satisfied customers</div>
                        <div>• Neutral: Factual, informational calls</div>
                        <div>• Negative: Frustrated, dissatisfied customers</div>
                        <div>• Average Score: {customerMetrics.averageSentimentScore.toFixed(3)}</div>
                      </div>
                    </div>
                  }
                >
                  <InfoCircleOutlined className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help" />
                </AntTooltip>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {formatPercentage(customerMetrics.sentimentBreakdown.positive)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Positive</div>
                  <Progress 
                    percent={customerMetrics.sentimentBreakdown.positive} 
                    strokeColor="#10B981" 
                    showInfo={false}
                    className="mt-2"
                  />
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                    {formatPercentage(customerMetrics.sentimentBreakdown.neutral)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Neutral</div>
                  <Progress 
                    percent={customerMetrics.sentimentBreakdown.neutral} 
                    strokeColor="#F59E0B" 
                    showInfo={false}
                    className="mt-2"
                  />
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                    {formatPercentage(customerMetrics.sentimentBreakdown.negative)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Negative</div>
                  <Progress 
                    percent={customerMetrics.sentimentBreakdown.negative} 
                    strokeColor="#EF4444" 
                    showInfo={false}
                    className="mt-2"
                  />
                </div>
              </div>
              
              <div className="mt-6 text-center">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Total Analyzed Calls: <span className="font-semibold">{customerMetrics.totalAnalyzedCalls}</span>
                </div>
              </div>
            </div>

            {/* Customer Feedback Excerpts */}
            {feedbackExcerpts && feedbackExcerpts.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <CustomerServiceOutlined className="text-lg text-indigo-600" />
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Customer Feedback Excerpts</h3>
                  <AntTooltip
                    title={
                      <div className="space-y-2">
                        <div className="font-semibold">Customer Feedback Excerpts</div>
                        <div>Real customer feedback from call transcriptions with timestamps.</div>
                        <div className="text-xs space-y-1 mt-2 pt-2 border-t border-gray-600">
                          <div><strong>Information includes:</strong></div>
                          <div>• Actual customer quotes</div>
                          <div>• Sentiment classification</div>
                          <div>• Topic categorization</div>
                          <div>• Call duration and word count</div>
                        </div>
                      </div>
                    }
                  >
                    <InfoCircleOutlined className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help" />
                  </AntTooltip>
                </div>
                
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {feedbackExcerpts.slice(0, 6).map((excerpt, index) => (
                    <div key={excerpt.id} className={`p-4 rounded-lg border-l-4 ${
                      excerpt.sentiment === 'positive' ? 'border-green-500 bg-green-50 dark:bg-green-900/10' :
                      excerpt.sentiment === 'negative' ? 'border-red-500 bg-red-50 dark:bg-red-900/10' :
                      'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              excerpt.sentiment === 'positive' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                              excerpt.sentiment === 'negative' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                              'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                            }`}>
                              {excerpt.sentiment}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">{excerpt.topic}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatTime(excerpt.duration / 60)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                            "{excerpt.text}"
                          </p>
                          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            {new Date(excerpt.timestamp).toLocaleString()} • {excerpt.wordCount} words
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {feedbackExcerpts.length > 6 && (
                  <div className="mt-4 text-center">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Showing 6 of {feedbackExcerpts.length} feedback excerpts
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* No Feedback State */}
            {(!feedbackExcerpts || feedbackExcerpts.length === 0) && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                <div className="text-center py-8">
                  <CustomerServiceOutlined className="text-4xl text-gray-400 dark:text-gray-500 mb-4" />
                  <div className="text-gray-500 dark:text-gray-400 text-lg mb-2">
                    No customer feedback available
                  </div>
                  <p className="text-gray-400 dark:text-gray-500 text-sm">
                    No transcribed customer feedback found for the selected date range
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* No Customer Data State */}
        {!customerLoading && !customerError && customerMetrics && customerMetrics.totalAnalyzedCalls === 0 && (
          <div className="flex items-center justify-center h-64 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="text-center">
              <div className="text-gray-400 dark:text-gray-500 text-lg mb-2">
                No customer voice data found
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                No customer voice and sentiment data available for the selected date range
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 