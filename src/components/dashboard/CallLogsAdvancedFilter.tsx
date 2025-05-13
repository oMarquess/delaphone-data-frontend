'use client';

import { useState, useEffect } from 'react';
import { Switch, Select, Input, InputNumber, ConfigProvider, theme } from 'antd';
import { DateRangePicker } from '@/components/DateRangePicker';
import { ChevronDown } from 'lucide-react';
import { useTheme } from 'next-themes';

const { Option } = Select;

interface CallLogsAdvancedFilterProps {
  visible: boolean;
  onFilterChange: (filters: CallLogsFilterValues) => void;
  initialValues?: CallLogsFilterValues;
}

export interface CallLogsFilterValues {
  callDirection: string;
  callStatus: string;
  hasRecording: string;
  sourceNumber: string;
  destinationNumber: string;
  minDuration: string;
  maxDuration: string;
  did: string;
  extension: string;
  callerName: string;
  queue: string;
  uniqueCallersOnly: boolean;
  limit: string;
  sortBy: string;
  sortOrder: string;
  startDate?: string;
  endDate?: string;
}

export default function CallLogsAdvancedFilter({
  visible,
  onFilterChange,
  initialValues = {
    callDirection: 'all',
    callStatus: 'all',
    hasRecording: 'all',
    sourceNumber: '',
    destinationNumber: '',
    minDuration: '',
    maxDuration: '',
    did: '',
    extension: '',
    callerName: '',
    queue: '',
    uniqueCallersOnly: false,
    limit: '100',
    sortBy: 'calldate',
    sortOrder: 'desc',
    startDate: '',
    endDate: ''
  }
}: CallLogsAdvancedFilterProps) {
  const [filters, setFilters] = useState<CallLogsFilterValues>(initialValues);
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === 'dark';
  
  useEffect(() => {
    // When visibility changes to true, apply current filters
    if (visible) {
      onFilterChange(filters);
    }
  }, [visible, filters, onFilterChange]);
  
  const handleFilterChange = (key: keyof CallLogsFilterValues, value: any) => {
    const updatedFilters = { ...filters, [key]: value };
    setFilters(updatedFilters);
    onFilterChange(updatedFilters);
  };

  const handleDateRangeChange = (value: any, dateStrings: [string, string]) => {
    const updatedFilters = { 
      ...filters, 
      startDate: dateStrings[0], 
      endDate: dateStrings[1]
    };
    setFilters(updatedFilters);
    onFilterChange(updatedFilters);
  };

  if (!visible) return null;

  // Determine if hasRecording is switched on (yes), off (no), or null (all)
  const getHasRecordingState = () => {
    if (filters.hasRecording === 'yes') return true;
    if (filters.hasRecording === 'no') return false;
    return null; // For 'all' state
  };

  // Handle the switch change for hasRecording
  const handleHasRecordingChange = (checked: boolean) => {
    if (checked === true) {
      handleFilterChange('hasRecording', 'yes');
    } else {
      handleFilterChange('hasRecording', 'no');
    }
  };

  // Reset hasRecording to 'all'
  const resetHasRecording = () => {
    handleFilterChange('hasRecording', 'all');
  };
  
  // Style configuration for Ant Design components
  const commonStyles = {
    width: '100%',
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
      {/* Date Range Picker Section */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Custom Date Range</h3>
        <DateRangePicker onChange={handleDateRangeChange} />
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Select a custom date range to filter call logs
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Call Direction */}
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            Call Direction
          </label>
          <ConfigProvider theme={{ algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm }}>
            <Select
              style={commonStyles}
              value={filters.callDirection}
              onChange={(value) => handleFilterChange('callDirection', value)}
              dropdownMatchSelectWidth={true}
            >
              <Option value="all">All</Option>
              <Option value="inbound">Inbound</Option>
              <Option value="outbound">Outbound</Option>
              <Option value="internal">Internal</Option>
            </Select>
          </ConfigProvider>
        </div>
        
        {/* Call Status */}
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            Call Status
          </label>
          <ConfigProvider theme={{ algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm }}>
            <Select
              style={commonStyles}
              value={filters.callStatus}
              onChange={(value) => handleFilterChange('callStatus', value)}
              dropdownMatchSelectWidth={true}
            >
              <Option value="all">All</Option>
              <Option value="ANSWERED">Answered</Option>
              <Option value="NO ANSWER">No Answer</Option>
              <Option value="BUSY">Busy</Option>
              <Option value="FAILED">Failed</Option>
            </Select>
          </ConfigProvider>
        </div>
        
        {/* Has Recording - ANT DESIGN SWITCH */}
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            Has Recording
          </label>
          <div className="flex items-center gap-2">
            <ConfigProvider theme={{ algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm }}>
              <Switch 
                checked={getHasRecordingState() === true}
                onChange={handleHasRecordingChange}
                checkedChildren="Yes" 
                unCheckedChildren="No"
                className={filters.hasRecording === 'all' ? 'opacity-50' : ''}
              />
            </ConfigProvider>
            {filters.hasRecording !== 'all' && (
              <button 
                onClick={resetHasRecording} 
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                Reset to All
              </button>
            )}
            <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
              {filters.hasRecording === 'all' ? 'All recordings' : 
               filters.hasRecording === 'yes' ? 'With recordings only' : 
               'Without recordings only'}
            </span>
          </div>
        </div>
        
        {/* Source Number */}
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            Source Number
          </label>
          <ConfigProvider theme={{ algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm }}>
            <Input
              style={commonStyles}
              value={filters.sourceNumber}
              onChange={(e) => handleFilterChange('sourceNumber', e.target.value)}
              placeholder="Filter by source number"
            />
          </ConfigProvider>
        </div>
        
        {/* Destination Number */}
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            Destination Number
          </label>
          <ConfigProvider theme={{ algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm }}>
            <Input
              style={commonStyles}
              value={filters.destinationNumber}
              onChange={(e) => handleFilterChange('destinationNumber', e.target.value)}
              placeholder="Filter by destination number"
            />
          </ConfigProvider>
        </div>
        
        {/* Min Duration */}
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            Min Duration (seconds)
          </label>
          <ConfigProvider theme={{ algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm }}>
            <InputNumber
              style={commonStyles}
              value={filters.minDuration ? parseInt(filters.minDuration) : null}
              onChange={(value) => handleFilterChange('minDuration', value?.toString() || '')}
              placeholder="Min duration in seconds"
              min={0}
            />
          </ConfigProvider>
        </div>
        
        {/* Max Duration */}
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            Max Duration (seconds)
          </label>
          <ConfigProvider theme={{ algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm }}>
            <InputNumber
              style={commonStyles}
              value={filters.maxDuration ? parseInt(filters.maxDuration) : null}
              onChange={(value) => handleFilterChange('maxDuration', value?.toString() || '')}
              placeholder="Max duration in seconds"
              min={0}
            />
          </ConfigProvider>
        </div>
        
        {/* DID */}
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            DID Number
          </label>
          <ConfigProvider theme={{ algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm }}>
            <Input
              style={commonStyles}
              value={filters.did}
              onChange={(e) => handleFilterChange('did', e.target.value)}
              placeholder="Filter by DID number"
            />
          </ConfigProvider>
        </div>
        
        {/* Extension */}
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            Extension
          </label>
          <ConfigProvider theme={{ algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm }}>
            <Input
              style={commonStyles}
              value={filters.extension}
              onChange={(e) => handleFilterChange('extension', e.target.value)}
              placeholder="Filter by extension (≤ 5 digits)"
              maxLength={5}
            />
          </ConfigProvider>
        </div>
        
        {/* Caller Name */}
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            Caller Name
          </label>
          <ConfigProvider theme={{ algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm }}>
            <Input
              style={commonStyles}
              value={filters.callerName}
              onChange={(e) => handleFilterChange('callerName', e.target.value)}
              placeholder="Filter by caller name"
            />
          </ConfigProvider>
        </div>
        
        {/* Queue */}
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            Queue
          </label>
          <ConfigProvider theme={{ algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm }}>
            <Input
              style={commonStyles}
              value={filters.queue}
              onChange={(e) => handleFilterChange('queue', e.target.value)}
              placeholder="Filter by queue number"
            />
          </ConfigProvider>
        </div>
        
        {/* Limit */}
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            Results Limit
          </label>
          <ConfigProvider theme={{ algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm }}>
            <Select
              style={commonStyles}
              value={filters.limit}
              onChange={(value) => handleFilterChange('limit', value)}
              dropdownMatchSelectWidth={true}
            >
              <Option value="50">50</Option>
              <Option value="100">100</Option>
              <Option value="250">250</Option>
              <Option value="500">500</Option>
            </Select>
          </ConfigProvider>
        </div>
        
        {/* Sort By */}
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            Sort By
          </label>
          <ConfigProvider theme={{ algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm }}>
            <Select
              style={commonStyles}
              value={filters.sortBy}
              onChange={(value) => handleFilterChange('sortBy', value)}
              dropdownMatchSelectWidth={true}
            >
              <Option value="calldate">Call Date</Option>
              <Option value="duration">Duration</Option>
              <Option value="billsec">Billing Duration</Option>
              <Option value="src">Source</Option>
              <Option value="dst">Destination</Option>
            </Select>
          </ConfigProvider>
        </div>
        
        {/* Sort Order */}
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            Sort Order
          </label>
          <ConfigProvider theme={{ algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm }}>
            <Select
              style={commonStyles}
              value={filters.sortOrder}
              onChange={(value) => handleFilterChange('sortOrder', value)}
              dropdownMatchSelectWidth={true}
            >
              <Option value="desc">Descending</Option>
              <Option value="asc">Ascending</Option>
            </Select>
          </ConfigProvider>
        </div>
      </div>
      
      {/* Checkboxes row */}
      <div className="mt-4">
        <div className="flex items-center">
          <ConfigProvider theme={{ algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm }}>
            <Switch
              checked={filters.uniqueCallersOnly}
              onChange={(checked) => handleFilterChange('uniqueCallersOnly', checked)}
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Show unique callers only
            </span>
          </ConfigProvider>
        </div>
      </div>
    </div>
  );
} 