'use client';

import { 
  ArrowUp, 
  ArrowDown,
  Mic,
  FileText
} from 'lucide-react';
import { useMemo } from 'react';

interface RecordingMetricsCardProps {
  recordingPercentage?: number;
  totalCalls?: number;
  recordedCalls?: number;
  previousRecordingPercentage?: number;
  isLoading?: boolean;
  period?: string;
}

const safeFormat = (value: any, precision: number = 1): string => {
  const numValue = typeof value === 'number' ? value : parseFloat(value || '0');
  return isNaN(numValue) ? '0.0' : numValue.toFixed(precision);
};

export default function RecordingMetricsCard({
  recordingPercentage = 0,
  totalCalls = 0,
  recordedCalls = 0,
  previousRecordingPercentage,
  isLoading = false,
  period = 'this period'
}: RecordingMetricsCardProps) {
  
  const trendData = useMemo(() => {
    if (previousRecordingPercentage === undefined) return null;
    
    const diff = recordingPercentage - previousRecordingPercentage;
    const isPositive = diff >= 0;
    
    return {
      percentage: Math.abs(diff).toFixed(1),
      isPositive,
      indicator: isPositive ? <ArrowUp className="w-4 h-4 text-green-500" /> : <ArrowDown className="w-4 h-4 text-red-500" />,
      color: isPositive ? 'text-green-500' : 'text-red-500'
    };
  }, [recordingPercentage, previousRecordingPercentage]);
  
  if (isLoading) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm animate-pulse">
        <div className="flex items-center justify-between">
          <div className="w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
        </div>
        <div className="mt-4 w-20 h-8 bg-gray-300 dark:bg-gray-600 rounded"></div>
        <div className="mt-2 w-32 h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    );
  }
  
  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Recording Rate</h3>
        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full">
          <Mic className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        </div>
      </div>
      
      <div className="mt-4 flex items-end">
        <p className="text-2xl font-semibold text-gray-800 dark:text-white">
          {safeFormat(recordingPercentage)}%
        </p>
        
        {trendData && (
          <div className={`ml-2 flex items-center text-xs ${trendData.color}`}>
            {trendData.indicator}
            <span>{trendData.percentage}%</span>
          </div>
        )}
      </div>
      
      <div className="mt-2 flex items-center space-x-2">
        <div className="flex items-center">
          <FileText className="w-4 h-4 text-gray-400 mr-1" />
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {recordedCalls.toLocaleString()} / {totalCalls.toLocaleString()} calls
          </span>
        </div>
      </div>
      
      <div className="mt-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div 
          className="bg-purple-600 h-2 rounded-full" 
          style={{ width: `${Math.min(recordingPercentage, 100)}%` }}
        />
      </div>
      
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        {safeFormat(recordingPercentage)}% of calls recorded {period}
      </p>
    </div>
  );
} 