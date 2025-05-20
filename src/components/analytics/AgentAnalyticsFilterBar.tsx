'use client';

import React, { useState, useEffect } from 'react';
import { Space, Select, InputNumber, Row, Col, ConfigProvider, theme, Button } from 'antd';
import { DateRangePicker } from '@/components/DateRangePicker';
import { useTheme } from 'next-themes';
import { Filter, RotateCcw } from 'lucide-react';
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

  // Update local filters when initialFilters changes
  useEffect(() => {
    if (initialFilters) {
      setLocalFilters(prev => ({
        ...prev,
        ...initialFilters
      }));
    }
  }, [initialFilters]);

  const handleDateChange = (value: any, dateStrings: [string, string]) => {
    if (dateStrings[0] && dateStrings[1]) {
      setLocalFilters(prev => ({
        ...prev,
        startDate: dateStrings[0],
        endDate: dateStrings[1]
      }));
    }
  };

  const handleFilterChange = (field: keyof AgentAnalyticsFilters, value: any) => {
    setLocalFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleApplyFilters = () => {
    onFilterChange(localFilters);
  };

  const handleResetFilters = () => {
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
    setLocalFilters(resetFilters);
    onFilterChange(resetFilters);
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: isDarkMode ? darkAlgorithm : defaultAlgorithm,
      }}
    >
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 space-y-6">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={8}>
            <div className="mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Date Range</label>
              <DateRangePicker
                onChange={handleDateChange}
                startDate={localFilters.startDate}
                endDate={localFilters.endDate}
              />
            </div>
          </Col>
          
          <Col xs={24} md={16}>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={8}>
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
              </Col>
              
              <Col xs={24} sm={12} md={8}>
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
              </Col>
              
              <Col xs={24} sm={12} md={8}>
                <div className="mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Call Disposition</label>
                  <Select
                    value={localFilters.disposition}
                    onChange={(value) => handleFilterChange('disposition', value)}
                    className="w-full"
                  >
                    <Option value="all">All Dispositions</Option>
                    <Option value="ANSWERED">Answered</Option>
                    <Option value="NO ANSWER">No Answer</Option>
                    <Option value="BUSY">Busy</Option>
                    <Option value="FAILED">Failed</Option>
                  </Select>
                </div>
              </Col>
            </Row>
          </Col>
        </Row>
        
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
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
          </Col>
          
          <Col xs={24} sm={12} md={6}>
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
          </Col>
          
          <Col xs={24} sm={12} md={6}>
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
          </Col>
          
          <Col xs={24} sm={12} md={6} className="flex items-end">
            <Space className="w-full">
              <Button 
                type="primary" 
                onClick={handleApplyFilters}
                className="bg-green-600 hover:bg-green-700 border-green-600"
                icon={<Filter className="h-4 w-4 mr-1" />}
              >
                Apply Filters
              </Button>
              <Button 
                onClick={handleResetFilters}
                icon={<RotateCcw className="h-4 w-4 mr-1" />}
              >
                Reset
              </Button>
            </Space>
          </Col>
        </Row>
      </div>
    </ConfigProvider>
  );
}; 