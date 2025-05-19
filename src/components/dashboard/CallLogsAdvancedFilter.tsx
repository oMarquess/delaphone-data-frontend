'use client';

import { useState, useEffect } from 'react';
import { Switch, Select, Input, InputNumber, ConfigProvider, Form, Space, Button, Collapse, theme } from 'antd';
import { DateRangePicker } from '@/components/DateRangePicker';
import { ChevronDown, Filter, Phone, Clock, CalendarClock, Search, RotateCcw } from 'lucide-react';
import { useTheme } from 'next-themes';

const { Option } = Select;
const { Panel } = Collapse;
const { Item } = Form;

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
  direction: string;
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
    direction: 'all',
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
  // Local state for filter values
  const [localFilters, setLocalFilters] = useState<CallLogsFilterValues>(initialValues);
  // Track if filters have been modified since last apply
  const [filtersModified, setFiltersModified] = useState(false);
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === 'dark';
  
  useEffect(() => {
    // Only set initial values when the filter becomes visible
    if (visible && !filtersModified) {
      setLocalFilters(initialValues);
    }
  }, [visible, initialValues, filtersModified]);
  
  const handleLocalFilterChange = (key: keyof CallLogsFilterValues, value: any) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
    setFiltersModified(true);
  };

  const handleDateRangeChange = (value: any, dateStrings: [string, string]) => {
    setLocalFilters(prev => ({ 
      ...prev, 
      startDate: dateStrings[0], 
      endDate: dateStrings[1]
    }));
    setFiltersModified(true);
  };

  const applyFilters = () => {
    onFilterChange(localFilters);
    setFiltersModified(false);
  };

  const resetFilters = () => {
    setLocalFilters(initialValues);
    setFiltersModified(true);
  };

  if (!visible) return null;

  // Determine if hasRecording is switched on (yes), off (no), or null (all)
  const getHasRecordingState = () => {
    if (localFilters.hasRecording === 'yes') return true;
    if (localFilters.hasRecording === 'no') return false;
    return null; // For 'all' state
  };

  // Handle the switch change for hasRecording
  const handleHasRecordingChange = (checked: boolean) => {
    if (checked === true) {
      handleLocalFilterChange('hasRecording', 'yes');
    } else {
      handleLocalFilterChange('hasRecording', 'no');
    }
  };

  // Reset hasRecording to 'all'
  const resetHasRecording = () => {
    handleLocalFilterChange('hasRecording', 'all');
  };
  
  // Style configuration for Ant Design components
  const commonStyles = {
    width: '100%',
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
      <ConfigProvider theme={{ algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm }}>
        <Form layout="vertical" colon={false}>
          {/* Date Range Section */}
          <div className="mb-4 flex items-center gap-2">
            <CalendarClock size={18} className="text-blue-500 dark:text-blue-400" />
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Date Range</h3>
          </div>
          
          <div className="mb-4">
            <DateRangePicker onChange={handleDateRangeChange} />
          </div>
          
          {/* Quick Filters Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Item label="Call Direction" className="m-0">
              <Select
                value={localFilters.callDirection}
                onChange={(value) => handleLocalFilterChange('callDirection', value)}
                popupMatchSelectWidth={true}
              >
                <Option value="all">All</Option>
                <Option value="inbound">Inbound</Option>
                <Option value="outbound">Outbound</Option>
                <Option value="internal">Internal</Option>
              </Select>
            </Item>
            
            <Item label="Call Status" className="m-0">
              <Select
                value={localFilters.callStatus}
                onChange={(value) => handleLocalFilterChange('callStatus', value)}
                popupMatchSelectWidth={true}
              >
                <Option value="all">All</Option>
                <Option value="ANSWERED">Answered</Option>
                <Option value="NO ANSWER">No Answer</Option>
                <Option value="BUSY">Busy</Option>
                <Option value="FAILED">Failed</Option>
              </Select>
            </Item>
            
            <Item label="Has Recording" className="m-0">
              <div className="flex items-center gap-2">
                <Switch 
                  checked={getHasRecordingState() === true}
                  onChange={handleHasRecordingChange}
                  checkedChildren="Yes" 
                  unCheckedChildren="No"
                  className={localFilters.hasRecording === 'all' ? 'opacity-50' : ''}
                />
                {localFilters.hasRecording !== 'all' && (
                  <button 
                    onClick={resetHasRecording} 
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Reset to All
                  </button>
                )}
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {localFilters.hasRecording === 'all' ? 'All' : 
                   localFilters.hasRecording === 'yes' ? 'With recordings' : 
                   'No recordings'}
                </span>
              </div>
            </Item>
          </div>
          
          {/* Advanced Filters - Collapsible Sections */}
          <Collapse 
            ghost 
            defaultActiveKey={['1']} 
            className="border-0 pt-0"
            items={[
              {
                key: '1',
                label: (
                  <div className="flex items-center gap-2">
                    <Phone size={16} className="text-blue-500 dark:text-blue-400" /> 
                    <span className="font-medium">Phone Numbers</span>
                  </div>
                ),
                className: "pb-0",
                children: (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                      <Item label="Source Number" className="m-0">
                        <Input
                          value={localFilters.sourceNumber}
                          onChange={(e) => handleLocalFilterChange('sourceNumber', e.target.value)}
                          placeholder="Filter by source number"
                        />
                      </Item>
                      
                      <Item label="DID Number" className="m-0">
                        <Input
                          value={localFilters.did}
                          onChange={(e) => handleLocalFilterChange('did', e.target.value)}
                          placeholder="Filter by DID number"
                        />
                      </Item>
                    </div>
                    
                    <div className="space-y-4">
                      <Item label="Destination Number" className="m-0">
                        <Input
                          value={localFilters.destinationNumber}
                          onChange={(e) => handleLocalFilterChange('destinationNumber', e.target.value)}
                          placeholder="Filter by destination number"
                        />
                      </Item>
                      
                      <Item label="Extension (≤ 5 digits)" className="m-0">
                        <Input
                          value={localFilters.extension}
                          onChange={(e) => handleLocalFilterChange('extension', e.target.value)}
                          placeholder="Filter by extension"
                          maxLength={5}
                        />
                      </Item>
                    </div>
                  </div>
                )
              },
              {
                key: '2',
                label: (
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-blue-500 dark:text-blue-400" /> 
                    <span className="font-medium">Call Details</span>
                  </div>
                ),
                children: (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                      <Item label="Min Duration (seconds)" className="m-0">
                        <InputNumber
                          style={commonStyles}
                          value={localFilters.minDuration ? parseInt(localFilters.minDuration) : null}
                          onChange={(value) => handleLocalFilterChange('minDuration', value?.toString() || '')}
                          placeholder="Minimum"
                          min={0}
                        />
                      </Item>
                      
                      <Item label="Caller Name" className="m-0">
                        <Input
                          value={localFilters.callerName}
                          onChange={(e) => handleLocalFilterChange('callerName', e.target.value)}
                          placeholder="Filter by caller name"
                        />
                      </Item>
                    </div>
                    
                    <div className="space-y-4">
                      <Item label="Max Duration (seconds)" className="m-0">
                        <InputNumber
                          style={commonStyles}
                          value={localFilters.maxDuration ? parseInt(localFilters.maxDuration) : null}
                          onChange={(value) => handleLocalFilterChange('maxDuration', value?.toString() || '')}
                          placeholder="Maximum"
                          min={0}
                        />
                      </Item>
                      
                      <Item label="Queue" className="m-0">
                        <Input
                          value={localFilters.queue}
                          onChange={(e) => handleLocalFilterChange('queue', e.target.value)}
                          placeholder="Filter by queue number"
                        />
                      </Item>
                    </div>
                  </div>
                )
              },
              {
                key: '3',
                label: (
                  <div className="flex items-center gap-2">
                    <Filter size={16} className="text-blue-500 dark:text-blue-400" /> 
                    <span className="font-medium">Result Options</span>
                  </div>
                ),
                children: (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Item label="Results Limit" className="m-0">
                        <Select
                          value={localFilters.limit}
                          onChange={(value) => handleLocalFilterChange('limit', value)}
                          popupMatchSelectWidth={true}
                        >
                          <Option value="50">50</Option>
                          <Option value="100">100</Option>
                          <Option value="250">250</Option>
                          <Option value="500">500</Option>
                          <Option value="700">700</Option>
                          <Option value="900">900</Option>
                        </Select>
                      </Item>
                      
                      <Item label="Sort By" className="m-0">
                        <Select
                          value={localFilters.sortBy}
                          onChange={(value) => handleLocalFilterChange('sortBy', value)}
                          popupMatchSelectWidth={true}
                        >
                          <Option value="calldate">Call Date</Option>
                          <Option value="duration">Duration</Option>
                          <Option value="billsec">Billing Duration</Option>
                          <Option value="src">Source</Option>
                          <Option value="dst">Destination</Option>
                        </Select>
                      </Item>
                      
                      <Item label="Sort Order" className="m-0">
                        <Select
                          value={localFilters.sortOrder}
                          onChange={(value) => handleLocalFilterChange('sortOrder', value)}
                          popupMatchSelectWidth={true}
                        >
                          <Option value="desc">Descending</Option>
                          <Option value="asc">Ascending</Option>
                        </Select>
                      </Item>
                    </div>
                    
                    <div className="mt-4 ml-1">
                      <Switch
                        checked={localFilters.uniqueCallersOnly}
                        onChange={(checked) => handleLocalFilterChange('uniqueCallersOnly', checked)}
                      />
                      <span className="ml-2 text-sm">
                        Show unique callers only
                      </span>
                    </div>
                  </>
                )
              }
            ]}
          />
          
          {/* Action Buttons */}
          <div className="mt-6 flex flex-wrap gap-3 justify-end">
            <Button 
              onClick={resetFilters}
              icon={<RotateCcw size={16} />}
            >
              Reset Filters
            </Button>
            <Button 
              type="primary" 
              onClick={applyFilters}
              icon={<Search size={16} />}
              disabled={!filtersModified}
            >
              Apply Filters
            </Button>
          </div>
        </Form>
      </ConfigProvider>
    </div>
  );
} 