'use client';

import { 
  Phone, 
  PhoneOff, 
  Signal,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { useMemo } from 'react';

interface CallQualityStatusCardProps {
  answeredCalls?: number;
  noAnswerCalls?: number;
  busyCalls?: number;
  failedCalls?: number;
  totalCalls?: number;
  answerRate?: number;
  isLoading?: boolean;
}

// Helper to safely format a numeric value with fixed precision
const safeFormat = (value: any, precision: number = 1): string => {
  // Ensure we have a numeric value
  const numValue = typeof value === 'number' ? value : parseFloat(value || '0');
  // Check if it's a valid number
  return isNaN(numValue) ? '0.0' : numValue.toFixed(precision);
};

export default function CallQualityStatusCard({
  answeredCalls = 0,
  noAnswerCalls = 0,
  busyCalls = 0,
  failedCalls = 0,
  totalCalls = 0,
  answerRate = 0,
  isLoading = false
}: CallQualityStatusCardProps) {
  
  const statusMetrics = useMemo(() => {
    const calculatePercentage = (value: number) => {
      if (!totalCalls) return 0;
      return (value / totalCalls) * 100;
    };
    
    return [
      {
        label: 'Answered',
        value: answeredCalls,
        percentage: calculatePercentage(answeredCalls),
        icon: <Phone className="w-4 h-4 text-green-500" />,
        color: 'bg-green-500',
        textColor: 'text-green-500'
      },
      {
        label: 'No Answer',
        value: noAnswerCalls,
        percentage: calculatePercentage(noAnswerCalls),
        icon: <Clock className="w-4 h-4 text-yellow-500" />,
        color: 'bg-yellow-500',
        textColor: 'text-yellow-500'
      },
      {
        label: 'Busy',
        value: busyCalls,
        percentage: calculatePercentage(busyCalls),
        icon: <Signal className="w-4 h-4 text-orange-500" />,
        color: 'bg-orange-500',
        textColor: 'text-orange-500'
      },
      {
        label: 'Failed',
        value: failedCalls,
        percentage: calculatePercentage(failedCalls),
        icon: <AlertTriangle className="w-4 h-4 text-red-500" />,
        color: 'bg-red-500',
        textColor: 'text-red-500'
      }
    ];
  }, [answeredCalls, noAnswerCalls, busyCalls, failedCalls, totalCalls]);
  
  if (isLoading) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm animate-pulse">
        <div className="w-36 h-5 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center">
              <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded-full mr-3"></div>
              <div className="flex-1">
                <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
              </div>
              <div className="w-10 h-4 bg-gray-200 dark:bg-gray-700 rounded ml-3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Call Status Distribution</h3>
        <div className="flex items-center space-x-2 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded">
          <Phone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
            {safeFormat(answerRate)}% Answer Rate
          </span>
        </div>
      </div>
      
      <div className="space-y-3">
        {statusMetrics.map((metric, index) => (
          <div key={index} className="flex items-center">
            <div className="mr-3 flex items-center justify-center">
              {metric.icon}
            </div>
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-gray-700 dark:text-gray-300">{metric.label}</span>
                <span className={`${metric.textColor}`}>{metric.percentage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div 
                  className={`${metric.color} h-1.5 rounded-full`} 
                  style={{ width: `${metric.percentage}%` }}
                />
              </div>
            </div>
            <div className="ml-3 w-16 text-right">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                {metric.value.toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>Total Calls:</span>
          <span className="font-medium">{totalCalls.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
} 