'use client';

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';
import { useMemo } from 'react';

interface Caller {
  number: string;
  call_count: number;
  total_duration: number;
  avg_duration: number;
  answer_rate?: number;
  recording_rate?: number;
  // Other properties omitted for brevity
}

interface CallPerformanceRadarProps {
  callers?: Caller[];
  isLoading?: boolean;
  maxCallers?: number;
}

export default function CallPerformanceRadar({
  callers = [],
  isLoading = false,
  maxCallers = 3
}: CallPerformanceRadarProps) {
  const radarData = useMemo(() => {
    try {
      if (!callers || callers.length === 0) return [];

      // Find the top callers by total calls (up to maxCallers)
      const topCallers = [...callers]
        .sort((a, b) => b.call_count - a.call_count)
        .slice(0, maxCallers);

      // Find max values for each metric for normalization
      const maxCallCount = Math.max(...callers.map(c => c.call_count));
      const maxDuration = Math.max(...callers.map(c => c.total_duration));
      const maxAvgDuration = Math.max(...callers.map(c => c.avg_duration));
      
      // Create metrics data
      return [
        {
          metric: "Call Volume",
          fullMark: 100,
          ...topCallers.reduce((acc, caller) => {
            acc[caller.number] = (caller.call_count / maxCallCount) * 100;
            return acc;
          }, {} as Record<string, number>)
        },
        {
          metric: "Total Duration",
          fullMark: 100,
          ...topCallers.reduce((acc, caller) => {
            acc[caller.number] = (caller.total_duration / maxDuration) * 100;
            return acc;
          }, {} as Record<string, number>)
        },
        {
          metric: "Avg Duration",
          fullMark: 100,
          ...topCallers.reduce((acc, caller) => {
            acc[caller.number] = (caller.avg_duration / maxAvgDuration) * 100;
            return acc;
          }, {} as Record<string, number>)
        },
        {
          metric: "Recording Rate",
          fullMark: 100,
          ...topCallers.reduce((acc, caller) => {
            acc[caller.number] = caller.recording_rate || 0;
            return acc;
          }, {} as Record<string, number>)
        },
        {
          metric: "Answer Rate",
          fullMark: 100,
          ...topCallers.reduce((acc, caller) => {
            acc[caller.number] = caller.answer_rate || 0;
            return acc;
          }, {} as Record<string, number>)
        }
      ];
    } catch (error) {
      console.error('Error formatting radar chart data:', error);
      return [];
    }
  }, [callers, maxCallers]);

  const callerColors = useMemo(() => {
    if (!callers) return {};

    const colors = [
      'hsl(var(--chart-1))',
      'hsl(var(--chart-2))',
      'hsl(var(--chart-3))',
      'hsl(var(--chart-4))',
      'hsl(var(--chart-5))',
    ];

    return [...callers]
      .sort((a, b) => b.call_count - a.call_count)
      .slice(0, maxCallers)
      .reduce((acc, caller, index) => {
        acc[caller.number] = colors[index % colors.length];
        return acc;
      }, {} as Record<string, string>);
  }, [callers, maxCallers]);

  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded">
        <div className="flex flex-col items-center space-y-2">
          <div className="w-8 h-8 border-4 border-t-blue-500 border-b-blue-700 border-l-blue-600 border-r-blue-600 rounded-full animate-spin"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading performance data...</p>
        </div>
      </div>
    );
  }

  if (!callers || callers.length === 0) {
    return (
      <div className="h-96 flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded">
        <p className="text-gray-500 dark:text-gray-400">No caller data available</p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dataItem = payload[0].payload;
      const metric = dataItem.metric;
      
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded shadow-lg">
          <p className="font-medium text-gray-800 dark:text-gray-200 mb-2">{metric}</p>
          {payload.map((entry: any) => {
            // Skip the metric entry which is used as the label
            if (entry.dataKey === 'metric' || entry.dataKey === 'fullMark') return null;
            
            return (
              <p 
                key={entry.dataKey} 
                className="text-gray-700 dark:text-gray-300 text-sm"
                style={{ color: entry.color }}
              >
                <span className="font-medium">Caller {entry.dataKey}: </span>
                {metric === "Recording Rate" || metric === "Answer Rate" 
                  ? `${entry.value.toFixed(1)}%`
                  : `${entry.value.toFixed(1)} (relative)`}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart outerRadius="80%" data={radarData}>
          <PolarGrid stroke="#E2E8F0" />
          <PolarAngleAxis
            dataKey="metric"
            tick={{ fill: '#64748B', fontSize: 12 }}
          />
          <PolarRadiusAxis 
            angle={90} 
            domain={[0, 100]}
            tick={{ fontSize: 10 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          
          {callers
            .sort((a, b) => b.call_count - a.call_count)
            .slice(0, maxCallers)
            .map((caller, index) => (
              <Radar
                key={caller.number}
                name={`Caller ${caller.number}`}
                dataKey={caller.number}
                stroke={callerColors[caller.number]}
                fill={callerColors[caller.number]}
                fillOpacity={0.2}
              />
            ))}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
} 