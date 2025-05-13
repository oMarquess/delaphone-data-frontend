'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useMemo } from 'react';

interface Caller {
  number: string;
  call_count: number;
  total_duration: number;
  avg_duration: number;
  // Other properties omitted for brevity
}

interface TopCallerComparisonChartProps {
  callers?: Caller[];
  isLoading?: boolean;
  sortMetric?: 'call_count' | 'total_duration' | 'avg_duration';
}

export default function TopCallerComparisonChart({
  callers = [],
  isLoading = false,
  sortMetric = 'call_count'
}: TopCallerComparisonChartProps) {
  const formattedData = useMemo(() => {
    try {
      if (!callers || callers.length === 0) return [];
      
      // Create a copy of callers array to avoid mutating props
      const sortedCallers = [...callers].sort((a, b) => b[sortMetric] - a[sortMetric]);
      
      // Take top 5 callers only for better visualization
      return sortedCallers.slice(0, 5).map(caller => ({
        name: caller.number,
        calls: caller.call_count,
        duration: Math.round(caller.total_duration / 60), // Convert to minutes
        avgDuration: Math.round(caller.avg_duration / 60), // Convert to minutes
      }));
    } catch (error) {
      console.error('Error formatting caller comparison data:', error);
      return [];
    }
  }, [callers, sortMetric]);

  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded">
        <div className="flex flex-col items-center space-y-2">
          <div className="w-8 h-8 border-4 border-t-blue-500 border-b-blue-700 border-l-blue-600 border-r-blue-600 rounded-full animate-spin"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading chart data...</p>
        </div>
      </div>
    );
  }

  const formatDuration = (minutes: number) => {
    return `${minutes} min`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded shadow-lg">
          <p className="font-medium text-gray-800 dark:text-gray-200">Caller: {label}</p>
          <p className="text-gray-700 dark:text-gray-300 text-sm">
            <span className="font-medium text-blue-500">Calls: </span> {payload[0].value}
          </p>
          <p className="text-gray-700 dark:text-gray-300 text-sm">
            <span className="font-medium text-purple-500">Total Duration: </span> {formatDuration(payload[1].value)}
          </p>
          <p className="text-gray-700 dark:text-gray-300 text-sm">
            <span className="font-medium text-green-500">Avg Duration: </span> {formatDuration(payload[2].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={formattedData}
          layout="vertical"
          margin={{
            top: 20,
            right: 30,
            left: 60,
            bottom: 20,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
          <XAxis 
            type="number" 
            tick={{ fontSize: 12 }} 
            tickLine={false}
            axisLine={{ stroke: '#E2E8F0' }}
          />
          <YAxis 
            dataKey="name"
            type="category"
            tick={{ fontSize: 12 }} 
            tickLine={false}
            axisLine={{ stroke: '#E2E8F0' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar 
            dataKey="calls" 
            name="Call Count" 
            fill="hsl(var(--chart-1))" 
            radius={[0, 4, 4, 0]}
            barSize={20}
          />
          <Bar 
            dataKey="duration" 
            name="Total Duration (min)" 
            fill="hsl(var(--chart-2))" 
            radius={[0, 4, 4, 0]}
            barSize={20}
          />
          <Bar 
            dataKey="avgDuration" 
            name="Avg Duration (min)" 
            fill="hsl(var(--chart-3))" 
            radius={[0, 4, 4, 0]}
            barSize={20}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
} 