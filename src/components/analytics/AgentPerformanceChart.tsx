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
  ResponsiveContainer,
  ReferenceLine 
} from 'recharts';

interface Agent {
  agent: string;
  agent_cnam: string;
  call_count: number;
  answered_calls: number;
  answer_rate: number;
  efficiency_score: number;
  performance_level: string;
  calls_per_day: number;
}

interface AgentPerformanceChartProps {
  agents: Agent[];
  isLoading?: boolean;
  teamAverages?: {
    answer_rate: number;
    call_duration: number;
    recording_rate: number;
    calls_per_day: number;
  };
}

export default function AgentPerformanceChart({ 
  agents = [], 
  isLoading = false,
  teamAverages
}: AgentPerformanceChartProps) {
  
  // Prepare data for the chart
  const chartData = agents.map(agent => ({
    name: agent.agent_cnam || `Agent ${agent.agent}`,
    callCount: agent.call_count,
    answeredCalls: agent.answered_calls,
    answerRate: agent.answer_rate,
    agent: agent.agent,
  }));
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-white dark:bg-gray-800 rounded-lg p-4">
        <div className="animate-spin h-8 w-8 border-4 border-green-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  if (!agents || agents.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-white dark:bg-gray-800 rounded-lg p-4">
        <p className="text-gray-500 dark:text-gray-400">No agent data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 h-[400px]">
      <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">Agent Performance Comparison</h3>
      
      <ResponsiveContainer width="100%" height={320}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
          barSize={32}
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
            yAxisId="left"
            orientation="left"
            tickFormatter={(value) => `${value}`}
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: '#E5E7EB', strokeWidth: 1 }}
            className="text-gray-500 dark:text-gray-400"
            label={{ 
              value: 'Calls', 
              angle: -90, 
              position: 'insideLeft',
              style: { textAnchor: 'middle', fill: '#6B7280', fontSize: 12 } 
            }}
          />
          <YAxis 
            yAxisId="right"
            orientation="right"
            tickFormatter={(value) => `${value}%`}
            domain={[0, 100]}
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: '#E5E7EB', strokeWidth: 1 }}
            className="text-gray-500 dark:text-gray-400"
            label={{ 
              value: 'Answer Rate', 
              angle: 90, 
              position: 'insideRight',
              style: { textAnchor: 'middle', fill: '#6B7280', fontSize: 12 } 
            }}
          />
          <Tooltip
            contentStyle={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.9)', 
              borderColor: '#E5E7EB',
              borderRadius: '0.375rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}
            formatter={(value, name) => {
              if (name === 'answerRate') return [`${value}%`, 'Answer Rate'];
              if (name === 'callCount') return [value, 'Total Calls'];
              if (name === 'answeredCalls') return [value, 'Answered Calls'];
              return [value, name];
            }}
            labelStyle={{ fontWeight: 'bold', marginBottom: '0.25rem' }}
          />
          <Legend 
            verticalAlign="top" 
            height={36}
            iconType="circle"
            formatter={(value) => {
              if (value === 'callCount') return 'Total Calls';
              if (value === 'answeredCalls') return 'Answered Calls';
              if (value === 'answerRate') return 'Answer Rate';
              return value;
            }}
          />
          
          {/* Add reference line for team average answer rate if available */}
          {teamAverages && (
            <ReferenceLine 
              yAxisId="right" 
              y={teamAverages.answer_rate} 
              stroke="#10B981" 
              strokeDasharray="3 3"
              label={{ 
                value: `Team Avg: ${teamAverages.answer_rate}%`, 
                position: 'insideTopRight',
                fill: '#10B981',
                fontSize: 12
              }}
            />
          )}
          
          <Bar 
            yAxisId="left" 
            dataKey="callCount" 
            fill="#6366F1" 
            radius={[4, 4, 0, 0]}
            name="callCount"
          />
          <Bar 
            yAxisId="left" 
            dataKey="answeredCalls" 
            fill="#A855F7" 
            radius={[4, 4, 0, 0]}
            name="answeredCalls"
          />
          <Bar 
            yAxisId="right" 
            dataKey="answerRate" 
            fill="#10B981" 
            radius={[4, 4, 0, 0]}
            name="answerRate"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
} 