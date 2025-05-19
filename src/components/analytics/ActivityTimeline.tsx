'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useMemo, useState } from 'react';

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
  const [activeCallers, setActiveCallers] = useState<Record<string, boolean>>({});
  const [showLegend, setShowLegend] = useState(true);
  
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

      // Define the type for our date objects that includes an index signature
      interface DailyCallData {
        date: string;
        total: number;
        [key: string]: string | number; // Allow any string key with string or number values
      }

      // For each caller, find their calls on each day
      const dailyCallCounts = dateRange.map(date => {
        const dateObj: DailyCallData = {
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

  // Handle caller visibility toggle
  const handleLegendToggle = (caller: string) => {
    setActiveCallers(prev => ({
      ...prev,
      [caller]: !prev[caller]
    }));
  };

  // Custom legend at the top of the chart
  const CustomLegend = () => {
    if (!data?.top_callers) return null;
    
    // Hide the legend automatically if there are more than 10 items
    const shouldAutoHide = data.top_callers.length > 10;
    
    // Only show the legend items if we're not auto-hiding or the user has explicitly toggled it on
    const displayItems = !shouldAutoHide || (shouldAutoHide && showLegend);
    
    return (
      <div className="mb-4">
        {shouldAutoHide && (
          <div className="flex justify-end mb-2">
            <button 
              onClick={() => setShowLegend(!showLegend)}
              className="text-xs px-2 py-1 rounded border border-gray-200 dark:border-gray-700 flex items-center gap-1 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              {showLegend ? (
                <>
                  <span>Hide Legend</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m18 15-6-6-6 6"/>
                  </svg>
                </>
              ) : (
                <>
                  <span>Show Legend ({data.top_callers.length} callers)</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m6 9 6 6 6-6"/>
                  </svg>
                </>
              )}
            </button>
          </div>
        )}
        
        {displayItems && (
          <div className="flex flex-wrap gap-2 justify-center">
            {/* Legend item for total */}
            <div 
              className={`inline-flex items-center px-2 py-1 rounded cursor-pointer border transition-all
                ${activeCallers['total'] ? 'opacity-50' : 'opacity-100'}
                border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700`}
              onClick={() => handleLegendToggle('total')}
            >
              <div className="w-3 h-3 mr-2 rounded-sm" style={{ backgroundColor: '#4B5563' }}></div>
              <span className="text-xs font-medium">Total Calls</span>
            </div>
            
            {/* Legend items for each caller */}
            {data.top_callers.map((caller) => (
              <div 
                key={caller.number}
                className={`inline-flex items-center px-2 py-1 rounded cursor-pointer border transition-all
                  ${activeCallers[caller.number] ? 'opacity-50' : 'opacity-100'}
                  border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700`}
                onClick={() => handleLegendToggle(caller.number)}
              >
                <div 
                  className="w-3 h-3 mr-2 rounded-sm" 
                  style={{ backgroundColor: callerColors[caller.number] }}
                ></div>
                <span className="text-xs font-medium">Caller {caller.number}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-[400px] w-full">
      <CustomLegend />
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={timelineData}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 20,
          }}
          className="[&_.recharts-cartesian-grid-horizontal]:stroke-muted [&_.recharts-cartesian-grid-vertical]:stroke-muted"
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/20" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            dy={10}
            className="text-muted-foreground fill-muted-foreground text-xs"
          />
          <YAxis
            tickFormatter={(value) => `${value}`}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            width={40}
            className="text-muted-foreground fill-muted-foreground text-xs"
          />
          <Tooltip 
            content={<CustomTooltip />} 
            cursor={{ stroke: 'hsl(var(--muted))' }}
          />
          
          {/* Total calls line */}
          <Line 
            type="monotone" 
            dataKey="total" 
            name="Total Calls" 
            stroke="#4B5563" 
            strokeWidth={2}
            dot={{ 
              r: 3, 
              strokeWidth: 2, 
              fill: 'white' 
            }}
            activeDot={{ 
              r: 5, 
              strokeWidth: 2, 
              fill: 'white' 
            }}
            hide={activeCallers['total']}
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
              dot={{ 
                r: 2, 
                strokeWidth: 2, 
                fill: 'white' 
              }}
              activeDot={{ 
                r: 4, 
                strokeWidth: 2, 
                fill: 'white' 
              }}
              hide={activeCallers[caller.number]}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
} 