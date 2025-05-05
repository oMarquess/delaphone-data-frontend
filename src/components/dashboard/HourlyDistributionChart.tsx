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
import { useState, useMemo } from 'react';
import { HourlyDistribution } from '@/services/dashboard';

interface HourlyDistributionChartProps {
  data: HourlyDistribution[];
  isLoading?: boolean;
}

export default function HourlyDistributionChart({ data, isLoading = false }: HourlyDistributionChartProps) {
  const [activeBars, setActiveBars] = useState({
    total: true,
    inbound: false,
    outbound: false,
    internal: false,
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
  
  const toggleBar = (key: keyof typeof activeBars) => {
    setActiveBars(prev => ({
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
        <button
          className={`px-2 py-1 text-xs rounded-full ${
            activeBars.total 
              ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700' 
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-700'
          }`}
          onClick={() => toggleBar('total')}
        >
          Total
        </button>
        <button
          className={`px-2 py-1 text-xs rounded-full ${
            activeBars.inbound 
              ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700' 
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-700'
          }`}
          onClick={() => toggleBar('inbound')}
        >
          Inbound
        </button>
        <button
          className={`px-2 py-1 text-xs rounded-full ${
            activeBars.outbound 
              ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700' 
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-700'
          }`}
          onClick={() => toggleBar('outbound')}
        >
          Outbound
        </button>
        <button
          className={`px-2 py-1 text-xs rounded-full ${
            activeBars.internal 
              ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-700' 
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-700'
          }`}
          onClick={() => toggleBar('internal')}
        >
          Internal
        </button>
      </div>
      
      <ResponsiveContainer width="100%" height="100%" minHeight={350}>
        <BarChart
          data={formattedData}
          margin={{ top: 10, right: 30, left: 10, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
          <XAxis 
            dataKey="hourLabel" 
            tick={{ fill: '#9CA3AF' }} 
            axisLine={{ stroke: '#4B5563' }}
            tickLine={{ stroke: '#4B5563' }}
            height={60}
            tickMargin={10}
            interval={0}
            angle={-45}
            textAnchor="end"
          />
          <YAxis 
            tick={{ fill: '#9CA3AF' }} 
            axisLine={{ stroke: '#4B5563' }}
            tickLine={{ stroke: '#4B5563' }}
            width={50}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ paddingTop: 15 }} />
          {activeBars.total && (
            <Bar dataKey="total" name="Total" fill="#3B82F6" radius={[4, 4, 0, 0]} />
          )}
          {activeBars.inbound && (
            <Bar dataKey="inbound" name="Inbound" fill="#10B981" radius={[4, 4, 0, 0]} />
          )}
          {activeBars.outbound && (
            <Bar dataKey="outbound" name="Outbound" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
          )}
          {activeBars.internal && (
            <Bar dataKey="internal" name="Internal" fill="#F97316" radius={[4, 4, 0, 0]} />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
} 