'use client';

import React, { useState } from 'react';
import { Space, Select, InputNumber, Row, Col, ConfigProvider, theme } from 'antd';
import { DateRangePicker } from '@/components/DateRangePicker';
import { useTheme } from 'next-themes';

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

interface AnalyticsFilterBarProps {
  onFilterChange: (filters: AnalyticsFilters) => void;
  initialFilters?: Partial<AnalyticsFilters>;
}

export const AnalyticsFilterBar: React.FC<AnalyticsFilterBarProps> = ({
  onFilterChange,
  initialFilters = {}
}) => {
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === 'dark';
  
  const [filters, setFilters] = useState<AnalyticsFilters>({
    startDate: initialFilters.startDate || '2023-01-01',
    endDate: initialFilters.endDate || '2023-01-10',
    minCalls: initialFilters.minCalls || 3,
    disposition: initialFilters.disposition || 'ANSWERED',
    direction: initialFilters.direction || 'outbound',
    sortBy: initialFilters.sortBy || 'count',
    limit: initialFilters.limit || 10
  });

  // Handle date range changes
  const handleDateChange = (value: any, dateStrings: [string, string]) => {
    if (dateStrings && dateStrings.length === 2) {
      const newFilters = {
        ...filters,
        startDate: dateStrings[0],
        endDate: dateStrings[1]
      };
      setFilters(newFilters);
      onFilterChange(newFilters);
    }
  };

  // Handle filter changes
  const handleFilterChange = (field: keyof AnalyticsFilters, value: any) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
      <ConfigProvider
        theme={{
          algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
          components: isDarkMode ? {
            Select: {
              colorBgContainer: '#1f2937', // dark:bg-gray-800
              colorText: '#f3f4f6', // text-gray-100
              colorBorder: '#374151', // border-gray-700
              colorPrimary: '#3b82f6', // blue-500
              colorTextPlaceholder: '#9ca3af', // text-gray-400
              controlItemBgActive: '#3b82f6', // blue-500
              controlItemBgHover: '#374151', // dark:bg-gray-700
            },
            InputNumber: {
              colorBgContainer: '#1f2937', // dark:bg-gray-800
              colorText: '#f3f4f6', // text-gray-100
              colorBorder: '#374151', // border-gray-700
              colorPrimary: '#3b82f6', // blue-500
              activeBorderColor: '#60a5fa', // blue-400
              hoverBorderColor: '#60a5fa', // blue-400
            }
          } : undefined
        }}
      >
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={6}>
            <div className="mb-2">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Date Range
              </label>
              <DateRangePicker
                onChange={handleDateChange}
              />
            </div>
          </Col>
          
          <Col xs={24} md={6}>
            <div className="mb-2">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Direction
              </label>
              <Select
                value={filters.direction}
                onChange={(value) => handleFilterChange('direction', value)}
                className="w-full"
                popupMatchSelectWidth={false}
              >
                <Option value="all">All</Option>
                <Option value="inbound">Inbound</Option>
                <Option value="outbound">Outbound</Option>
                <Option value="internal">Internal</Option>
              </Select>
            </div>
          </Col>
          
          <Col xs={12} md={3}>
            <div className="mb-2">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Min Calls
              </label>
              <InputNumber
                min={3}
                value={filters.minCalls}
                onChange={(value) => handleFilterChange('minCalls', value)}
                className="w-full"
              />
            </div>
          </Col>
          
          <Col xs={12} md={3}>
            <div className="mb-2">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Limit
              </label>
              <InputNumber
                min={1}
                max={100}
                value={filters.limit}
                onChange={(value) => handleFilterChange('limit', value)}
                className="w-full"
              />
            </div>
          </Col>
          
          <Col xs={12} md={3}>
            <div className="mb-2">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Disposition
              </label>
              <Select
                value={filters.disposition}
                onChange={(value) => handleFilterChange('disposition', value)}
                className="w-full"
                popupMatchSelectWidth={false}
              >
                <Option value="all">All</Option>
                <Option value="ANSWERED">Answered</Option>
                <Option value="NO_ANSWER">No Answer</Option>
                <Option value="BUSY">Busy</Option>
                <Option value="FAILED">Failed</Option>
              </Select>
            </div>
          </Col>
          
          <Col xs={12} md={3}>
            <div className="mb-2">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Sort By
              </label>
              <Select
                value={filters.sortBy}
                onChange={(value) => handleFilterChange('sortBy', value)}
                className="w-full"
                popupMatchSelectWidth={false}
              >
                <Option value="count">Call Count</Option>
                <Option value="duration">Total Duration</Option>
                <Option value="avg_duration">Avg Duration</Option>
              </Select>
            </div>
          </Col>
        </Row>
      </ConfigProvider>
    </div>
  );
}; 