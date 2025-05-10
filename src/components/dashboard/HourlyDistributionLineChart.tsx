'use client';

import { TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useState, useMemo } from 'react';
import { HourlyDistribution } from '@/services/dashboard';

interface HourlyDistributionLineChartProps {
  data: HourlyDistribution[];
  isLoading?: boolean;
}

const chartConfig = {
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
  unknown: {
    label: "Unknown",
    color: "hsl(var(--chart-1))",
  },
} as const;

export default function HourlyDistributionLineChart({ data, isLoading = false }: HourlyDistributionLineChartProps) {
  const [activeCategories, setActiveCategories] = useState({
    inbound: true,
    outbound: true,
    internal: true,
    unknown: true,
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
          inbound: item.inbound || 0,
          outbound: item.outbound || 0,
          internal: item.internal || 0,
          unknown: item.unknown || 0
        };
      });
    } catch (error) {
      console.error('Error formatting hourly chart data:', error);
      return [];
    }
  }, [data]);

  const toggleCategory = (key: keyof typeof activeCategories) => {
    setActiveCategories(prev => ({
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
              activeCategories[key as keyof typeof activeCategories]
                ? 'shadow-sm'
                : 'opacity-50 hover:opacity-75'
            }`}
            style={{
              backgroundColor: activeCategories[key as keyof typeof activeCategories]
                ? `${config.color}15`
                : 'transparent',
              color: config.color,
              border: `1px solid ${config.color}`,
              boxShadow: activeCategories[key as keyof typeof activeCategories]
                ? `0 0 0 2px ${config.color}30`
                : 'none'
            }}
            onClick={() => toggleCategory(key as keyof typeof activeCategories)}
          >
            {config.label}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <BarChart
          data={formattedData}
          margin={{ top: 10, right: 30, left: 10, bottom: 20 }}
        >
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
          <XAxis
            dataKey="hourLabel"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(value) => value}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
          />
          <Tooltip content={<CustomTooltip />} cursor={false} />
          {activeCategories.inbound && (
            <Bar 
              dataKey="inbound"
              name="Inbound"
              fill={chartConfig.inbound.color}
              radius={4}
            />
          )}
          {activeCategories.outbound && (
            <Bar 
              dataKey="outbound" 
              name="Outbound"
              fill={chartConfig.outbound.color}
              radius={4}
            />
          )}
          {activeCategories.internal && (
            <Bar 
              dataKey="internal" 
              name="Internal"
              fill={chartConfig.internal.color}
              radius={4}
            />
          )}
          {activeCategories.unknown && (
            <Bar 
              dataKey="unknown" 
              name="Unknown"
              fill={chartConfig.unknown.color}
              radius={4}
            />
          )}
        </BarChart>
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