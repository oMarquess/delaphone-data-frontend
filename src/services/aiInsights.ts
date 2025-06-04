import useSWR from 'swr';
import axios from 'axios';
import { API_BASE_URL } from '@/config/constants';
import tokenManager from '@/services/tokenManager';

const API_URL = process.env.NEXT_PUBLIC_API_URL || API_BASE_URL || 'http://localhost:8000';

// Create an authenticated axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true
});

// Add token interceptor
api.interceptors.request.use(async (config) => {
  try {
    const token = await tokenManager.getValidToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add cache-busting headers for AI insights requests to ensure fresh data
    config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    config.headers['Pragma'] = 'no-cache';
    config.headers['Expires'] = '0';
    config.headers['X-Requested-At'] = Date.now().toString();
    
    return config;
  } catch (error) {
    console.error('Error getting valid token for request:', error);
    return Promise.reject(error);
  }
});

// Types for AI Insights
export interface AIInsightsRecord {
  recordingfile: string;
  has_recording: boolean;
  gcs_url?: string;
  upload_status?: string;
  status?: string;
  public_url?: string;
  original_filename?: string;
  remote_path?: string;
  transcription_id?: string;
  transcription_status?: string;
  mongodb_id?: string;
  speakers_count?: number;
  words_count?: number;
  audio_duration?: number;
  custom_topic?: string;
  two_party_sentiment?: any;
  call_completion?: {
    status: string;
    explanation: string;
  };
  topic_detection_summary?: any;
  transcription_text?: string;
  created_at?: string;
}

export interface AIInsightsSummary {
  total_records: number;
  recording_count: number;
  recording_percentage: number;
  no_recording_count: number;
  existing_files_found?: number;
  new_files_to_process?: number;
  resource_savings_percentage?: number;
  immediate_results_available?: number;
}

export interface AIInsightsResponse {
  time_period: {
    start_date: string;
    end_date: string;
    total_days: number;
  };
  summary: AIInsightsSummary;
  total_count: number;
  filtered_count: number;
  gcs_upload_enabled: boolean;
  records: AIInsightsRecord[];
  audio_processing?: {
    status: string;
    total_files: number;
    existing_files: number;
    new_files: number;
    resource_savings: string;
    message: string;
    task_id?: string;
    check_status_url?: string;
  };
}

// Agent Performance Metrics derived from AI insights data
export interface AgentPerformanceMetrics {
  callCompletionRate: number;
  averageHandleTime: number;
  agentEfficiency: number;
  customerSatisfaction: number;
  totalCallsProcessed: number;
  averageWordCount: number;
  multiSpeakerCallsPercentage: number;
  recordingSuccessRate: number;
  transcriptionAccuracy: number;
  audioQualityScore: number;
}

// Customer Voice & Sentiment Metrics
export interface CustomerVoiceSentimentMetrics {
  topicDistribution: {
    productInquiries: number;
    technicalSupport: number;
    billing: number;
    general: number;
    other: number;
  };
  sentimentBreakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
  totalAnalyzedCalls: number;
  averageSentimentScore: number;
}

export interface CustomerFeedbackExcerpt {
  id: string;
  text: string;
  timestamp: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  topic: string;
  duration: number;
  wordCount: number;
}

// SWR fetcher function using authenticated API
const fetcher = async (url: string) => {
  try {
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching AI insights data:', error);
    throw error;
  }
};

// Helper function to build the query string for AI insights
const buildAIInsightsQueryString = (
  startDate: string, 
  endDate: string, 
  uploadToGcs: boolean = true
): string => {
  const queryParams = new URLSearchParams();
  queryParams.append('start_date', startDate);
  queryParams.append('end_date', endDate);
  queryParams.append('upload_to_gcs', uploadToGcs.toString());
  queryParams.append('include_details', 'true');
  return queryParams.toString();
};

// Custom hook to fetch AI insights data
export const useAIInsights = (
  startDate: string, 
  endDate: string, 
  uploadToGcs: boolean = true
) => {
  const queryString = buildAIInsightsQueryString(startDate, endDate, uploadToGcs);
  const url = `/ai-insights/logs?${queryString}`;

  const { data, error, isLoading, mutate } = useSWR<AIInsightsResponse>(
    url,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 1000, // Reduced from 300000ms (5 minutes) to 1000ms (1 second)
      shouldRetryOnError: true,
      errorRetryCount: 3,
      revalidateIfStale: true, // Changed: Allow revalidation of stale data
      refreshInterval: 0, // Disable automatic refresh (handled manually)
      keepPreviousData: false, // Changed: Don't keep previous data, show fresh data immediately
    }
  );

  return {
    data,
    error,
    isLoading,
    mutate
  };
};

// Custom hook to fetch agent performance metrics
export const useAgentPerformanceMetrics = (
  startDate: string, 
  endDate: string
) => {
  const { data: insightsData, error, isLoading, mutate } = useAIInsights(startDate, endDate);
  
  // Calculate metrics from the insights data
  const metrics = insightsData ? aiInsightsService.calculateAgentPerformanceMetrics(insightsData) : null;

  return {
    data: metrics,
    error,
    isLoading,
    mutate
  };
};

// Custom hook to fetch customer voice & sentiment metrics
export const useCustomerVoiceSentimentMetrics = (
  startDate: string, 
  endDate: string
) => {
  const { data: insightsData, error, isLoading, mutate } = useAIInsights(startDate, endDate);
  
  // Calculate metrics from the insights data
  const metrics = insightsData ? aiInsightsService.calculateCustomerVoiceSentimentMetrics(insightsData) : null;
  const feedbackExcerpts = insightsData ? aiInsightsService.extractCustomerFeedbackExcerpts(insightsData) : [];

  return {
    data: metrics,
    feedbackExcerpts,
    error,
    isLoading,
    mutate
  };
};

// AI Insights Service (keeping static methods for calculations)
export const aiInsightsService = {
  // Calculate agent performance metrics from raw data
  calculateAgentPerformanceMetrics: (data: AIInsightsResponse): AgentPerformanceMetrics => {
    const { records, summary } = data;
    
    if (!records || records.length === 0) {
      return {
        callCompletionRate: 0,
        averageHandleTime: 0,
        agentEfficiency: 0,
        customerSatisfaction: 0,
        totalCallsProcessed: 0,
        averageWordCount: 0,
        multiSpeakerCallsPercentage: 0,
        recordingSuccessRate: 0,
        transcriptionAccuracy: 0,
        audioQualityScore: 0,
      };
    }

    // Call completion rate based on call_completion status
    const completedCalls = records.filter(record => 
      record.call_completion?.status === 'COMPLETE'
    ).length;
    const callCompletionRate = (completedCalls / records.length) * 100;

    // Average handle time from audio duration
    const durationsWithData = records.filter(record => record.audio_duration && record.audio_duration > 0);
    const totalDuration = durationsWithData.reduce((sum, record) => sum + (record.audio_duration || 0), 0);
    const averageHandleTime = durationsWithData.length > 0 ? totalDuration / durationsWithData.length / 60 : 0; // Convert to minutes

    // Agent efficiency based on call completion and transcription quality
    const transcribedCalls = records.filter(record => record.transcription_text && record.transcription_text.length > 0).length;
    const agentEfficiency = transcribedCalls > 0 ? Math.min(95, (transcribedCalls / records.length) * 100) : 0;

    // Customer satisfaction estimated from call completion and multi-speaker interactions
    const multiSpeakerCalls = records.filter(record => record.speakers_count && record.speakers_count > 1).length;
    const customerSatisfaction = completedCalls > 0 ? Math.min(5, 3.5 + (multiSpeakerCalls / completedCalls) * 1.5) : 0;

    // Average word count
    const wordsWithData = records.filter(record => record.words_count && record.words_count > 0);
    const totalWords = wordsWithData.reduce((sum, record) => sum + (record.words_count || 0), 0);
    const averageWordCount = wordsWithData.length > 0 ? totalWords / wordsWithData.length : 0;

    // Multi-speaker calls percentage
    const multiSpeakerCallsPercentage = (multiSpeakerCalls / records.length) * 100;

    // Recording success rate
    const recordingSuccessRate = summary.recording_percentage || 0;

    // Transcription accuracy (estimated based on word count vs duration ratio)
    const transcriptionAccuracy = transcribedCalls > 0 ? Math.min(98, 85 + (averageWordCount / averageHandleTime) * 0.1) : 0;

    // Audio quality score (estimated from successful processing)
    const audioQualityScore = summary.recording_percentage > 0 ? Math.min(95, 80 + (recordingSuccessRate / 100) * 15) : 0;

    return {
      callCompletionRate: Math.round(callCompletionRate * 100) / 100,
      averageHandleTime: Math.round(averageHandleTime * 100) / 100,
      agentEfficiency: Math.round(agentEfficiency * 100) / 100,
      customerSatisfaction: Math.round(customerSatisfaction * 100) / 100,
      totalCallsProcessed: records.length,
      averageWordCount: Math.round(averageWordCount),
      multiSpeakerCallsPercentage: Math.round(multiSpeakerCallsPercentage * 100) / 100,
      recordingSuccessRate: Math.round(recordingSuccessRate * 100) / 100,
      transcriptionAccuracy: Math.round(transcriptionAccuracy * 100) / 100,
      audioQualityScore: Math.round(audioQualityScore * 100) / 100,
    };
  },

  // Calculate customer voice & sentiment metrics from raw data
  calculateCustomerVoiceSentimentMetrics: (data: AIInsightsResponse): CustomerVoiceSentimentMetrics => {
    const { records } = data;
    
    if (!records || records.length === 0) {
      return {
        topicDistribution: {
          productInquiries: 0,
          technicalSupport: 0,
          billing: 0,
          general: 0,
          other: 0,
        },
        sentimentBreakdown: {
          positive: 0,
          neutral: 0,
          negative: 0,
        },
        totalAnalyzedCalls: 0,
        averageSentimentScore: 0,
      };
    }

    // Filter records with topic or sentiment data
    const analyzedRecords = records.filter(record => 
      record.custom_topic || record.two_party_sentiment || record.topic_detection_summary || 
      (record as any).sentiment_analysis || (record as any).lemur_analysis
    );

    // Topic distribution analysis
    const topicCounts = {
      productInquiries: 0,
      technicalSupport: 0,
      billing: 0,
      general: 0,
      other: 0,
    };

    // Sentiment analysis
    const sentimentCounts = {
      positive: 0,
      neutral: 0,
      negative: 0,
    };

    let totalSentimentScore = 0;
    let sentimentRecordsCount = 0;

    analyzedRecords.forEach(record => {
      // Analyze topics using the new structure
      const customTopic = record.custom_topic?.toLowerCase() || '';
      const lemurTopic = (record as any).lemur_analysis?.custom_topic?.toLowerCase() || '';
      const topic = customTopic || lemurTopic;
      const topicSummary = record.topic_detection_summary?.toString().toLowerCase() || '';
      
      if (topic.includes('product') || topic.includes('feature') || topicSummary.includes('product')) {
        topicCounts.productInquiries++;
      } else if (topic.includes('technical') || topic.includes('support') || topic.includes('issue') || topicSummary.includes('technical')) {
        topicCounts.technicalSupport++;
      } else if (topic.includes('billing') || topic.includes('payment') || topic.includes('invoice') || topic.includes('account') || topicSummary.includes('billing')) {
        topicCounts.billing++;
      } else if (topic.includes('general') || topic.includes('info') || topicSummary.includes('general')) {
        topicCounts.general++;
      } else {
        topicCounts.other++;
      }

      // Analyze sentiment using the new rich data structure
      let sentimentProcessed = false;
      
      // First, try to use the new sentiment_analysis array
      const sentimentAnalysis = (record as any).sentiment_analysis;
      if (sentimentAnalysis && Array.isArray(sentimentAnalysis)) {
        let positiveCount = 0;
        let neutralCount = 0;
        let negativeCount = 0;
        
        sentimentAnalysis.forEach((item: any) => {
          if (item.sentiment === 'POSITIVE') {
            positiveCount++;
          } else if (item.sentiment === 'NEGATIVE') {
            negativeCount++;
          } else {
            neutralCount++;
          }
        });
        
        // Determine overall sentiment based on majority
        if (positiveCount > neutralCount && positiveCount > negativeCount) {
          sentimentCounts.positive++;
          totalSentimentScore += 0.8;
        } else if (negativeCount > positiveCount && negativeCount > neutralCount) {
          sentimentCounts.negative++;
          totalSentimentScore += 0.2;
        } else {
          sentimentCounts.neutral++;
          totalSentimentScore += 0.5;
        }
        sentimentRecordsCount++;
        sentimentProcessed = true;
      }
      
      // If no sentiment_analysis array, try lemur_analysis sentiment
      if (!sentimentProcessed && (record as any).lemur_analysis?.sentiment_analysis) {
        const lemurSentiment = (record as any).lemur_analysis.sentiment_analysis;
        if (lemurSentiment.customer_sentiment === 'POSITIVE') {
          sentimentCounts.positive++;
          totalSentimentScore += 0.8;
        } else if (lemurSentiment.customer_sentiment === 'NEGATIVE') {
          sentimentCounts.negative++;
          totalSentimentScore += 0.2;
        } else {
          sentimentCounts.neutral++;
          totalSentimentScore += 0.5;
        }
        sentimentRecordsCount++;
        sentimentProcessed = true;
      }
      
      // Fallback to two_party_sentiment (old structure)
      if (!sentimentProcessed && record.two_party_sentiment) {
        const sentiment = record.two_party_sentiment;
        
        // Handle different sentiment data structures
        if (typeof sentiment === 'object') {
          // Check for customer_sentiment field first
          if (sentiment.customer_sentiment) {
            if (sentiment.customer_sentiment.toLowerCase().includes('positive')) {
              sentimentCounts.positive++;
              totalSentimentScore += 0.8;
            } else if (sentiment.customer_sentiment.toLowerCase().includes('negative')) {
              sentimentCounts.negative++;
              totalSentimentScore += 0.2;
            } else {
              sentimentCounts.neutral++;
              totalSentimentScore += 0.5;
            }
          } else {
            // Look for sentiment indicators in the object
            const sentimentStr = JSON.stringify(sentiment).toLowerCase();
            if (sentimentStr.includes('positive') || sentimentStr.includes('satisfied') || sentimentStr.includes('happy')) {
              sentimentCounts.positive++;
              totalSentimentScore += 0.8;
            } else if (sentimentStr.includes('negative') || sentimentStr.includes('frustrated') || sentimentStr.includes('angry')) {
              sentimentCounts.negative++;
              totalSentimentScore += 0.2;
            } else {
              sentimentCounts.neutral++;
              totalSentimentScore += 0.5;
            }
          }
        } else if (typeof sentiment === 'string') {
          const sentimentStr = sentiment.toLowerCase();
          if (sentimentStr.includes('positive') || sentimentStr.includes('satisfied')) {
            sentimentCounts.positive++;
            totalSentimentScore += 0.8;
          } else if (sentimentStr.includes('negative') || sentimentStr.includes('frustrated')) {
            sentimentCounts.negative++;
            totalSentimentScore += 0.2;
          } else {
            sentimentCounts.neutral++;
            totalSentimentScore += 0.5;
          }
        }
        sentimentRecordsCount++;
      }
    });

    // Convert counts to percentages
    const totalTopics = Object.values(topicCounts).reduce((sum, count) => sum + count, 0);
    const totalSentiments = Object.values(sentimentCounts).reduce((sum, count) => sum + count, 0);

    const topicDistribution = {
      productInquiries: totalTopics > 0 ? (topicCounts.productInquiries / totalTopics) * 100 : 0,
      technicalSupport: totalTopics > 0 ? (topicCounts.technicalSupport / totalTopics) * 100 : 0,
      billing: totalTopics > 0 ? (topicCounts.billing / totalTopics) * 100 : 0,
      general: totalTopics > 0 ? (topicCounts.general / totalTopics) * 100 : 0,
      other: totalTopics > 0 ? (topicCounts.other / totalTopics) * 100 : 0,
    };

    const sentimentBreakdown = {
      positive: totalSentiments > 0 ? (sentimentCounts.positive / totalSentiments) * 100 : 0,
      neutral: totalSentiments > 0 ? (sentimentCounts.neutral / totalSentiments) * 100 : 0,
      negative: totalSentiments > 0 ? (sentimentCounts.negative / totalSentiments) * 100 : 0,
    };

    const averageSentimentScore = sentimentRecordsCount > 0 ? totalSentimentScore / sentimentRecordsCount : 0;

    return {
      topicDistribution: {
        productInquiries: Math.round(topicDistribution.productInquiries * 100) / 100,
        technicalSupport: Math.round(topicDistribution.technicalSupport * 100) / 100,
        billing: Math.round(topicDistribution.billing * 100) / 100,
        general: Math.round(topicDistribution.general * 100) / 100,
        other: Math.round(topicDistribution.other * 100) / 100,
      },
      sentimentBreakdown: {
        positive: Math.round(sentimentBreakdown.positive * 100) / 100,
        neutral: Math.round(sentimentBreakdown.neutral * 100) / 100,
        negative: Math.round(sentimentBreakdown.negative * 100) / 100,
      },
      totalAnalyzedCalls: analyzedRecords.length,
      averageSentimentScore: Math.round(averageSentimentScore * 1000) / 1000,
    };
  },

  // Extract customer feedback excerpts from transcriptions
  extractCustomerFeedbackExcerpts: (data: AIInsightsResponse): CustomerFeedbackExcerpt[] => {
    const { records } = data;
    
    if (!records || records.length === 0) {
      return [];
    }

    const excerpts: CustomerFeedbackExcerpt[] = [];

    records
      .filter(record => record.transcription_text && record.transcription_text.length > 50)
      .slice(0, 10) // Limit to 10 excerpts
      .forEach((record, index) => {
        const text = record.transcription_text || '';
        
        // Extract meaningful excerpts (first 200 characters)
        const excerpt = text.length > 200 ? text.substring(0, 200) + '...' : text;
        
        // Determine sentiment
        let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
        if (record.two_party_sentiment) {
          const sentimentStr = JSON.stringify(record.two_party_sentiment).toLowerCase();
          if (sentimentStr.includes('positive') || sentimentStr.includes('satisfied')) {
            sentiment = 'positive';
          } else if (sentimentStr.includes('negative') || sentimentStr.includes('frustrated')) {
            sentiment = 'negative';
          }
        }

        // Determine topic
        let topic = 'General';
        if (record.custom_topic) {
          topic = record.custom_topic;
        } else {
          const topicStr = (record.topic_detection_summary?.toString() || '').toLowerCase();
          if (topicStr.includes('product')) topic = 'Product Inquiry';
          else if (topicStr.includes('technical')) topic = 'Technical Support';
          else if (topicStr.includes('billing')) topic = 'Billing';
        }

        excerpts.push({
          id: record.recordingfile || `excerpt-${index}`,
          text: excerpt,
          timestamp: record.created_at || new Date().toISOString(),
          sentiment,
          topic,
          duration: record.audio_duration || 0,
          wordCount: record.words_count || 0,
        });
      });

    return excerpts;
  },
};

// Format duration from seconds to minutes for display
export const formatDurationMinutes = (seconds: number): string => {
  const minutes = Math.round(seconds / 60 * 10) / 10;
  return `${minutes} min`;
};
