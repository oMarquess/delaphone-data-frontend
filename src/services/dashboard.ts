import axios from 'axios';
import { API_BASE_URL, STORAGE_KEYS } from '@/config/constants';

// Create an axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true
});

// Intercept requests to add auth token
api.interceptors.request.use((config) => {
  // Try localStorage first, then sessionStorage
  const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) || 
                sessionStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Intercept responses to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle unauthorized errors (token expired, invalid, etc.)
    if (error.response && error.response.status === 401) {
      // Clear auth data from storage as it's no longer valid
      localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER_DATA);
      sessionStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      sessionStorage.removeItem(STORAGE_KEYS.USER_DATA);
      
      // The component will handle redirecting to login
    }
    return Promise.reject(error);
  }
);

// Types
export interface TimePeriod {
  start_date: string;
  end_date: string;
  total_days: number;
}

export interface CallSummary {
  total_calls: number;
  answered_calls: number;
  no_answer_calls: number;
  busy_calls: number;
  failed_calls: number;
  avg_duration: number;
  avg_billsec: number;
  answer_rate: number;
  total_inbound: number;
  total_outbound: number;
  total_internal: number;
  recording_percentage: number;
  unique_numbers: number;
}

export interface DailyDistribution {
  date: string;
  total: number;
  answered: number;
  no_answer: number;
  busy: number;
  failed: number;
}

export interface HourlyDistribution {
  hour: number;
  total: number;
  inbound: number;
  outbound: number;
  internal: number;
}

export interface DispositionDistribution {
  disposition: string;
  count: number;
  percentage: number;
}

export interface DirectionDistribution {
  direction: string;
  count: number;
  percentage: number;
}

export interface CallQualityMetrics {
  answeredCalls: number;
  noAnswerCalls: number;
  busyCalls: number;
  failedCalls: number;
  totalCalls: number;
  answerRate: number;
}

export interface RecordingMetrics {
  recordingPercentage: number;
  totalCalls: number;
  recordedCalls: number;
}

export interface DashboardMetrics {
  time_period: TimePeriod;
  summary: {
    total_calls: number;
    answered_calls: number;
    no_answer_calls: number;
    busy_calls: number;
    failed_calls: number;
    avg_duration: number;
    avg_billsec: number;
    answer_rate: number;
    total_inbound: number;
    total_outbound: number;
    total_internal: number;
    recording_percentage: number;
  };
  records?: any[];
  daily_distribution?: DailyDistribution[];
  hourly_distribution?: HourlyDistribution[];
  disposition_distribution?: DispositionDistribution[];
  direction_distribution?: DirectionDistribution[];
}

// Helper function to format seconds to minutes and seconds
export const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = (seconds % 60).toFixed(1);
  
  return `${minutes}m ${remainingSeconds}s`;
};

// Dashboard Service
export const dashboardService = {
  // Get dashboard metrics
  getDashboardMetrics: async (startDate: string, endDate: string): Promise<DashboardMetrics> => {
    try {
      // The API endpoint is likely just /call-records with date filters
      const response = await api.get('/call-records', {
        params: {
          start_date: startDate,
          end_date: endDate,
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      throw error;
    }
  },
  
  // Get call records
  getCallRecords: async (startDate: string, endDate: string, limit: number = 100): Promise<any> => {
    try {
      const response = await api.get('/call-records', {
        params: {
          start_date: startDate,
          end_date: endDate,
          limit
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching call records:', error);
      throw error;
    }
  },
  
  // Get call metrics
  getCallMetrics: async (startDate: string, endDate: string, disposition?: string): Promise<any> => {
    try {
      const response = await api.get('/call-records/metrics', {
        params: {
          start_date: startDate,
          end_date: endDate,
          disposition,
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching call metrics:', error);
      throw error;
    }
  },
  
  // Get direction analysis
  getDirectionAnalysis: async (startDate: string, endDate: string): Promise<any> => {
    try {
      const response = await api.get('/call-records/direction-analysis', {
        params: {
          start_date: startDate,
          end_date: endDate,
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching direction analysis:', error);
      throw error;
    }
  },
  
  // Get caller insights
  getCallerInsights: async (startDate: string, endDate: string, minCalls: number = 1): Promise<any> => {
    try {
      const response = await api.get('/call-records/caller-insights', {
        params: {
          start_date: startDate,
          end_date: endDate,
          min_calls: minCalls,
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching caller insights:', error);
      throw error;
    }
  },
};

/**
 * Processes raw call data to extract direction distribution metrics
 */
export function extractDirectionDistribution(data: any): DirectionDistribution[] {
  try {
    if (!data || !data.summary) {
      return [];
    }

    const { total_inbound, total_outbound, total_internal, total_calls } = data.summary;
    
    const metrics = [
      {
        direction: 'inbound',
        count: total_inbound || 0,
        percentage: total_calls ? (total_inbound / total_calls) * 100 : 0
      },
      {
        direction: 'outbound',
        count: total_outbound || 0,
        percentage: total_calls ? (total_outbound / total_calls) * 100 : 0
      },
      {
        direction: 'internal',
        count: total_internal || 0,
        percentage: total_calls ? (total_internal / total_calls) * 100 : 0
      }
    ];
    
    return metrics;
  } catch (error) {
    console.error('Error extracting direction distribution:', error);
    return [];
  }
}

/**
 * Processes raw call data to extract call quality metrics
 */
export function extractCallQualityMetrics(data: any): CallQualityMetrics {
  try {
    if (!data || !data.summary) {
      return {
        answeredCalls: 0,
        noAnswerCalls: 0,
        busyCalls: 0,
        failedCalls: 0,
        totalCalls: 0,
        answerRate: 0
      };
    }

    const { 
      total_calls, 
      answered_calls, 
      no_answer_calls, 
      busy_calls, 
      failed_calls,
      answer_rate
    } = data.summary;
    
    return {
      answeredCalls: answered_calls || 0,
      noAnswerCalls: no_answer_calls || 0,
      busyCalls: busy_calls || 0,
      failedCalls: failed_calls || 0,
      totalCalls: total_calls || 0,
      answerRate: answer_rate || 0
    };
  } catch (error) {
    console.error('Error extracting call quality metrics:', error);
    return {
      answeredCalls: 0,
      noAnswerCalls: 0,
      busyCalls: 0,
      failedCalls: 0,
      totalCalls: 0,
      answerRate: 0
    };
  }
}

/**
 * Processes raw call data to extract recording metrics
 */
export function extractRecordingMetrics(data: any): RecordingMetrics {
  try {
    if (!data || !data.summary) {
      return {
        recordingPercentage: 0,
        totalCalls: 0,
        recordedCalls: 0
      };
    }

    const { total_calls, recording_percentage } = data.summary;
    
    const recordedCalls = Math.round((recording_percentage / 100) * total_calls);
    
    return {
      recordingPercentage: recording_percentage || 0,
      totalCalls: total_calls || 0,
      recordedCalls: recordedCalls || 0
    };
  } catch (error) {
    console.error('Error extracting recording metrics:', error);
    return {
      recordingPercentage: 0,
      totalCalls: 0,
      recordedCalls: 0
    };
  }
}

/**
 * Processes raw call data to get duration metrics
 */
export function extractDurationMetrics(data: any): { avgDuration: number; avgBillsec: number } {
  try {
    if (!data || !data.summary) {
      return { avgDuration: 0, avgBillsec: 0 };
    }

    return {
      avgDuration: data.summary.avg_duration || 0,
      avgBillsec: data.summary.avg_billsec || 0
    };
  } catch (error) {
    console.error('Error extracting duration metrics:', error);
    return { avgDuration: 0, avgBillsec: 0 };
  }
} 