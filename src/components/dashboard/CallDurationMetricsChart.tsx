'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { useMemo } from 'react';

interface CallDurationMetricsChartProps {
  avgDuration?: number;
  avgBillsec?: number;
  isLoading?: boolean;
}

export default function CallDurationMetricsChart({
  avgDuration = 0,
  avgBillsec = 0,
  isLoading = false
}: CallDurationMetricsChartProps) {
  const formattedData = useMemo(() => {
    try {
      return [
        {
          name: 'Average Call Duration',
          seconds: Math.round(avgDuration || 0),
          fill: '#8B5CF6', // Purple
        },
        {
          name: 'Average Billable Seconds',
          seconds: Math.round(avgBillsec || 0),
          fill: '#10B981', // Green
        },
      ];
    } catch (error) {
      console.error('Error formatting duration data:', error);
      return [];
    }
  }, [avgDuration, avgBillsec]);

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

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded shadow-lg">
          <p className="font-medium text-gray-800 dark:text-gray-200">{payload[0].payload.name}</p>
          <p className="text-gray-700 dark:text-gray-300 text-sm">
            <span className="font-medium">{formatDuration(payload[0].value)}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={formattedData}
          margin={{
            top: 20,
            right: 30,
            left: 30,
            bottom: 30,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: 12 }} 
            tickLine={false} 
            axisLine={{ stroke: '#E2E8F0' }}
          />
          <YAxis
            label={{ 
              value: 'Seconds', 
              angle: -90, 
              position: 'insideLeft',
              style: { textAnchor: 'middle', fill: '#64748B', fontSize: 12 }
            }}
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: '#E2E8F0' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar 
            dataKey="seconds" 
            radius={[4, 4, 0, 0]} 
            fill="#8B5CF6"
            barSize={80}
            label={{
              position: 'top',
              formatter: (value: number) => formatDuration(value),
              fontSize: 12,
              fill: '#64748B'
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
} 