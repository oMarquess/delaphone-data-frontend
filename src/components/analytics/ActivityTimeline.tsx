'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useMemo } from 'react';

interface CallEntry {
  number: string;
  call_count: number;
  total_duration: number;
  first_call: string;
  last_call: string;
}

interface ActivityData {
  top_callers?: CallEntry[];
  time_period?: {
    start_date: string;
    end_date: string;
    total_days: number;
  };
}

interface ActivityTimelineProps {
  data?: ActivityData;
  isLoading?: boolean;
}

export default function ActivityTimeline({
  data,
  isLoading = false,
}: ActivityTimelineProps) {
  const timelineData = useMemo(() => {
    if (!data?.top_callers || !data.time_period) return [];

    try {
      const { start_date, end_date, total_days } = data.time_period;
      
      // Create a date range array
      const dateRange = [];
      const startDate = new Date(start_date);
      
      for (let i = 0; i <= total_days; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        dateRange.push(currentDate.toISOString().split('T')[0]);
      }

      // For each caller, find their calls on each day
      const dailyCallCounts = dateRange.map(date => {
        const dateObj = {
          date,
          total: 0,
        };
        
        // Process each caller's activity
        data.top_callers?.forEach(caller => {
          const firstCallDate = caller.first_call.split(' ')[0];
          const lastCallDate = caller.last_call.split(' ')[0];
          
          // Only count activity between first and last call
          if (date >= firstCallDate && date <= lastCallDate) {
            // Distribute calls somewhat evenly across the date range
            // This is an approximation since we don't have exact daily counts
            const callerDaySpan = (new Date(lastCallDate).getTime() - new Date(firstCallDate).getTime()) / (1000 * 60 * 60 * 24) + 1;
            const estimatedDailyCalls = caller.call_count / callerDaySpan;
            
            // We'll use the caller's number as the key
            dateObj[caller.number] = Math.round(estimatedDailyCalls);
            dateObj.total += Math.round(estimatedDailyCalls);
          } else {
            dateObj[caller.number] = 0;
          }
        });

        return dateObj;
      });

      return dailyCallCounts;
    } catch (error) {
      console.error('Error generating activity timeline data:', error);
      return [];
    }
  }, [data]);

  // Generate colors for each caller
  const callerColors = useMemo(() => {
    if (!data?.top_callers) return {};

    const colors = [
      'hsl(var(--chart-1))',
      'hsl(var(--chart-2))',
      'hsl(var(--chart-3))',
      'hsl(var(--chart-4))',
      'hsl(var(--chart-5))',
    ];

    return data.top_callers.reduce((acc, caller, index) => {
      acc[caller.number] = colors[index % colors.length];
      return acc;
    }, {} as Record<string, string>);
  }, [data?.top_callers]);

  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded">
        <div className="flex flex-col items-center space-y-2">
          <div className="w-8 h-8 border-4 border-t-blue-500 border-b-blue-700 border-l-blue-600 border-r-blue-600 rounded-full animate-spin"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading timeline data...</p>
        </div>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded shadow-lg">
          <p className="font-medium text-gray-800 dark:text-gray-200 mb-2">{formatDate(label)}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-gray-700 dark:text-gray-300 text-sm" style={{ color: entry.color }}>
              <span className="font-medium">{entry.name === 'total' ? 'Total' : `Caller ${entry.name}`}: </span>
              {entry.value} calls
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={timelineData}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 20,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={true} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: '#E2E8F0' }}
          />
          <YAxis
            label={{ 
              value: 'Calls', 
              angle: -90, 
              position: 'insideLeft',
              style: { textAnchor: 'middle', fill: '#64748B', fontSize: 12 }
            }}
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: '#E2E8F0' }}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />

          {/* Line for total calls */}
          <Line 
            type="monotone" 
            dataKey="total" 
            name="Total Calls" 
            stroke="#4B5563" 
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
          
          {/* Lines for each caller */}
          {data?.top_callers?.map((caller) => (
            <Line
              key={caller.number}
              type="monotone"
              dataKey={caller.number}
              name={`Caller ${caller.number}`}
              stroke={callerColors[caller.number]}
              strokeWidth={1.5}
              dot={{ r: 2 }}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
} 