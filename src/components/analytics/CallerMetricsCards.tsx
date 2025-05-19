'use client';

import { useMemo } from 'react';
import { 
  PhoneIcon, 
  ClockIcon, 
  CheckCircleIcon, 
  MicIcon, 
  TrendingUpIcon 
} from 'lucide-react';

interface Caller {
  number: string;
  call_count: number;
  total_duration: number;
  avg_duration: number;
  answered_calls: number;
  answer_rate: number;
  recording_rate: number;
  has_recording: number;
}

interface CallerMetricsCardsProps {
  callers?: Caller[];
  isLoading?: boolean;
}

export default function CallerMetricsCards({
  callers = [],
  isLoading = false,
}: CallerMetricsCardsProps) {
  const topPerformers = useMemo(() => {
    try {
      if (!callers || callers.length === 0) return null;
      
      // Calculate the total calls and average calls per caller
      const totalCalls = callers.reduce((sum, caller) => sum + caller.call_count, 0);
      const averageCalls = totalCalls / callers.length;
      
      return {
        mostActive: callers.reduce((prev, current) => 
          prev.call_count > current.call_count ? prev : current),
        
        longestCalls: callers.reduce((prev, current) => 
          prev.total_duration > current.total_duration ? prev : current),
        
        highestAvgDuration: callers.reduce((prev, current) => 
          prev.avg_duration > current.avg_duration ? prev : current),
        
        bestRecordingRate: callers.reduce((prev, current) => 
          prev.recording_rate > current.recording_rate ? prev : current),
        
        bestAnswerRate: callers.reduce((prev, current) => 
          prev.answer_rate > current.answer_rate ? prev : current),
        
        // Add these to the returned object
        totalCalls,
        averageCalls
      };
    } catch (error) {
      console.error('Error calculating top performer metrics:', error);
      return null;
    }
  }, [callers]);
  
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm animate-pulse border border-gray-200 dark:border-gray-700 h-40">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
          </div>
        ))}
      </div>
    );
  }
  
  if (!topPerformers) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <p className="text-gray-500 dark:text-gray-400 text-center">No caller data available</p>
      </div>
    );
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };
  
  const metricsConfig = [
    {
      title: "Most Active Caller",
      caller: topPerformers.mostActive,
      metric: `${topPerformers.mostActive.call_count} ${topPerformers.mostActive.call_count === 1 ? 'call' : 'calls'}`,
      icon: <PhoneIcon className="h-6 w-6 text-blue-500" />,
      color: "blue",
      description: topPerformers.averageCalls ? 
        `${(topPerformers.mostActive.call_count / topPerformers.averageCalls).toFixed(1)} ${
          (topPerformers.mostActive.call_count / topPerformers.averageCalls) === 1 ? 'time' : 'times'
        } the average` : 
        'Highest call volume'
    },
    {
      title: "Longest Total Duration",
      caller: topPerformers.longestCalls,
      metric: formatDuration(topPerformers.longestCalls.total_duration),
      icon: <ClockIcon className="h-6 w-6 text-purple-500" />,
      color: "purple",
      description: `${topPerformers.longestCalls.call_count} ${topPerformers.longestCalls.call_count === 1 ? 'call' : 'calls'} total`
    },
    {
      title: "Longest Avg Duration",
      caller: topPerformers.highestAvgDuration,
      metric: formatDuration(topPerformers.highestAvgDuration.avg_duration),
      icon: <TrendingUpIcon className="h-6 w-6 text-green-500" />,
      color: "green",
      description: `${topPerformers.highestAvgDuration.call_count} ${topPerformers.highestAvgDuration.call_count === 1 ? 'call' : 'calls'} analyzed`
    },
    {
      title: "Best Recording Rate",
      caller: topPerformers.bestRecordingRate,
      metric: `${topPerformers.bestRecordingRate.recording_rate.toFixed(1)}%`,
      icon: <MicIcon className="h-6 w-6 text-amber-500" />,
      color: "amber",
      description: `${topPerformers.bestRecordingRate.has_recording} ${topPerformers.bestRecordingRate.has_recording === 1 ? 'recording' : 'recordings'}`
    },
    {
      title: "Best Answer Rate",
      caller: topPerformers.bestAnswerRate,
      metric: `${topPerformers.bestAnswerRate.answer_rate.toFixed(1)}%`,
      icon: <CheckCircleIcon className="h-6 w-6 text-emerald-500" />,
      color: "emerald",
      description: `${topPerformers.bestAnswerRate.answered_calls} ${topPerformers.bestAnswerRate.answered_calls === 1 ? 'answered call' : 'answered calls'}`
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {metricsConfig.map((config, index) => {
        const colorMap: Record<string, { bg: string, border: string, text: string }> = {
          'blue': {
            bg: 'bg-blue-50 dark:bg-blue-900/20',
            border: 'border-blue-200 dark:border-blue-800',
            text: 'text-blue-700 dark:text-blue-400'
          },
          'purple': {
            bg: 'bg-purple-50 dark:bg-purple-900/20',
            border: 'border-purple-200 dark:border-purple-800',
            text: 'text-purple-700 dark:text-purple-400'
          },
          'green': {
            bg: 'bg-green-50 dark:bg-green-900/20',
            border: 'border-green-200 dark:border-green-800',
            text: 'text-green-700 dark:text-green-400'
          },
          'amber': {
            bg: 'bg-amber-50 dark:bg-amber-900/20',
            border: 'border-amber-200 dark:border-amber-800',
            text: 'text-amber-700 dark:text-amber-400'
          },
          'emerald': {
            bg: 'bg-emerald-50 dark:bg-emerald-900/20',
            border: 'border-emerald-200 dark:border-emerald-800',
            text: 'text-emerald-700 dark:text-emerald-400'
          }
        };
        
        const { bg, border, text } = colorMap[config.color];
        
        return (
          <div 
            key={index}
            className={`${bg} p-4 rounded-lg shadow-sm ${border} relative overflow-hidden`}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className={`font-medium ${text}`}>{config.title}</h3>
                <div className="text-xl font-bold text-gray-800 dark:text-gray-100">
                  {config.metric}
                </div>
              </div>
              <div className="p-2 rounded-full bg-white dark:bg-gray-800 shadow-sm">
                {config.icon}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-medium text-gray-500 dark:text-gray-400">
                Caller {config.caller.number}
              </span>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {config.description}
            </div>
          </div>
        );
      })}
    </div>
  );
} 