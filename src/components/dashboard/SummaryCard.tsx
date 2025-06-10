'use client';

import { ReactNode, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ChevronsLeftRight, MoreHorizontal } from 'lucide-react';

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
  onExplainClick?: () => void;
  explanationId?: string;
}

export default function SummaryCard({ 
  title, 
  value, 
  icon, 
  trend, 
  className = '',
  isLoading = false,
  onExplainClick,
  explanationId
}: SummaryCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 relative group',
        className
      )}
    >
      <div className="flex justify-between items-start">
        <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">{title}</h3>
        <div className="flex items-center space-x-2">
          {icon && <div className="text-gray-400 dark:text-gray-500">{icon}</div>}
          
          {/* Animated Explanation Icon */}
          {onExplainClick && (
            <motion.button
              onClick={onExplainClick}
              className="p-1.5 rounded-full bg-gray-50 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-all duration-300"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 1 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              <motion.div
                animate={{ 
                  rotate: isHovered ? [0, 15, -15, 0] : 0,
                }}
                transition={{ 
                  duration: 0.6,
                  ease: "easeInOut"
                }}
              >
                <motion.div
                  animate={{
                    scale: isHovered ? [1, 1.2, 1] : 1
                  }}
                  transition={{
                    duration: 1,
                    repeat: isHovered ? Infinity : 0,
                    ease: "easeInOut"
                  }}
                >
                  {isHovered ? (
                    <MoreHorizontal size={14} />
                  ) : (
                    <ChevronsLeftRight size={14} />
                  )}
                </motion.div>
              </motion.div>
            </motion.button>
          )}
        </div>
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