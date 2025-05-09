'use client';

import { TrendingUp } from "lucide-react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useState, useMemo } from 'react';
import { HourlyDistribution } from '@/services/dashboard';

interface HourlyDistributionLineChartProps {
  data: HourlyDistribution[];
  isLoading?: boolean;
}

const chartConfig = {
  total: {
    label: "Total Calls",
    color: "hsl(var(--chart-1))",
  },
  inbound: {
    label: "Inbound",
    color: "hsl(var(--chart-2))",
  },
  outbound: {
    label: "Outbound",
    color: "hsl(var(--chart-3))",
  },
  internal: {
    label: "Internal",
    color: "hsl(var(--chart-4))",
  },
} as const;

export default function HourlyDistributionLineChart({ data, isLoading = false }: HourlyDistributionLineChartProps) {
  const [activeLines, setActiveLines] = useState({
    total: true,
    inbound: true,
    outbound: true,
    internal: true,
  });

  // Process data safely, ensuring every property exists
  const formattedData = useMemo(() => {
    try {
      if (!data || data.length === 0) return [];
      
      return data.map(item => {
        // Format hours safely
        const hour = typeof item.hour === 'number' ? item.hour : 0;
        const hourLabel = hour === 0 ? '12 AM' : 
                         hour < 12 ? `${hour} AM` : 
                         hour === 12 ? '12 PM' : 
                         `${hour - 12} PM`;
        
        // Return safe data
        return {
          hour,
          hourLabel,
          total: item.total || 0,
          inbound: item.inbound || 0,
          outbound: item.outbound || 0, 
          internal: item.internal || 0
        };
      });
    } catch (error) {
      console.error('Error formatting hourly chart data:', error);
      return [];
    }
  }, [data]);

  const toggleLine = (key: keyof typeof activeLines) => {
    setActiveLines(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

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
        {Object.entries(chartConfig).map(([key, config]) => (
          <button
            key={key}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200 ${
              activeLines[key as keyof typeof activeLines]
                ? 'shadow-sm'
                : 'opacity-50 hover:opacity-75'
            }`}
            style={{
              backgroundColor: activeLines[key as keyof typeof activeLines]
                ? `${config.color}15`
                : 'transparent',
              color: config.color,
              border: `1px solid ${config.color}`,
              boxShadow: activeLines[key as keyof typeof activeLines]
                ? `0 0 0 2px ${config.color}30`
                : 'none'
            }}
            onClick={() => toggleLine(key as keyof typeof activeLines)}
          >
            {config.label}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <LineChart
          data={formattedData}
          margin={{ top: 10, right: 30, left: 10, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
          <XAxis
            dataKey="hourLabel"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
          />
          <Tooltip content={<CustomTooltip />} />
          {activeLines.total && (
            <Line
              dataKey="total"
              name="Total Calls"
              type="monotone"
              stroke={chartConfig.total.color}
              strokeWidth={2}
              dot={false}
            />
          )}
          {activeLines.inbound && (
            <Line
              dataKey="inbound"
              name="Inbound"
              type="monotone"
              stroke={chartConfig.inbound.color}
              strokeWidth={2}
              dot={false}
            />
          )}
          {activeLines.outbound && (
            <Line
              dataKey="outbound"
              name="Outbound"
              type="monotone"
              stroke={chartConfig.outbound.color}
              strokeWidth={2}
              dot={false}
            />
          )}
          {activeLines.internal && (
            <Line
              dataKey="internal"
              name="Internal"
              type="monotone"
              stroke={chartConfig.internal.color}
              strokeWidth={2}
              dot={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>

      {/* <div className="flex w-full items-start gap-2 text-sm">
        <div className="grid gap-2">
          <div className="flex items-center gap-2 font-medium leading-none">
            Call volume by hour <TrendingUp className="h-4 w-4" />
          </div>
          <div className="flex items-center gap-2 leading-none text-muted-foreground">
            Showing call distribution across 24 hours
          </div>
        </div>
      </div> */}
    </div>
  );
} 