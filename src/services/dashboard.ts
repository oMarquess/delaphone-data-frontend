import axios from 'axios';
import { API_BASE_URL, STORAGE_KEYS, API } from '@/config/constants';
import tokenManager from '@/services/tokenManager';

// Create an axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true
});

// Intercept requests to add auth token
api.interceptors.request.use(async (config) => {
  try {
    // Get a valid token (this will auto-refresh if needed)
    const token = await tokenManager.getValidToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  } catch (error) {
    console.error('Error getting valid token for request:', error);
    return Promise.reject(error);
  }
}, (error) => {
  return Promise.reject(error);
});

// Intercept responses to handle auth errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only attempt refresh if we have a token and it's a 401 error
    if (error.response?.status === 401 && !originalRequest._retry && tokenManager.getAccessToken()) {
      originalRequest._retry = true;

      try {
        // Get new tokens
        const tokens = await tokenManager.refreshTokens();
        
        // Update the failed request's authorization header
        originalRequest.headers.Authorization = `Bearer ${tokens.access_token}`;
        
        // Retry the original request
        return axios(originalRequest);
      } catch (refreshError) {
        // If refresh fails, clear tokens and handle logout
        console.error('Token refresh failed:', refreshError);
        tokenManager.clearTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
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
  unknown: number;
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
  
  // Get call logs with filtering
  getCallLogs: async (
    startDate: string, 
    endDate: string, 
    filters: {
      callDirection?: string,
      callStatus?: string,
      hasRecording?: string, 
      sourceNumber?: string,
      destinationNumber?: string,
      minDuration?: string,
      maxDuration?: string,
      did?: string,
      extension?: string,
      callerName?: string,
      queue?: string,
      uniqueCallersOnly?: boolean,
      limit?: string,
      sortBy?: string,
      sortOrder?: string,
      page?: number
    }
  ): Promise<any> => {
    try {
      // Map frontend filter names to API parameter names
      const params: Record<string, any> = {
        start_date: startDate,
        end_date: endDate,
      };
      
      // Only add parameters that have values
      if (filters.callDirection && filters.callDirection !== 'all') params.direction = filters.callDirection;
      if (filters.callStatus && filters.callStatus !== 'all') params.disposition = filters.callStatus;
      if (filters.hasRecording === 'yes') params.has_recording = true;
      if (filters.hasRecording === 'no') params.has_recording = false;
      if (filters.sourceNumber) params.src = filters.sourceNumber;
      if (filters.destinationNumber) params.dst = filters.destinationNumber;
      if (filters.minDuration) params.min_duration = filters.minDuration;
      if (filters.maxDuration) params.max_duration = filters.maxDuration;
      if (filters.did) params.did = filters.did;
      if (filters.extension) params.extension = filters.extension;
      if (filters.callerName) params.cnam = filters.callerName;
      if (filters.queue) params.queue = filters.queue;
      if (filters.uniqueCallersOnly) params.unique_callers_only = filters.uniqueCallersOnly;
      if (filters.limit) params.limit = filters.limit;
      if (filters.sortBy) params.sort_by = filters.sortBy;
      if (filters.sortOrder) params.sort_order = filters.sortOrder;
      
      // Add pagination
      if (filters.page && filters.page > 0) {
        params.offset = filters.page > 1 ? (filters.page - 1) * (parseInt(filters.limit || '100')) : 0;
      }
      
      const response = await api.get('/call-records/logs', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching call logs:', error);
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