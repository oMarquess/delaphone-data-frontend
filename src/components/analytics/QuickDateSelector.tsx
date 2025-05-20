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
    },
    activeClass: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 border border-blue-200 dark:border-blue-800',
    hoverClass: 'hover:bg-blue-50/50 hover:text-blue-700 dark:hover:bg-blue-900/10 dark:hover:text-blue-300'
  },
  {
    label: 'Yesterday',
    getValue: () => {
      const yesterday = sub(new Date(), { days: 1 });
      return {
        start: format(startOfDay(yesterday), 'yyyy-MM-dd'),
        end: format(endOfDay(yesterday), 'yyyy-MM-dd')
      };
    },
    activeClass: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300 border border-purple-200 dark:border-purple-800',
    hoverClass: 'hover:bg-purple-50/50 hover:text-purple-700 dark:hover:bg-purple-900/10 dark:hover:text-purple-300'
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
    },
    activeClass: 'bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-300 border border-teal-200 dark:border-teal-800',
    hoverClass: 'hover:bg-teal-50/50 hover:text-teal-700 dark:hover:bg-teal-900/10 dark:hover:text-teal-300'
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
    },
    activeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
    hoverClass: 'hover:bg-amber-50/50 hover:text-amber-700 dark:hover:bg-amber-900/10 dark:hover:text-amber-300'
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
    },
    activeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
    hoverClass: 'hover:bg-emerald-50/50 hover:text-emerald-700 dark:hover:bg-emerald-900/10 dark:hover:text-emerald-300'
  },
  {
    label: 'Custom',
    getValue: () => ({ start: '', end: '' }), // Custom will be handled separately
    activeClass: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800',
    hoverClass: 'hover:bg-indigo-50/50 hover:text-indigo-700 dark:hover:bg-indigo-900/10 dark:hover:text-indigo-300'
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
        const isActive = preset.label === activeLabel;
        const isCustomWithFilters = preset.label === 'Custom' && isActive && filterVisible;
        
        return (
          <button
            key={preset.label}
            onClick={() => handleSelect(preset)}
            className={`px-3 py-1 text-sm rounded-full transition-all flex items-center gap-1 ${
              isActive
                ? preset.activeClass
                : `bg-white text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700 ${preset.hoverClass}`
            }`}
          >
            {preset.label === 'Custom' && isActive && filterVisible && (
              <FilterIcon size={14} className="text-indigo-500 dark:text-indigo-400" />
            )}
            {preset.label}
          </button>
        );
      })}
    </div>
  );
} 