'use client';

import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { useMemo } from 'react';
import { DispositionDistribution } from '@/services/dashboard';

interface CallDispositionChartProps {
  data: DispositionDistribution[];
  isLoading?: boolean;
}

const COLORS = ['#10B981', '#F59E0B', '#F97316', '#EF4444'];
const LABELS = {
  'ANSWERED': 'Answered',
  'NO ANSWER': 'No Answer',
  'BUSY': 'Busy',
  'FAILED': 'Failed'
};

export default function CallDispositionChart({ data, isLoading = false }: CallDispositionChartProps) {
  // Process data safely
  const formattedData = useMemo(() => {
    try {
      if (!data || data.length === 0) return [];
      
      return data.map(item => ({
        name: item.disposition ? (LABELS[item.disposition as keyof typeof LABELS] || item.disposition) : 'Unknown',
        value: item.count || 0,
        percentage: item.percentage || 0,
      }));
    } catch (error) {
      console.error('Error formatting disposition chart data:', error);
      return [];
    }
  }, [data]);

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
  
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded shadow-lg">
          <p className="font-medium text-gray-800 dark:text-gray-200">{payload[0].name}</p>
          <p className="text-gray-700 dark:text-gray-300 text-sm">
            Calls: <span className="font-medium">{payload[0].value}</span>
          </p>
          <p className="text-gray-700 dark:text-gray-300 text-sm">
            Percentage: <span className="font-medium">{payload[0].payload.percentage.toFixed(1)}%</span>
          </p>
        </div>
      );
    }
    return null;
  };
  
  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
    index,
  }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    
    if (percent < 0.05) return null;

    return (
      <text
        x={x}
        y={y}
        fill="#fff"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize="12"
        fontWeight="500"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };
  
  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={formattedData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomizedLabel}
            outerRadius={110}
            fill="#8884d8"
            dataKey="value"
          >
            {formattedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            layout="horizontal" 
            verticalAlign="bottom" 
            align="center" 
            formatter={(value) => <span className="text-gray-700 dark:text-gray-300">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
} 