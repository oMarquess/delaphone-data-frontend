'use client';

import React from 'react';
import { Card, Switch, Select, Divider, Badge, Button, Tooltip, Alert } from 'antd';
import { 
  SettingOutlined, 
  ClockCircleOutlined, 
  EyeOutlined, 
  ReloadOutlined,
  InfoCircleOutlined,
  RestOutlined,
  DashboardOutlined,
  PhoneOutlined,
  UserOutlined,
  TeamOutlined
} from '@ant-design/icons';
import { useSettings } from '@/context/SettingsContext';

const { Option } = Select;

export default function SettingsPage() {
  const { 
    autoRefresh, 
    updateAutoRefreshSettings, 
    resetToDefaults,
    isRefreshing,
    lastRefreshTime 
  } = useSettings();

  const refreshIntervalOptions = [
    { value: 15000, label: '15 seconds', description: 'Very frequent (high data usage)' },
    { value: 30000, label: '30 seconds', description: 'Frequent (recommended)' },
    { value: 60000, label: '1 minute', description: 'Moderate' },
    { value: 120000, label: '2 minutes', description: 'Conservative' },
    { value: 300000, label: '5 minutes', description: 'Minimal' },
    { value: 0, label: 'Manual only', description: 'No automatic refresh' },
  ];

  const handleSectionToggle = (section: keyof typeof autoRefresh.enabledSections, enabled: boolean) => {
    updateAutoRefreshSettings({
      enabledSections: {
        ...autoRefresh.enabledSections,
        [section]: enabled,
      },
    });
  };

  const getIntervalDescription = (interval: number) => {
    const option = refreshIntervalOptions.find(opt => opt.value === interval);
    return option?.description || '';
  };

  const formatLastRefreshTime = (time: Date | null) => {
    if (!time) return 'Never';
    return time.toLocaleTimeString();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Configure auto-refresh and dashboard preferences
          </p>
        </div>
        <Button 
          onClick={resetToDefaults}
          icon={<ReloadOutlined />}
          type="default"
        >
          Reset to Defaults
        </Button>
      </div>
      
      {/* Status Card */}
      <Card className="border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${
              autoRefresh.enabled && autoRefresh.interval > 0 
                ? (isRefreshing ? 'bg-blue-500 animate-pulse' : 'bg-green-500') 
                : 'bg-gray-400'
            }`} />
            <div>
              <h3 className="font-medium text-gray-800 dark:text-gray-200">
                Auto-Refresh Status
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {autoRefresh.enabled && autoRefresh.interval > 0 
                  ? `Active - refreshing every ${autoRefresh.interval / 1000}s`
                  : 'Disabled'
                }
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600 dark:text-gray-400">Last refresh</p>
            <p className="font-medium text-gray-800 dark:text-gray-200">
              {formatLastRefreshTime(lastRefreshTime)}
            </p>
          </div>
        </div>
      </Card>

      {/* Main Auto-Refresh Settings */}
      <Card 
        title={
          <div className="flex items-center space-x-2">
            <SettingOutlined className="text-blue-500" />
            <span>Auto-Refresh Configuration</span>
          </div>
        }
        className="border border-gray-200 dark:border-gray-700"
      >
        <div className="space-y-6">
          {/* Master Toggle */}
          <div className="flex items-center justify-between">
          <div>
              <h4 className="font-medium text-gray-800 dark:text-gray-200">
                Enable Auto-Refresh
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Automatically update dashboard data in the background
              </p>
            </div>
            <Switch
              checked={autoRefresh.enabled}
              onChange={(enabled) => updateAutoRefreshSettings({ enabled })}
              size="default"
            />
          </div>
          
          <Divider />

          {/* Refresh Interval */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <ClockCircleOutlined className="text-green-500" />
              <h4 className="font-medium text-gray-800 dark:text-gray-200">
                Refresh Interval
              </h4>
            </div>
            <Select
              value={autoRefresh.interval}
              onChange={(interval) => updateAutoRefreshSettings({ interval })}
              className="w-full"
              disabled={!autoRefresh.enabled}
            >
              {refreshIntervalOptions.map((option) => (
                <Option key={option.value} value={option.value}>
                  <div className="flex justify-between items-center">
                    <span>{option.label}</span>
                    <span className="text-xs text-gray-500">{option.description}</span>
                  </div>
                </Option>
              ))}
            </Select>
            <Alert
              message={getIntervalDescription(autoRefresh.interval)}
              type="info"
              showIcon
              className="text-xs"
            />
          </div>
          
          <Divider />

          {/* Section-Specific Settings */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <DashboardOutlined className="text-purple-500" />
              <h4 className="font-medium text-gray-800 dark:text-gray-200">
                Auto-Refresh Sections
              </h4>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Choose which sections should auto-refresh. Disabling sections you don&apos;t actively monitor can improve performance.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <DashboardOutlined className="text-blue-500" />
                  <div>
                    <span className="font-medium text-gray-800 dark:text-gray-200">Overview</span>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Dashboard metrics & charts</p>
                  </div>
                </div>
                <Switch
                  checked={autoRefresh.enabledSections.overview}
                  onChange={(enabled) => handleSectionToggle('overview', enabled)}
                  disabled={!autoRefresh.enabled}
                  size="small"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <PhoneOutlined className="text-green-500" />
                  <div>
                    <span className="font-medium text-gray-800 dark:text-gray-200">Call Logs</span>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Recent call records</p>
                  </div>
                </div>
                <Switch
                  checked={autoRefresh.enabledSections.callLogs}
                  onChange={(enabled) => handleSectionToggle('callLogs', enabled)}
                  disabled={!autoRefresh.enabled}
                  size="small"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <UserOutlined className="text-orange-500" />
          <div>
                    <span className="font-medium text-gray-800 dark:text-gray-200">Caller Analytics</span>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Caller behavior metrics</p>
                  </div>
                </div>
                <Switch
                  checked={autoRefresh.enabledSections.callerAnalytics}
                  onChange={(enabled) => handleSectionToggle('callerAnalytics', enabled)}
                  disabled={!autoRefresh.enabled}
                  size="small"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <TeamOutlined className="text-purple-500" />
                  <div>
                    <span className="font-medium text-gray-800 dark:text-gray-200">Agent Analytics</span>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Agent performance data</p>
                  </div>
                </div>
                <Switch
                  checked={autoRefresh.enabledSections.agentAnalytics}
                  onChange={(enabled) => handleSectionToggle('agentAnalytics', enabled)}
                  disabled={!autoRefresh.enabled}
                  size="small"
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Additional Settings */}
      <Card 
        title={
          <div className="flex items-center space-x-2">
            <EyeOutlined className="text-green-500" />
            <span>Display Preferences</span>
          </div>
        }
        className="border border-gray-200 dark:border-gray-700"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-800 dark:text-gray-200">
                Visual Indicators
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Show refresh status and last update times
              </p>
            </div>
            <Switch
              checked={autoRefresh.visualIndicators}
              onChange={(visualIndicators) => updateAutoRefreshSettings({ visualIndicators })}
              size="default"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-800 dark:text-gray-200">
                Pause on User Activity
                <Tooltip title="Temporarily pause auto-refresh when user is actively interacting with the dashboard">
                  <InfoCircleOutlined className="ml-2 text-gray-400" />
                </Tooltip>
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Reduce interruptions during active use
              </p>
            </div>
            <Switch
              checked={autoRefresh.pauseOnUserActivity}
              onChange={(pauseOnUserActivity) => updateAutoRefreshSettings({ pauseOnUserActivity })}
              size="default"
            />
          </div>
        </div>
      </Card>

      {/* Info Card */}
      <Card className="border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
        <div className="flex items-start space-x-3">
          <InfoCircleOutlined className="text-blue-500 mt-1" />
          <div>
            <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">
              Performance Tips
            </h4>
            <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
              <li>• Lower refresh rates improve battery life on mobile devices</li>
              <li>• Disable auto-refresh for sections you don&apos;t actively monitor</li>
              <li>• Visual indicators help track data freshness without interrupting workflow</li>
              <li>• Manual refresh is always available regardless of auto-refresh settings</li>
            </ul>
          </div>
      </div>
      </Card>
    </div>
  );
} 