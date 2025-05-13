'use client';

import React from 'react';
import { format, sub, startOfDay, endOfDay } from 'date-fns';
import { FilterIcon } from 'lucide-react';

interface QuickDateSelectorProps {
  onChange: (startDate: string, endDate: string, label: string) => void;
  activeLabel: string;
  filterVisible?: boolean;
}

const datePresets = [
  {
    label: 'Today',
    getValue: () => {
      const today = new Date();
      return {
        start: format(startOfDay(today), 'yyyy-MM-dd'),
        end: format(endOfDay(today), 'yyyy-MM-dd')
      };
    }
  },
  {
    label: 'Yesterday',
    getValue: () => {
      const yesterday = sub(new Date(), { days: 1 });
      return {
        start: format(startOfDay(yesterday), 'yyyy-MM-dd'),
        end: format(endOfDay(yesterday), 'yyyy-MM-dd')
      };
    }
  },
  {
    label: 'Last 7 Days',
    getValue: () => {
      const today = new Date();
      const lastWeek = sub(today, { days: 6 });
      return {
        start: format(startOfDay(lastWeek), 'yyyy-MM-dd'),
        end: format(endOfDay(today), 'yyyy-MM-dd')
      };
    }
  },
  {
    label: 'Last 30 Days',
    getValue: () => {
      const today = new Date();
      const lastMonth = sub(today, { days: 29 });
      return {
        start: format(startOfDay(lastMonth), 'yyyy-MM-dd'),
        end: format(endOfDay(today), 'yyyy-MM-dd')
      };
    }
  },
  {
    label: 'This Month',
    getValue: () => {
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      return {
        start: format(firstDay, 'yyyy-MM-dd'),
        end: format(endOfDay(today), 'yyyy-MM-dd')
      };
    }
  },
  {
    label: 'Custom',
    getValue: () => ({ start: '', end: '' }) // Custom will be handled separately
  }
];

export default function QuickDateSelector({ 
  onChange, 
  activeLabel,
  filterVisible = false
}: QuickDateSelectorProps) {
  const handleSelect = (preset: typeof datePresets[0]) => {
    const { start, end } = preset.getValue();
    onChange(start, end, preset.label);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {datePresets.map((preset) => {
        // Special styling for Custom when filters are visible
        const isCustomActive = preset.label === 'Custom' && activeLabel === 'Custom';
        const customWithFilters = isCustomActive && filterVisible;
        
        return (
          <button
            key={preset.label}
            onClick={() => handleSelect(preset)}
            className={`px-3 py-1 text-sm rounded-full transition-colors flex items-center gap-1 ${
              preset.label === activeLabel
                ? customWithFilters
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700'
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                : 'bg-white text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
            }`}
          >
            {preset.label === 'Custom' && isCustomActive && filterVisible && (
              <FilterIcon size={14} className={customWithFilters ? 'text-indigo-500 dark:text-indigo-400' : ''} />
            )}
            {preset.label}
          </button>
        );
      })}
    </div>
  );
} 