'use client';

import { useState } from 'react';
import { BulbOutlined, LineChartOutlined, PhoneOutlined, BarChartOutlined, RobotOutlined, BellOutlined, RiseOutlined, FallOutlined } from '@ant-design/icons';

export default function AIInsightsPage() {
  const [isLoading, setIsLoading] = useState(false);
  
  const insights = [
    {
      title: 'Peak Call Hours',
      description: 'Your highest call volume occurs between 10 AM and 2 PM on weekdays, with a 23% increase compared to last month.',
      icon: <LineChartOutlined style={{ fontSize: '22px' }} />,
      color: 'blue',
      trend: 'up',
      percentage: '23%'
    },
    {
      title: 'Missed Opportunities',
      description: 'You missed approximately 34 potential customer calls during off-hours. Consider extending coverage.',
      icon: <PhoneOutlined style={{ fontSize: '22px' }} />,
      color: 'amber',
      trend: 'down',
      percentage: '12%'
    },
    {
      title: 'Call Patterns',
      description: 'Customers who call multiple times within 48 hours have a 76% higher conversion rate.',
      icon: <BarChartOutlined style={{ fontSize: '22px' }} />,
      color: 'green',
      trend: 'up',
      percentage: '76%'
    },
    {
      title: 'Sentiment Analysis',
      description: 'Overall call sentiment is positive. 82% of analyzed calls show satisfied customer outcomes.',
      icon: <RobotOutlined style={{ fontSize: '22px' }} />,
      color: 'purple',
      trend: 'up',
      percentage: '7%'
    }
  ];
  
  const recommendations = [
    {
      title: 'Adjust Staff Scheduling',
      description: 'Optimize staff scheduling to have more personnel available during peak hours between 10 AM - 2 PM.',
      priority: 'High',
      category: 'Operational'
    },
    {
      title: 'Follow-up System',
      description: 'Implement an automated follow-up system for missed calls to capture potential lost opportunities.',
      priority: 'Medium',
      category: 'Sales'
    },
    {
      title: 'Extended Hours Coverage',
      description: 'Consider extending coverage to include early evening hours from 5-7 PM to capture additional 14% of potential customers.',
      priority: 'Medium',
      category: 'Operational'
    }
  ];
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">AI Insights</h1>
          <span className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100 text-xs px-2 py-1 rounded-full">New</span>
        </div>
        <div className="space-x-2">
          <button className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md">
            This Week
          </button>
          <button className="px-4 py-2 bg-gray-800 dark:bg-gray-700 text-white rounded-md">
            Generate New Insights
          </button>
        </div>
      </div>
      
      {/* Main Insight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {insights.map((insight, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="p-5">
              <div className="flex justify-between items-start">
                <div className={`p-3 rounded-lg bg-${insight.color}-100 dark:bg-${insight.color}-900/30`}>
                  <div className={`text-${insight.color}-600 dark:text-${insight.color}-400`}>{insight.icon}</div>
                </div>
                <div className={`flex items-center space-x-1 text-sm ${
                  insight.trend === 'up' 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {insight.trend === 'up' ? <RiseOutlined /> : <FallOutlined />}
                  <span>{insight.percentage}</span>
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{insight.title}</h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{insight.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* AI-Generated Recommendations */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center space-x-2">
            <BulbOutlined className="text-yellow-500" style={{ fontSize: '18px' }} />
            <h2 className="text-lg font-medium text-gray-800 dark:text-gray-100">AI-Generated Recommendations</h2>
          </div>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {recommendations.map((rec, index) => (
            <div key={index} className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-base font-medium text-gray-800 dark:text-gray-100">{rec.title}</h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{rec.description}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    rec.priority === 'High' 
                      ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' 
                      : rec.priority === 'Medium'
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                  }`}>
                    {rec.priority}
                  </span>
                  <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                    {rec.category}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Anomaly Detection */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center space-x-2">
            <BellOutlined className="text-orange-500" style={{ fontSize: '18px' }} />
            <h2 className="text-lg font-medium text-gray-800 dark:text-gray-100">Detected Anomalies</h2>
          </div>
        </div>
        <div className="p-6">
          <div className="flex flex-col space-y-4">
            <div className="flex items-start space-x-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800/30">
              <div className="text-red-600 dark:text-red-400 mt-1">
                <BellOutlined style={{ fontSize: '16px' }} />
              </div>
              <div>
                <h4 className="text-sm font-medium text-red-800 dark:text-red-300">Unusual Drop in Call Volume</h4>
                <p className="text-xs text-red-700 dark:text-red-400 mt-1">
                  Call volume dropped by 32% on Tuesday between 9 AM - 11 AM compared to typical patterns. This coincided with reported network issues.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-100 dark:border-yellow-800/30">
              <div className="text-yellow-600 dark:text-yellow-400 mt-1">
                <BellOutlined style={{ fontSize: '16px' }} />
              </div>
              <div>
                <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">High Abandon Rate Detected</h4>
                <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                  Call abandon rate increased to 18% on Thursday afternoon, significantly above the average 7%. This may indicate staffing issues or technical problems.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Predictive Analysis */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <LineChartOutlined className="text-blue-500" style={{ fontSize: '18px' }} />
              <h2 className="text-lg font-medium text-gray-800 dark:text-gray-100">Call Volume Forecast</h2>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Next 7 days</div>
          </div>
        </div>
        <div className="p-6">
          <div className="h-[200px] flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400 text-sm">AI-generated call volume forecast visualization</p>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800/30">
              <div className="text-xs text-blue-800 dark:text-blue-300 font-medium">Expected Peak Day</div>
              <div className="text-sm text-blue-900 dark:text-blue-200 font-bold mt-1">Wednesday</div>
              <div className="text-xs text-blue-700 dark:text-blue-400 mt-1">+15% above average</div>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800/30">
              <div className="text-xs text-green-800 dark:text-green-300 font-medium">Predicted Total Volume</div>
              <div className="text-sm text-green-900 dark:text-green-200 font-bold mt-1">843 calls</div>
              <div className="text-xs text-green-700 dark:text-green-400 mt-1">+5% week-over-week</div>
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-100 dark:border-purple-800/30">
              <div className="text-xs text-purple-800 dark:text-purple-300 font-medium">Optimal Staffing</div>
              <div className="text-sm text-purple-900 dark:text-purple-200 font-bold mt-1">8 agents</div>
              <div className="text-xs text-purple-700 dark:text-purple-400 mt-1">During peak hours (10AM-2PM)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 