'use client';

import React, { useState, useEffect } from 'react';
import { Space, Select, InputNumber, Row, Col, ConfigProvider, theme, Button } from 'antd';
import { useTheme } from 'next-themes';
import { Filter, RotateCcw, Phone, Clock, CalendarClock } from 'lucide-react';
import { AnalyticsFilters } from './AnalyticsFilterBar';

const { Option } = Select;

// Extended filters for agent analytics
export interface AgentAnalyticsFilters extends AnalyticsFilters {
  agent?: string;
}

interface AgentData {
  agent: string;
  agent_cnam: string;
}

interface AgentAnalyticsFilterBarProps {
  onFilterChange: (filters: AgentAnalyticsFilters) => void;
  initialFilters?: Partial<AgentAnalyticsFilters>;
  agents?: AgentData[];
}

export const AgentAnalyticsFilterBar: React.FC<AgentAnalyticsFilterBarProps> = ({
  onFilterChange,
  initialFilters = {},
  agents = []
}) => {
  const { theme: currentTheme } = useTheme();
  const { darkAlgorithm, defaultAlgorithm } = theme;
  const isDarkMode = currentTheme === 'dark';

  // Local state for filter values
  const [localFilters, setLocalFilters] = useState<AgentAnalyticsFilters>({
    startDate: initialFilters.startDate || '',
    endDate: initialFilters.endDate || '',
    minCalls: initialFilters.minCalls || 5,
    disposition: initialFilters.disposition || 'all',
    direction: initialFilters.direction || 'all',
    sortBy: initialFilters.sortBy || 'call_count',
    limit: initialFilters.limit || 100,
    agent: initialFilters.agent || 'all'
  });

  // Track if filters have been modified since last apply
  const [filtersModified, setFiltersModified] = useState(false);

  // Update local filters when initialFilters changes
  useEffect(() => {
    if (initialFilters) {
      setLocalFilters(prev => ({
        ...prev,
        ...initialFilters
      }));
    }
  }, [initialFilters]);

  const handleFilterChange = (field: keyof AgentAnalyticsFilters, value: any) => {
    console.group('Filter Bar - Filter Change');
    console.log('1. Field changed:', field);
    console.log('2. New value:', value);
    
    // Format values to match API expectations
    let formattedValue = value;
    if (field === 'disposition' && value !== 'all') {
      formattedValue = value.replace(' ', '_').toUpperCase();
      console.log('3. Formatted disposition value:', formattedValue);
    } else if (field === 'direction' && value !== 'all') {
      formattedValue = value.toUpperCase();
      console.log('3. Formatted direction value:', formattedValue);
    }
    
    setLocalFilters(prev => {
      const newFilters = {
        ...prev,
        [field]: formattedValue
      };
      console.log('4. Updated local filters:', newFilters);
      return newFilters;
    });
    setFiltersModified(true);
    console.groupEnd();
  };

  const handleApplyFilters = () => {
    console.group('Filter Bar - Apply Filters');
    console.log('1. Current local filters:', localFilters);
    console.log('2. Calling onFilterChange with filters');
    onFilterChange(localFilters);
    setFiltersModified(false);
    console.groupEnd();
  };

  const handleResetFilters = () => {
    console.group('Filter Bar - Reset Filters');
    const resetFilters: AgentAnalyticsFilters = {
      startDate: initialFilters.startDate || '',
      endDate: initialFilters.endDate || '',
      minCalls: 5,
      disposition: 'all',
      direction: 'all',
      sortBy: 'call_count',
      limit: 100,
      agent: 'all'
    };
    console.log('1. Reset filters to:', resetFilters);
    setLocalFilters(resetFilters);
    setFiltersModified(true);
    console.log('2. Calling onFilterChange with reset filters');
    onFilterChange(resetFilters);
    console.groupEnd();
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: isDarkMode ? darkAlgorithm : defaultAlgorithm,
      }}
    >
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 space-y-6">
        {/* Quick Filters Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="mb-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Agent</label>
            <Select
              value={localFilters.agent}
              onChange={(value) => handleFilterChange('agent', value)}
              className="w-full"
              placeholder="Select agent"
            >
              <Option value="all">All Agents</Option>
              {agents.map(agent => (
                <Option key={agent.agent} value={agent.agent}>
                  {agent.agent_cnam || `Agent ${agent.agent}`}
                </Option>
              ))}
            </Select>
          </div>
          
          <div className="mb-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Call Direction</label>
            <Select
              value={localFilters.direction}
              onChange={(value) => handleFilterChange('direction', value)}
              className="w-full"
            >
              <Option value="all">All Directions</Option>
              <Option value="inbound">Inbound</Option>
              <Option value="outbound">Outbound</Option>
              <Option value="internal">Internal</Option>
            </Select>
          </div>
          
          <div className="mb-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Call Disposition</label>
            <Select
              value={localFilters.disposition}
              onChange={(value) => handleFilterChange('disposition', value)}
              className="w-full"
            >
              <Option value="all">All Dispositions</Option>
              <Option value="ANSWERED">Answered</Option>
              <Option value="NO_ANSWER">No Answer</Option>
              <Option value="BUSY">Busy</Option>
              <Option value="FAILED">Failed</Option>
            </Select>
          </div>
        </div>
        
        {/* Result Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="mb-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Min Calls</label>
            <InputNumber
              value={localFilters.minCalls}
              onChange={(value) => handleFilterChange('minCalls', value)}
              className="w-full"
              min={1}
              max={1000}
            />
          </div>
          
          <div className="mb-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Sort By</label>
            <Select
              value={localFilters.sortBy}
              onChange={(value) => handleFilterChange('sortBy', value)}
              className="w-full"
            >
              <Option value="call_count">Call Count</Option>
              <Option value="answer_rate">Answer Rate</Option>
              <Option value="avg_duration">Average Duration</Option>
              <Option value="efficiency_score">Efficiency Score</Option>
            </Select>
          </div>
          
          <div className="mb-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Limit</label>
            <InputNumber
              value={localFilters.limit}
              onChange={(value) => handleFilterChange('limit', value)}
              className="w-full"
              min={1}
              max={100}
            />
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <Button 
            onClick={handleResetFilters}
            icon={<RotateCcw size={16} />}
          >
            Reset Filters
          </Button>
          <Button 
            type="primary" 
            onClick={handleApplyFilters}
            icon={<Filter size={16} />}
            disabled={!filtersModified}
            className="bg-green-600 hover:bg-green-700 border-green-600"
          >
            Apply Filters
          </Button>
        </div>
      </div>
    </ConfigProvider>
  );
}; 