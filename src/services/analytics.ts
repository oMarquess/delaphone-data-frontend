import useSWR from 'swr';
import axios from 'axios';
import { AnalyticsFilters } from '@/components/analytics/AnalyticsFilterBar';
import tokenManager from '@/services/tokenManager';
import { API_BASE_URL, API } from '@/config/constants';

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
    return config;
  } catch (error) {
    console.error('Error getting valid token for request:', error);
    return Promise.reject(error);
  }
});

// Types for API response
export interface CallerData {
  number: string;
  call_count: number;
  total_duration: number;
  answered_calls: number;
  first_call: string;
  last_call: string;
  has_recording: number;
  direction: string;
  avg_duration: number;
  answer_rate: number;
  recording_rate: number;
}

export interface AnalyticsResponse {
  time_period: {
    start_date: string;
    end_date: string;
    total_days: number;
  };
  filters: {
    direction: string;
    min_calls: number;
    disposition: string;
  };
  summary: {
    total_callers: number;
    total_calls: number;
    total_duration: number;
    avg_calls_per_caller: number;
  };
  top_callers: CallerData[];
  top_callers_by_frequency: CallerData[];
  top_callers_by_duration: CallerData[];
  top_callers_by_avg_duration: CallerData[];
}

// Helper function to build the query string
const buildQueryString = (filters: AnalyticsFilters): string => {
  const queryParams = new URLSearchParams();

  // Add all filter parameters
  queryParams.append('start_date', filters.startDate);
  queryParams.append('end_date', filters.endDate);
  queryParams.append('min_calls', filters.minCalls.toString());
  queryParams.append('sort_by', filters.sortBy);
  queryParams.append('limit', filters.limit.toString());
  
  // Only add direction and disposition if they're not 'all'
  if (filters.direction !== 'all') {
    queryParams.append('direction', filters.direction);
  }
  
  if (filters.disposition !== 'all') {
    queryParams.append('disposition', filters.disposition);
  }

  return queryParams.toString();
};

// SWR fetcher function using authenticated API
const fetcher = async (url: string) => {
  try {
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    // Handle auth errors - if token is invalid, this will trigger a refresh via the interceptor
    console.error('Error fetching analytics data:', error);
    throw error;
  }
};

// Custom hook to fetch analytics data
export const useAnalyticsData = (filters: AnalyticsFilters) => {
  const queryString = buildQueryString(filters);
  const url = `/call-records/caller-analysis?${queryString}`;

  const { data, error, isLoading, mutate } = useSWR<AnalyticsResponse>(
    url,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 minute
      shouldRetryOnError: true,
      errorRetryCount: 3
    }
  );

  return {
    data,
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
};

// Format duration from seconds to minutes
export const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  return `${minutes} min`;
}; 