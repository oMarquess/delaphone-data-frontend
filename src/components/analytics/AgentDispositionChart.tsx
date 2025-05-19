'use client';

import React from 'react';
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

interface DispositionData {
  agent: string;
  agent_cnam: string;
  ANSWERED: number;
  NO_ANSWER: number;
  BUSY: number;
  FAILED: number;
  total: number;
}

interface AgentDispositionChartProps {
  dispositionData?: DispositionData[];
  isLoading?: boolean;
}

export default function AgentDispositionChart({
  dispositionData = [],
  isLoading = false
}: AgentDispositionChartProps) {
  
  // Process data to include percentages and prepare for chart
  const chartData = dispositionData.map(item => ({
    name: item.agent_cnam || `Agent ${item.agent}`,
    agent: item.agent,
    answered: item.ANSWERED,
    noAnswer: item.NO_ANSWER,
    busy: item.BUSY,
    failed: item.FAILED,
    total: item.total,
    // Calculate percentages for tooltip
    answeredPct: ((item.ANSWERED / item.total) * 100).toFixed(1),
    noAnswerPct: ((item.NO_ANSWER / item.total) * 100).toFixed(1),
    busyPct: ((item.BUSY / item.total) * 100).toFixed(1),
    failedPct: ((item.FAILED / item.total) * 100).toFixed(1)
  }));
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-white dark:bg-gray-800 rounded-lg p-4">
        <div className="animate-spin h-8 w-8 border-4 border-green-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  if (!dispositionData || dispositionData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-white dark:bg-gray-800 rounded-lg p-4">
        <p className="text-gray-500 dark:text-gray-400">No call disposition data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 h-[400px]">
      <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">Call Disposition by Agent</h3>
      
      <ResponsiveContainer width="100%" height={320}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
          barSize={32}
          stackOffset="expand"
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-gray-200 dark:stroke-gray-700" />
          <XAxis 
            dataKey="name" 
            angle={-45} 
            textAnchor="end" 
            height={70} 
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: '#E5E7EB', strokeWidth: 1 }}
            className="text-gray-500 dark:text-gray-400"
          />
          <YAxis 
            tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
            domain={[0, 1]}
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: '#E5E7EB', strokeWidth: 1 }}
            className="text-gray-500 dark:text-gray-400"
          />
          <Tooltip
            contentStyle={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.9)', 
              borderColor: '#E5E7EB',
              borderRadius: '0.375rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}
            formatter={(value, name, props) => {
              // Show both count and percentage
              const item = props.payload;
              if (name === 'answered') return [`${value} (${item.answeredPct}%)`, 'Answered'];
              if (name === 'noAnswer') return [`${value} (${item.noAnswerPct}%)`, 'No Answer'];
              if (name === 'busy') return [`${value} (${item.busyPct}%)`, 'Busy'];
              if (name === 'failed') return [`${value} (${item.failedPct}%)`, 'Failed'];
              return [value, name];
            }}
            labelStyle={{ fontWeight: 'bold', marginBottom: '0.25rem' }}
          />
          <Legend 
            verticalAlign="top" 
            height={36}
            iconType="circle"
            formatter={(value) => {
              if (value === 'answered') return 'Answered';
              if (value === 'noAnswer') return 'No Answer';
              if (value === 'busy') return 'Busy';
              if (value === 'failed') return 'Failed';
              return value;
            }}
          />
          <Bar 
            dataKey="answered" 
            fill="#10B981" 
            stackId="a"
            name="answered"
          />
          <Bar 
            dataKey="noAnswer" 
            fill="#F59E0B" 
            stackId="a"
            name="noAnswer"
          />
          <Bar 
            dataKey="busy" 
            fill="#F97316" 
            stackId="a"
            name="busy"
          />
          <Bar 
            dataKey="failed" 
            fill="#EF4444" 
            stackId="a"
            name="failed"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
} 