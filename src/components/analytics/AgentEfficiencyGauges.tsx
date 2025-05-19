'use client';

import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip, RadialBarChart, RadialBar } from 'recharts';

interface EfficiencyData {
  agent: string;
  agent_cnam: string;
  value: number;
  level: string;
}

interface AgentEfficiencyGaugesProps {
  efficiencyData?: EfficiencyData[];
  isLoading?: boolean;
}

export default function AgentEfficiencyGauges({
  efficiencyData = [],
  isLoading = false
}: AgentEfficiencyGaugesProps) {
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[500px] bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin h-10 w-10 border-4 border-green-500 border-t-transparent rounded-full"></div>
          <p className="text-gray-500 dark:text-gray-400 font-medium">Loading efficiency data...</p>
        </div>
      </div>
    );
  }
  
  if (!efficiencyData || efficiencyData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[500px] bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
        <div className="text-center max-w-md">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-500 dark:text-gray-400 text-lg font-medium mb-2">No efficiency data available</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm">When agents handle calls, their efficiency scores will appear here.</p>
        </div>
      </div>
    );
  }

  // Prepare the data for radial bar chart
  const chartData = efficiencyData.map((item, index) => ({
    name: item.agent_cnam || `Agent ${item.agent}`,
    agent: item.agent,
    value: item.value,
    level: item.level,
    fill: getColorForLevel(item.level),
    // For proper stacking in the radial bar chart
    index: index
  })).sort((a, b) => b.value - a.value); // Sort by value descending

  function getColorForLevel(level: string): string {
    switch (level) {
      case 'excellent':
        return '#10B981'; // Green
      case 'good':
        return '#3B82F6'; // Blue
      case 'average':
        return '#F59E0B'; // Amber
      case 'below_average':
        return '#F97316'; // Orange
      case 'needs_improvement':
        return '#EF4444'; // Red
      default:
        return '#6B7280'; // Gray
    }
  }

  function getLevelLabel(level: string): string {
    switch (level) {
      case 'excellent':
        return 'Excellent';
      case 'good':
        return 'Good';
      case 'average':
        return 'Average';
      case 'below_average':
        return 'Below Average';
      case 'needs_improvement':
        return 'Needs Improvement';
      default:
        return level;
    }
  }

  function getEmoji(level: string): string {
    switch (level) {
      case 'excellent':
        return '🏆';
      case 'good':
        return '👍';
      case 'average':
        return '👌';
      case 'below_average':
        return '⚠️';
      case 'needs_improvement':
        return '⚡';
      default:
        return '';
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 pb-24 h-[520px] overflow-auto border border-gray-100 dark:border-gray-700 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-gray-700 dark:text-gray-200">Agent Efficiency Scores</h3>
        <div className="flex items-center space-x-2">
          <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 font-medium">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            Excellent
          </span>
          <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            Average
          </span>
          <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 font-medium">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            Needs Improvement
          </span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {chartData.slice(0, 6).map((agent) => (
          <div 
            key={agent.agent} 
            className="bg-gradient-to-b from-gray-50 to-white dark:from-gray-800 dark:to-gray-800/50 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 dark:border-gray-700"
          >
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h4 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <span>{agent.name}</span>
                <span className="text-lg">{getEmoji(agent.level)}</span>
              </h4>
              <div 
                className="text-xs font-semibold px-2.5 py-1 rounded-full" 
                style={{ 
                  backgroundColor: `${agent.fill}15`,
                  color: agent.fill
                }}
              >
                {getLevelLabel(agent.level)}
              </div>
            </div>
            
            <div className="p-5">
              <div className="relative w-full h-44 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'score', value: agent.value },
                        { name: 'remaining', value: 100 - agent.value }
                      ]}
                      cx="50%"
                      cy="50%"
                      startAngle={180}
                      endAngle={0}
                      innerRadius="72%"
                      outerRadius="92%"
                      cornerRadius={14}
                      paddingAngle={0}
                      dataKey="value"
                      stroke="none"
                      strokeWidth={0}
                    >
                      <Cell key="score" fill={agent.fill} filter="url(#shadow)" />
                      <Cell key="remaining" fill="rgba(229, 231, 235, 0.5)" />
                      <filter id="shadow" height="130%">
                        <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor={agent.fill} floodOpacity="0.3" />
                      </filter>
                    </Pie>
                    
                    {/* Tick marks */}
                    {[0, 25, 50, 75, 100].map((tick) => {
                      const angle = Math.PI * (1 - tick / 100);
                      const x1 = 50 + Math.cos(angle) * 72;
                      const y1 = 50 - Math.sin(angle) * 72;
                      const x2 = 50 + Math.cos(angle) * 92;
                      const y2 = 50 - Math.sin(angle) * 92;
                      return (
                        <line
                          key={tick}
                          x1={`${x1}%`}
                          y1={`${y1}%`}
                          x2={`${x2}%`}
                          y2={`${y2}%`}
                          stroke={tick % 50 === 0 ? "rgba(156, 163, 175, 0.7)" : "rgba(209, 213, 219, 0.5)"}
                          strokeWidth={tick % 50 === 0 ? 2 : 1}
                        />
                      );
                    })}
                  </PieChart>
                </ResponsiveContainer>
                
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-2xl font-extrabold" 
                    style={{ 
                      color: agent.fill,
                      textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}>
                    {agent.value}%
                  </div>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <div className="flex justify-between text-sm">
                  <div className="font-medium text-gray-700 dark:text-gray-300">Performance Rating</div>
                  <div className="font-semibold" style={{ color: agent.fill }}>
                    {agent.value >= 80 ? 'High Performer' : 
                     agent.value >= 60 ? 'Good Performer' : 
                     agent.value >= 40 ? 'Average Performer' : 'Needs Coaching'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Spacer element to ensure bottom content isn't buried */}
      <div className="h-16"></div>
    </div>
  );
} 