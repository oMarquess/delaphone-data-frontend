'use client';

import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { DailyDistribution } from '@/services/dashboard';

interface CallVolumeChartProps {
  data: DailyDistribution[];
  isLoading?: boolean;
}

export default function CallVolumeChart({ data, isLoading = false }: CallVolumeChartProps) {
  const [activeLines, setActiveLines] = useState({
    total: true,
    answered: true,
    no_answer: false,
    busy: false,
    failed: false,
  });
  
  const toggleLine = (key: keyof typeof activeLines) => {
    setActiveLines(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };
  
  // Process data safely, ensuring every property exists
  const formattedData = useMemo(() => {
    try {
      if (!data || data.length === 0) return [];
      
      return data.map(item => {
        // Safely handle possible undefined/null values
        const safeItem = {
          date: item.date ? format(parseISO(item.date), 'MMM dd') : 'Unknown',
          total: item.total || 0,
          answered: item.answered || 0,
          no_answer: item.no_answer || 0,
          busy: item.busy || 0,
          failed: item.failed || 0
        };
        
        return safeItem;
      });
    } catch (error) {
      console.error('Error formatting chart data:', error);
      return [];
    }
  }, [data]);
  
  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded">
        <div className="flex flex-col items-center space-y-2">
          <div className="w-8 h-8 border-4 border-t-purple-500 border-b-purple-700 border-l-purple-600 border-r-purple-600 rounded-full animate-spin"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading chart data...</p>
        </div>
      </div>
    );
  }
  
  if (formattedData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded">
        <p className="text-gray-500 dark:text-gray-400">No data available for the selected time period</p>
      </div>
    );
  }
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded shadow-lg">
          <p className="font-medium text-gray-800 dark:text-gray-200 mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={`tooltip-${index}`} className="flex items-center text-sm">
              <div 
                className="w-3 h-3 mr-2 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-700 dark:text-gray-300">
                {entry.name}: <span className="font-medium">{entry.value}</span>
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };
  
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 mb-2">
        <button
          className={`px-2 py-1 text-xs rounded-full ${
            activeLines.total 
              ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700' 
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-700'
          }`}
          onClick={() => toggleLine('total')}
        >
          Total
        </button>
        <button
          className={`px-2 py-1 text-xs rounded-full ${
            activeLines.answered 
              ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700' 
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-700'
          }`}
          onClick={() => toggleLine('answered')}
        >
          Answered
        </button>
        <button
          className={`px-2 py-1 text-xs rounded-full ${
            activeLines.no_answer 
              ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-700' 
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-700'
          }`}
          onClick={() => toggleLine('no_answer')}
        >
          No Answer
        </button>
        <button
          className={`px-2 py-1 text-xs rounded-full ${
            activeLines.busy 
              ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-700' 
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-700'
          }`}
          onClick={() => toggleLine('busy')}
        >
          Busy
        </button>
        <button
          className={`px-2 py-1 text-xs rounded-full ${
            activeLines.failed 
              ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700' 
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-700'
          }`}
          onClick={() => toggleLine('failed')}
        >
          Failed
        </button>
      </div>
      
      <ResponsiveContainer width="100%" height={320}>
        <LineChart
          data={formattedData}
          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
          <XAxis 
            dataKey="date" 
            tick={{ fill: '#9CA3AF' }} 
            axisLine={{ stroke: '#4B5563' }}
            tickLine={{ stroke: '#4B5563' }}
          />
          <YAxis 
            tick={{ fill: '#9CA3AF' }} 
            axisLine={{ stroke: '#4B5563' }}
            tickLine={{ stroke: '#4B5563' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          {activeLines.total && (
            <Line
              type="monotone"
              dataKey="total"
              name="Total"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={{ r: 2 }}
              activeDot={{ r: 5 }}
            />
          )}
          {activeLines.answered && (
            <Line
              type="monotone"
              dataKey="answered"
              name="Answered"
              stroke="#10B981"
              strokeWidth={2}
              dot={{ r: 2 }}
              activeDot={{ r: 5 }}
            />
          )}
          {activeLines.no_answer && (
            <Line
              type="monotone"
              dataKey="no_answer"
              name="No Answer"
              stroke="#F59E0B"
              strokeWidth={2}
              dot={{ r: 2 }}
              activeDot={{ r: 5 }}
            />
          )}
          {activeLines.busy && (
            <Line
              type="monotone"
              dataKey="busy"
              name="Busy"
              stroke="#F97316"
              strokeWidth={2}
              dot={{ r: 2 }}
              activeDot={{ r: 5 }}
            />
          )}
          {activeLines.failed && (
            <Line
              type="monotone"
              dataKey="failed"
              name="Failed"
              stroke="#EF4444"
              strokeWidth={2}
              dot={{ r: 2 }}
              activeDot={{ r: 5 }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
} 