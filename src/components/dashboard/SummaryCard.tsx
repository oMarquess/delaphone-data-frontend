'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SummaryCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
    label?: string;
  };
  className?: string;
  isLoading?: boolean;
}

export default function SummaryCard({ 
  title, 
  value, 
  icon, 
  trend, 
  className = '',
  isLoading = false
}: SummaryCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700',
        className
      )}
    >
      <div className="flex justify-between items-start">
        <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">{title}</h3>
        {icon && <div className="text-gray-400 dark:text-gray-500">{icon}</div>}
      </div>
      
      {isLoading ? (
        <div className="mt-2 h-8 animate-pulse bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
      ) : (
        <p className="text-3xl font-bold text-gray-800 dark:text-gray-100 mt-2">{value}</p>
      )}
      
      {trend && !isLoading && (
        <div className={`mt-2 text-sm ${
          trend.isPositive 
            ? 'text-green-600 dark:text-green-400'
            : 'text-red-600 dark:text-red-400'
        }`}>
          <span className="flex items-center">
            {trend.isPositive ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
            {Math.abs(trend.value)}% {trend.label || 'from last period'}
          </span>
        </div>
      )}
    </motion.div>
  );
} 