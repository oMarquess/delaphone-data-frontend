'use client';

import { useState } from 'react';
import { CalendarIcon } from 'lucide-react';
import { format, subDays, startOfMonth } from 'date-fns';

const presets = [
  { label: 'Today', value: 'today', getRange: () => {
    const today = new Date();
    return { startDate: today, endDate: today };
  }},
  { label: 'Yesterday', value: 'yesterday', getRange: () => {
    const yesterday = subDays(new Date(), 1);
    return { startDate: yesterday, endDate: yesterday };
  }},
  { label: 'Last 7 days', value: 'last7days', getRange: () => {
    return { startDate: subDays(new Date(), 6), endDate: new Date() };
  }},
  { label: 'Last 30 days', value: 'last30days', getRange: () => {
    return { startDate: subDays(new Date(), 29), endDate: new Date() };
  }},
  { label: 'This month', value: 'thismonth', getRange: () => {
    return { startDate: startOfMonth(new Date()), endDate: new Date() };
  }},
];

interface DateRangePickerProps {
  onChange: (startDate: Date, endDate: Date) => void;
  className?: string;
}

export default function DateRangePicker({ onChange, className = '' }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState('last7days');
  const [dateRange, setDateRange] = useState(() => presets.find(p => p.value === 'last7days')?.getRange() || { 
    startDate: subDays(new Date(), 6), 
    endDate: new Date() 
  });
  
  const handlePresetChange = (preset: string) => {
    const selectedPresetObj = presets.find(p => p.value === preset);
    if (selectedPresetObj) {
      const range = selectedPresetObj.getRange();
      setDateRange(range);
      setSelectedPreset(preset);
      onChange(range.startDate, range.endDate);
    }
    setIsOpen(false);
  };
  
  const formatDateRange = () => {
    const { startDate, endDate } = dateRange;
    
    if (startDate.toDateString() === endDate.toDateString()) {
      return format(startDate, 'MMM d, yyyy');
    }
    
    return `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`;
  };
  
  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700"
      >
        <span className="flex items-center">
          <CalendarIcon className="mr-2 h-4 w-4 text-gray-500 dark:text-gray-400" />
          <span className="text-gray-700 dark:text-gray-300">{formatDateRange()}</span>
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
      
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 shadow-lg rounded-md border border-gray-200 dark:border-gray-700">
          <div className="p-2">
            {presets.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => handlePresetChange(preset.value)}
                className={`w-full text-left px-3 py-2 text-sm rounded-md my-1 ${
                  selectedPreset === preset.value 
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' 
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 