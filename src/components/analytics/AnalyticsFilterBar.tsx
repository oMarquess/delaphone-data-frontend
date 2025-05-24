'use client';

import React, { useState, useEffect } from 'react';
import { Space, Select, InputNumber, Row, Col, ConfigProvider, theme, Button } from 'antd';
import { useTheme } from 'next-themes';
import { Filter, RotateCcw, CalendarClock } from 'lucide-react';

const { Option } = Select;

// Define types for the filter options
export interface AnalyticsFilters {
  startDate: string;
  endDate: string;
  minCalls: number;
  disposition: string;
  direction: string;
  sortBy: string;
  limit: number;
}

type FilterBarFilters = Omit<AnalyticsFilters, 'startDate' | 'endDate'>;

interface AnalyticsFilterBarProps {
  onFilterChange: (filters: AnalyticsFilters) => void;
  initialFilters?: Partial<FilterBarFilters>;
  currentDateRange: {
    startDate: string;
    endDate: string;
  };
  onApply?: () => void;
  isLoading?: boolean;
}

export const AnalyticsFilterBar: React.FC<AnalyticsFilterBarProps> = ({
  onFilterChange,
  initialFilters = {},
  currentDateRange,
  onApply,
  isLoading = false
}) => {
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === 'dark';
  
  const defaultFilters: FilterBarFilters = {
    minCalls: 3,
    disposition: 'ANSWERED',
    direction: 'outbound',
    sortBy: 'count',
    limit: 10
  };
  
  // Keep track of applied filters (sent to API) and local filters (UI state)
  const [localFilters, setLocalFilters] = useState<FilterBarFilters>(defaultFilters);
  // Track if filters have been modified since last apply
  const [filtersModified, setFiltersModified] = useState(false);

  // Update local filters when initialFilters change
  useEffect(() => {
    const newFilters = {
      minCalls: initialFilters.minCalls || defaultFilters.minCalls,
      disposition: initialFilters.disposition || defaultFilters.disposition,
      direction: initialFilters.direction || defaultFilters.direction,
      sortBy: initialFilters.sortBy || defaultFilters.sortBy,
      limit: initialFilters.limit || defaultFilters.limit
    };
    setLocalFilters(newFilters);
    setFiltersModified(false);
  }, [initialFilters]);

  // Handle filter changes
  const handleFilterChange = (field: keyof FilterBarFilters, value: any) => {
    const newFilters = { ...localFilters, [field]: value };
    setLocalFilters(newFilters);
    setFiltersModified(true);
  };
  
  // Apply filters and call the parent component's handler
  const applyFilters = () => {
    const newFilters = {
      ...localFilters,
      startDate: currentDateRange.startDate,
      endDate: currentDateRange.endDate
    };
    onFilterChange(newFilters);
    setFiltersModified(false);
    onApply?.();
  };
  
  // Reset filters to initial values
  const resetFilters = () => {
    const defaultResetFilters = {
      minCalls: 1,
      disposition: 'all',
      direction: 'all',
      sortBy: 'count',
      limit: 100
    };
    setLocalFilters(defaultResetFilters);
    onFilterChange({
      ...defaultResetFilters,
      startDate: currentDateRange.startDate,
      endDate: currentDateRange.endDate
    });
    setFiltersModified(true);
  };

  // When the filter bar is reopened, sync local filters with last applied filters
  useEffect(() => {
    if (!filtersModified) {
      setLocalFilters(localFilters);
    }
  }, [localFilters, filtersModified]);

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
      <ConfigProvider
        theme={{
          algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
          components: isDarkMode ? {
            Select: {
              colorBgContainer: '#1f2937',
              colorText: '#f3f4f6',
              colorBorder: '#374151',
              colorPrimary: '#3b82f6',
              colorTextPlaceholder: '#9ca3af',
              controlItemBgActive: '#3b82f6',
              controlItemBgHover: '#374151',
            },
            InputNumber: {
              colorBgContainer: '#1f2937',
              colorText: '#f3f4f6',
              colorBorder: '#374151',
              colorPrimary: '#3b82f6',
              activeBorderColor: '#60a5fa',
              hoverBorderColor: '#60a5fa',
            }
          } : undefined
        }}
      >
        {/* Date Range Display */}
        <div className="mb-4 flex items-center gap-2">
          <CalendarClock size={18} className="text-blue-500 dark:text-blue-400" />
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Date Range</h3>
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">(Set in main picker)</span>
        </div>
        
        <div className="mb-6 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-md">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {currentDateRange.startDate} to {currentDateRange.endDate}
          </span>
        </div>

        {/* Call Direction and Status Group */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
            <Filter size={16} className="text-blue-500 dark:text-blue-400" />
            Call Filters
          </h3>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <div className="mb-2">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Direction
                </label>
                <Select
                  value={localFilters.direction}
                  onChange={(value) => handleFilterChange('direction', value)}
                  className="w-full"
                  popupMatchSelectWidth={false}
                  disabled={isLoading}
                >
                  <Option value="all">All</Option>
                  <Option value="inbound">Inbound</Option>
                  <Option value="outbound">Outbound</Option>
                  <Option value="internal">Internal</Option>
                </Select>
              </div>
            </Col>
            
            <Col xs={24} md={8}>
              <div className="mb-2">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Disposition
                </label>
                <Select
                  value={localFilters.disposition}
                  onChange={(value) => handleFilterChange('disposition', value)}
                  className="w-full"
                  popupMatchSelectWidth={false}
                  disabled={isLoading}
                >
                  <Option value="all">All</Option>
                  <Option value="ANSWERED">Answered</Option>
                  <Option value="NO_ANSWER">No Answer</Option>
                  <Option value="BUSY">Busy</Option>
                  <Option value="FAILED">Failed</Option>
                </Select>
              </div>
            </Col>
            
            <Col xs={24} md={8}>
              <div className="mb-2">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Sort By
                </label>
                <Select
                  value={localFilters.sortBy}
                  onChange={(value) => handleFilterChange('sortBy', value)}
                  className="w-full"
                  popupMatchSelectWidth={false}
                  disabled={isLoading}
                >
                  <Option value="count">Call Count</Option>
                  <Option value="duration">Total Duration</Option>
                  <Option value="avg_duration">Avg Duration</Option>
                </Select>
              </div>
            </Col>
          </Row>
        </div>

        {/* Results Configuration Group */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
            <RotateCcw size={16} className="text-blue-500 dark:text-blue-400" />
            Results Configuration
          </h3>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <div className="mb-2">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Minimum Calls
                </label>
                <InputNumber
                  min={3}
                  value={localFilters.minCalls}
                  onChange={(value) => handleFilterChange('minCalls', value)}
                  className="w-full"
                  disabled={isLoading}
                />
              </div>
            </Col>
            
            <Col xs={24} md={12}>
              <div className="mb-2">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Results Limit
                </label>
                <InputNumber
                  min={1}
                  max={100}
                  value={localFilters.limit}
                  onChange={(value) => handleFilterChange('limit', value)}
                  className="w-full"
                  disabled={isLoading}
                />
              </div>
            </Col>
          </Row>
        </div>
        
        {/* Action Buttons */}
        <div className="mt-8 flex flex-wrap gap-3 justify-end border-t border-gray-200 dark:border-gray-700 pt-6">
          <Button 
            onClick={resetFilters}
            icon={<RotateCcw size={16} />}
            disabled={isLoading}
          >
            Reset Filters
          </Button>
          <Button 
            type="primary" 
            onClick={applyFilters}
            icon={<Filter size={16} />}
            disabled={!filtersModified || isLoading}
            loading={isLoading}
          >
            Apply Filters
          </Button>
        </div>
      </ConfigProvider>
    </div>
  );
}; 