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
    agent?: string;
  };
  summary: {
    total_callers: number;
    total_calls: number;
    total_duration: number;
    avg_calls_per_caller: number;
    // Agent analytics fields
    total_agents?: number;
    avg_calls_per_agent?: number;
    avg_handle_time?: number;
    avg_resolution_rate?: number;
    avg_answer_rate?: number;
    avg_handling_time?: number;
    team_averages?: {
      answer_rate: number;
      call_duration: number;
      recording_rate: number;
      calls_per_day: number;
    }
  };
  top_callers: CallerData[];
  top_callers_by_frequency: CallerData[];
  top_callers_by_duration: CallerData[];
  top_callers_by_avg_duration: CallerData[];
  // Agent analytics fields
  agents?: Array<{
    agent: string;
    agent_cnam: string;
    call_count: number;
    answered_calls: number;
    no_answer_calls: number;
    busy_calls: number;
    failed_calls: number;
    total_duration: number;
    total_billsec: number;
    outbound_calls: number;
    inbound_calls: number;
    internal_calls: number;
    recording_count: number;
    unique_destination_count: number;
    answer_rate: number;
    recording_rate: number;
    avg_duration: number;
    avg_billsec: number;
    efficiency_score: number;
    performance_level: string;
    calls_per_day: number;
  }>;
  disposition_data?: Array<{
    agent: string;
    agent_cnam: string;
    ANSWERED: number;
    NO_ANSWER: number;
    BUSY: number;
    FAILED: number;
    total: number;
  }>;
  direction_data?: Array<{
    agent: string;
    agent_cnam: string;
    OUTBOUND: number;
    INBOUND: number;
    INTERNAL: number;
    total: number;
  }>;
  gauge_metrics?: {
    answer_rate: Array<{
      agent: string;
      agent_cnam: string;
      value: number;
      vs_team: number;
    }>;
    efficiency_score: Array<{
      agent: string;
      agent_cnam: string;
      value: number;
      level: string;
    }>;
    calls_per_day: Array<{
      agent: string;
      agent_cnam: string;
      value: number;
      vs_team: number;
    }>;
  };
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
    queryParams.append('direction', filters.direction.toUpperCase());
  }
  
  if (filters.disposition !== 'all') {
    // Ensure disposition is uppercase to match API expectations
    queryParams.append('disposition', filters.disposition.toUpperCase());
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
export const useAnalyticsData = (filters: AnalyticsFilters, type: 'caller' | 'agent' = 'caller') => {
  const queryString = buildQueryString(filters);
  const endpoint = type === 'agent' ? 'agent-performance' : 'caller-analysis';
  const url = `/call-records/${endpoint}?${queryString}`;

  const { data, error, isLoading, mutate } = useSWR<AnalyticsResponse>(
    url,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000, // 5 minutes instead of 1 minute
      shouldRetryOnError: true,
      errorRetryCount: 3,
      revalidateIfStale: false,
      revalidateOnReconnect: true,
      keepPreviousData: true // Important: keep showing previous data while fetching new data
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