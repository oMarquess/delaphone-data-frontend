'use client';

import { useState, useEffect } from 'react';
import { Drawer, ConfigProvider, theme as antTheme, Button, message, Collapse, Badge, Tooltip, Tag, Dropdown } from 'antd';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DownloadOutlined, 
  SendOutlined, 
  InfoCircleOutlined, 
  BulbOutlined, 
  RiseOutlined, 
  FallOutlined,
  CheckCircleOutlined,
  CodeOutlined,
  SettingOutlined,
  BarChartOutlined,
  ArrowUpOutlined,
  DownOutlined,
  UpOutlined,
  SyncOutlined,
  MoreOutlined
} from '@ant-design/icons';
import { useTheme } from 'next-themes';
import { useSidebar } from '@/components/navigation/SidebarContext';
import { dashboardService } from '@/services/dashboard';
import { format } from 'date-fns';
import axios from 'axios';
import { API_BASE_URL } from '@/config/constants';

// Custom event names for synchronization
const DATA_CHANGE_EVENT = 'dashboard-data-changed';
const DATE_CHANGE_EVENT = 'dashboard-date-changed';
const FILTER_CHANGE_EVENT = 'dashboard-filter-changed';

// Custom event types
interface DataChangeEvent {
  tab: string;
  data: any;
}

interface DateChangeEvent {
  startDate: string;
  endDate: string;
}

interface FilterChangeEvent {
  tab: string;
  filters: any;
}

interface AIDrawerProps {
  open: boolean;
  onClose: () => void;
}

export const AIDrawer = ({ open, onClose }: AIDrawerProps) => {
  const { theme, systemTheme } = useTheme();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { darkAlgorithm, defaultAlgorithm } = antTheme;
  const { activeTab } = useSidebar();
  const [currentTabData, setCurrentTabData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  });
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [showRawData, setShowRawData] = useState(false);

  // Check if current theme is dark
  useEffect(() => {
    const currentTheme = theme === 'system' ? systemTheme : theme;
    setIsDarkMode(currentTheme === 'dark');
  }, [theme, systemTheme]);

  // Set up event listeners for data synchronization
  useEffect(() => {
    // Function to handle date changes from any component
    const handleDateChange = (event: CustomEvent<DateChangeEvent>) => {
      const { startDate, endDate } = event.detail;
      setDateRange({ startDate, endDate });
      if (open) {
        fetchTabData(activeTab, { startDate, endDate }, activeFilters[activeTab] || {});
      }
    };

    // Function to handle filter changes from any component
    const handleFilterChange = (event: CustomEvent<FilterChangeEvent>) => {
      const { tab, filters } = event.detail;
      setActiveFilters(prev => ({ ...prev, [tab]: filters }));
      if (open && tab === activeTab) {
        fetchTabData(tab, dateRange, filters);
      }
    };

    // Function to handle direct data updates from components
    const handleDataChange = (event: CustomEvent<DataChangeEvent>) => {
      const { tab, data } = event.detail;
      if (open && tab === activeTab) {
        setCurrentTabData(data);
      }
    };

    // Add event listeners
    window.addEventListener(DATE_CHANGE_EVENT, handleDateChange as EventListener);
    window.addEventListener(FILTER_CHANGE_EVENT, handleFilterChange as EventListener);
    window.addEventListener(DATA_CHANGE_EVENT, handleDataChange as EventListener);

    // Clean up event listeners
    return () => {
      window.removeEventListener(DATE_CHANGE_EVENT, handleDateChange as EventListener);
      window.removeEventListener(FILTER_CHANGE_EVENT, handleFilterChange as EventListener);
      window.removeEventListener(DATA_CHANGE_EVENT, handleDataChange as EventListener);
    };
  }, [open, activeTab, dateRange, activeFilters]);

  // Fetch data based on active tab when drawer is opened
  useEffect(() => {
    if (open) {
      fetchTabData(activeTab, dateRange, activeFilters[activeTab] || {});
    }
  }, [open, activeTab]);

  // Function to fetch data based on active tab
  const fetchTabData = async (tab: string, dates: {startDate: string, endDate: string}, filters: any = {}) => {
    if (!open) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      let data;
      
      // Fetch different data based on active tab
      switch (tab) {
        case 'Overview':
          data = await dashboardService.getDashboardMetrics(dates.startDate, dates.endDate);
          break;
        case 'Call Logs':
          data = await dashboardService.getCallLogs(dates.startDate, dates.endDate, {
            limit: filters.limit || '20',
            sortBy: filters.sortBy || 'calldate',
            sortOrder: filters.sortOrder || 'desc',
            callDirection: filters.callDirection,
            callStatus: filters.callStatus,
            hasRecording: filters.hasRecording,
            sourceNumber: filters.sourceNumber,
            destinationNumber: filters.destinationNumber,
            minDuration: filters.minDuration,
            maxDuration: filters.maxDuration,
            did: filters.did,
            extension: filters.extension,
            callerName: filters.callerName,
            queue: filters.queue,
            uniqueCallersOnly: filters.uniqueCallersOnly,
            page: filters.page
          });
          break;
        case 'Caller Analytics':
          data = await dashboardService.getCallMetrics(
            dates.startDate, 
            dates.endDate,
            filters.disposition
          );
          break;
        case 'Agent Analytics':
          data = await dashboardService.getAgentMetrics(
            dates.startDate, 
            dates.endDate,
            filters.disposition
          );
          break;
        default:
          data = await dashboardService.getDashboardMetrics(dates.startDate, dates.endDate);
      }
      
      setCurrentTabData(data);
    } catch (err) {
      console.error('Error fetching tab data:', err);
      setError('Failed to load data for this tab');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to dispatch date change events (for other components to use)
  const publishDateChange = (startDate: string, endDate: string) => {
    const event = new CustomEvent(DATE_CHANGE_EVENT, {
      detail: { startDate, endDate }
    });
    window.dispatchEvent(event);
  };

  // Helper function to dispatch filter change events (for other components to use)
  const publishFilterChange = (tab: string, filters: any) => {
    const event = new CustomEvent(FILTER_CHANGE_EVENT, {
      detail: { tab, filters }
    });
    window.dispatchEvent(event);
  };

  // Function to send data to interpretation endpoint
  const sendToAIInterpretation = async () => {
    if (!currentTabData) return;
    
    try {
      setIsLoading(true);
      
      // Process the data based on tab type
      let processedData = currentTabData;
      
      if (activeTab === 'Overview' && processedData) {
        // Remove daily_data as requested
        const { daily_data, ...dataWithoutDaily } = processedData;
        processedData = dataWithoutDaily;
      }
      
      if (activeTab === 'Call Logs' && processedData) {
        // Remove records array from Call Logs data
        const { records, ...dataWithoutRecords } = processedData;
        processedData = dataWithoutRecords;
      }
      
      // Convert the data to a string
      const stringifiedData = JSON.stringify(processedData);
      
      // Send to backend
      const response = await axios.post(`${API_BASE_URL}/ai/interpret`, {
        data: stringifiedData,
        model: "gpt-4-0125-preview" // Default model - could be made configurable
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      
      // Handle successful response
      if (response.data) {
        // Store interpretation directly from response
        setCurrentTabData({
          ...processedData,
          interpretation: response.data.interpretation,
          model_used: response.data.model_used,
          tokens_used: response.data.tokens_used
        });
        message.success("AI interpretation completed successfully");
      }
    } catch (err: any) {
      console.error('Error sending data for interpretation:', err);
      setError(`Failed to interpret data: ${err.response?.data?.detail || err.message}`);
      message.error("Failed to interpret data");
    } finally {
      setIsLoading(false);
    }
  };

  // Function to refresh data based on active tab
  const refreshData = async () => {
    if (!open) return;
    
    setIsLoading(true);
    try {
      let data;
      
      // Fetch different data based on active tab
      switch (activeTab) {
        case 'Overview':
          data = await dashboardService.getDashboardMetrics(dateRange.startDate, dateRange.endDate);
          break;
        case 'Call Logs':
          data = await dashboardService.getCallLogs(dateRange.startDate, dateRange.endDate, 
            activeFilters[activeTab] || {
              limit: '20',
              sortBy: 'calldate',
              sortOrder: 'desc'
            }
          );
          break;
        case 'Caller Analytics':
          data = await dashboardService.getCallMetrics(
            dateRange.startDate, 
            dateRange.endDate,
            activeFilters[activeTab]?.disposition
          );
          break;
        case 'Agent Analytics':
          data = await dashboardService.getAgentMetrics(
            dateRange.startDate, 
            dateRange.endDate,
            activeFilters[activeTab]?.disposition
          );
          break;
        default:
          data = await dashboardService.getDashboardMetrics(dateRange.startDate, dateRange.endDate);
      }
      
      // Remove any previous interpretation
      const { interpretation, model_used, tokens_used, ...dataWithoutInterpretation } = data;
      
      setCurrentTabData(dataWithoutInterpretation);
      message.success("Data refreshed successfully");
      return dataWithoutInterpretation;
    } catch (err) {
      console.error('Error refreshing data:', err);
      message.error("Failed to refresh data");
      return null;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to refresh and then analyze
  const refreshAndAnalyze = async () => {
    const freshData = await refreshData();
    if (freshData) {
      // Use the fresh data for analysis
      setIsLoading(true);
      
      try {
        let processedData = freshData;
        
        if (activeTab === 'Overview' && processedData) {
          // Remove daily_data as requested
          const { daily_data, ...dataWithoutDaily } = processedData;
          processedData = dataWithoutDaily;
        }
        
        if (activeTab === 'Call Logs' && processedData) {
          // Remove records array from Call Logs data
          const { records, ...dataWithoutRecords } = processedData;
          processedData = dataWithoutRecords;
        }
        
        // Convert the data to a string
        const stringifiedData = JSON.stringify(processedData);
        
        // Send to backend
        const response = await axios.post(`${API_BASE_URL}/ai/interpret`, {
          data: stringifiedData,
          model: "gpt-4-0125-preview"
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        });
        
        // Handle successful response
        if (response.data) {
          setCurrentTabData({
            ...processedData,
            interpretation: response.data.interpretation,
            model_used: response.data.model_used,
            tokens_used: response.data.tokens_used
          });
          message.success("Data refreshed and analyzed successfully");
        }
      } catch (err: any) {
        console.error('Error analyzing refreshed data:', err);
        setError(`Failed to analyze data: ${err.response?.data?.detail || err.message}`);
        message.error("Failed to analyze refreshed data");
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Animation variants for the drawer content
  const drawerAnimationVariants = {
    hidden: { 
      opacity: 0,
      x: 20,
      scale: 0.98
    },
    visible: { 
      opacity: 1,
      x: 0,
      scale: 1,
      transition: { 
        type: "spring", 
        bounce: 0.4,
        duration: 0.6 
      }
    },
    exit: {
      opacity: 0,
      x: 10,
      scale: 0.98,
      transition: { 
        duration: 0.2 
      }
    }
  };

  // Render different difficulty badges
  const renderDifficulty = (difficulty: string) => {
    const color = 
      difficulty === 'LOW' ? 'green' : 
      difficulty === 'MEDIUM' ? 'orange' : 
      difficulty === 'HIGH' ? 'red' : 
      'blue';
    
    return (
      <Tag color={color} className="ml-2 text-xs">
        {difficulty === 'LOW' ? 'Easy' : difficulty === 'MEDIUM' ? 'Medium' : 'Challenging'}
      </Tag>
    );
  };

  // Dropdown menu for analyze options
  const analyzeMenu = {
    items: [
      {
        key: '1',
        label: 'Analyze Current Data',
        icon: <SendOutlined />,
        onClick: sendToAIInterpretation
      },
      {
        key: '2',
        label: 'Refresh & Analyze',
        icon: <SyncOutlined />,
        onClick: refreshAndAnalyze
      },
    ],
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: isDarkMode ? darkAlgorithm : defaultAlgorithm,
      }}
    >
      <Drawer
        title={`AI Assistant - ${activeTab}`}
        placement="right"
        size="large"
        onClose={onClose}
        open={open}
        rootClassName="ai-drawer-custom"
        style={{ overflow: 'hidden' }}
        styles={{
          header: { 
            background: isDarkMode ? '#1f2937' : '#ffffff',
            color: isDarkMode ? '#f9fafb' : '#111827'
          },
          body: { 
            padding: 0,
            background: isDarkMode ? '#1f2937' : '#ffffff'
          },
          mask: { backgroundColor: 'rgba(0, 0, 0, 0.65)' },
          content: { 
            boxShadow: isDarkMode 
              ? '-4px 0 12px rgba(0, 0, 0, 0.5)' 
              : '-4px 0 12px rgba(0, 0, 0, 0.15)',
            background: isDarkMode ? '#1f2937' : '#ffffff'
          },
          wrapper: {}
        }}
      >
        <AnimatePresence>
          {open && (
            <>
              {/* Export icon on left margin - repositioned for right drawer */}
              <div className="absolute left-6 top-20 z-10 flex flex-col space-y-2">
                <button 
                  className="p-2 rounded-full bg-white dark:bg-gray-700 shadow-md hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-gray-700 dark:text-gray-200"
                  aria-label="Export"
                >
                  <DownloadOutlined style={{ fontSize: '18px' }} />
                </button>
                <button 
                  className="p-2 rounded-full bg-purple-600 shadow-md hover:bg-purple-700 transition-colors text-white"
                  aria-label="Send to AI"
                  onClick={sendToAIInterpretation}
                  disabled={isLoading || !currentTabData}
                >
                  <SendOutlined style={{ fontSize: '18px' }} />
                </button>
                <Tooltip title={`${showRawData ? 'Hide' : 'Show'} Raw Data`} placement="right">
                  <button 
                    className={`p-2 transition-colors ${
                      showRawData 
                        ? 'text-blue-500 hover:text-blue-600' 
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                    aria-label="Toggle Raw Data"
                    onClick={() => setShowRawData(!showRawData)}
                  >
                    <CodeOutlined style={{ fontSize: '18px' }} />
                  </button>
                </Tooltip>
              </div>
              
              <motion.div
                className="flex flex-col h-full bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                variants={drawerAnimationVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                {/* Date range info */}
                <div className="border-b border-gray-200 dark:border-gray-700 px-16 py-3 bg-gray-50 dark:bg-gray-900">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Date Range:</span> {dateRange.startDate} to {dateRange.endDate}
                  </div>
                </div>
                
                {/* Main content with specified padding */}
                <div className="flex-1 px-16 py-[48px] overflow-y-auto">
                  {isLoading ? (
                    <div className="flex flex-col justify-center items-center h-80">
                      <div className="animate-spin h-10 w-10 border-4 border-purple-500 border-t-transparent rounded-full mb-4"></div>
                      <p className="text-gray-600 dark:text-gray-300">Analyzing your data...</p>
                    </div>
                  ) : error ? (
                    <div className="p-6 border border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-800 rounded-md">
                      <h3 className="text-red-700 dark:text-red-400 font-medium mb-2">Analysis Error</h3>
                      <p className="text-red-600 dark:text-red-400">{error}</p>
                    </div>
                  ) : (
                    <div>
                      {/* Active filters display */}
                      {activeFilters[activeTab] && Object.keys(activeFilters[activeTab]).length > 0 && (
                        <div className="mb-6 bg-purple-50 dark:bg-purple-900/20 p-3 rounded-md border border-purple-200 dark:border-purple-800">
                          <h4 className="text-sm font-medium text-purple-800 dark:text-purple-400 mb-1">Active Filters</h4>
                          <div className="text-xs text-purple-700 dark:text-purple-300 space-y-1">
                            {Object.entries(activeFilters[activeTab])
                              .filter(([_, value]) => value !== undefined && value !== null && value !== '')
                              .map(([key, value]) => (
                                <div key={key} className="flex">
                                  <span className="font-medium">{key}:</span>
                                  <span className="ml-2">{String(value)}</span>
                                </div>
                              ))
                            }
                          </div>
                        </div>
                      )}
                      
                      {/* AI Interpretation Results */}
                      {currentTabData && currentTabData.interpretation ? (
                        <div>
                          {/* Debug info - can be removed once confirmed working */}
                          <div className="mb-4 bg-gray-50 dark:bg-gray-800 p-3 rounded-md border border-gray-200 dark:border-gray-700 text-xs">
                            <details>
                              <summary className="cursor-pointer text-gray-600 dark:text-gray-400 font-medium">Debug Info (click to expand)</summary>
                              <div className="mt-2">
                                <p>Interpretation data structure:</p>
                                <pre className="bg-gray-100 dark:bg-gray-900 p-2 rounded mt-1 overflow-auto max-h-40">
                                  {JSON.stringify(currentTabData.interpretation, null, 2)}
                                </pre>
                              </div>
                            </details>
                          </div>
                          
                          <div className="mb-8">
                            <div className="flex items-center mb-4">
                              <BulbOutlined className="text-yellow-500 text-xl mr-3" />
                              <h2 className="text-xl font-medium">AI Insights</h2>
                            </div>
                            
                            {/* Key Metrics Summary */}
                            {currentTabData.interpretation.summary?.key_metrics_overview && (
                              <div className="bg-white dark:bg-gray-900 p-5 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
                                <h3 className="text-lg font-medium mb-3 text-gray-800 dark:text-gray-200">
                                  <BarChartOutlined className="text-blue-500 mr-2" /> 
                                  Key Metrics
                                </h3>
                                <p className="text-gray-700 dark:text-gray-300 text-md">
                                  {currentTabData.interpretation.summary.key_metrics_overview}
                                </p>
                              </div>
                            )}
                            
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                              {/* Trends */}
                              {currentTabData.interpretation.trends && currentTabData.interpretation.trends.length > 0 && (
                                <div className="bg-white dark:bg-gray-900 p-5 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                                  <h3 className="text-lg font-medium mb-3 text-gray-800 dark:text-gray-200">
                                    <RiseOutlined className="text-blue-500 mr-2" />
                                    Key Trends
                                  </h3>
                                  <ul className="space-y-4">
                                    {currentTabData.interpretation.trends.map((trend: any, i: number) => (
                                      <li key={i} className="border-b border-gray-100 dark:border-gray-800 pb-3 last:border-0 last:pb-0">
                                        <p className="font-medium text-gray-800 dark:text-gray-200 mb-1">{trend.trend}</p>
                                        <p className="text-gray-600 dark:text-gray-400 text-sm">{trend.significance}</p>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              
                              {/* Strengths */}
                              {currentTabData.interpretation.strengths && currentTabData.interpretation.strengths.length > 0 && (
                                <div className="bg-white dark:bg-gray-900 p-5 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                                  <h3 className="text-lg font-medium mb-3 text-gray-800 dark:text-gray-200">
                                    <CheckCircleOutlined className="text-green-500 mr-2" />
                                    Strengths
                                  </h3>
                                  <ul className="space-y-4">
                                    {currentTabData.interpretation.strengths.map((strength: any, i: number) => (
                                      <li key={i} className="border-b border-gray-100 dark:border-gray-800 pb-3 last:border-0 last:pb-0">
                                        <p className="font-medium text-gray-800 dark:text-gray-200 mb-1">{strength.area}</p>
                                        <p className="text-gray-600 dark:text-gray-400 text-sm">{strength.evidence}</p>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                              {/* Improvement Areas */}
                              {currentTabData.interpretation.improvement_areas && currentTabData.interpretation.improvement_areas.length > 0 && (
                                <div className="bg-white dark:bg-gray-900 p-5 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                                  <h3 className="text-lg font-medium mb-3 text-gray-800 dark:text-gray-200">
                                    <FallOutlined className="text-orange-500 mr-2" />
                                    Areas for Improvement
                                  </h3>
                                  <ul className="space-y-4">
                                    {currentTabData.interpretation.improvement_areas.map((area: any, i: number) => (
                                      <li key={i} className="border-b border-gray-100 dark:border-gray-800 pb-3 last:border-0 last:pb-0">
                                        <p className="font-medium text-gray-800 dark:text-gray-200 mb-1">{area.area}</p>
                                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-1"><span className="text-orange-500 font-medium">Issue:</span> {area.issue}</p>
                                        <p className="text-gray-600 dark:text-gray-400 text-sm"><span className="text-orange-500 font-medium">Impact:</span> {area.impact}</p>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              
                              {/* Recommendations */}
                              {currentTabData.interpretation.recommendations && currentTabData.interpretation.recommendations.length > 0 && (
                                <div className="bg-white dark:bg-gray-900 p-5 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                                  <h3 className="text-lg font-medium mb-3 text-gray-800 dark:text-gray-200">
                                    <SettingOutlined className="text-purple-500 mr-2" />
                                    Recommendations
                                  </h3>
                                  <ul className="space-y-4">
                                    {currentTabData.interpretation.recommendations.map((rec: any, i: number) => (
                                      <li key={i} className="border-b border-gray-100 dark:border-gray-800 pb-3 last:border-0 last:pb-0">
                                        <div className="flex items-start mb-1">
                                          <p className="font-medium text-gray-800 dark:text-gray-200">{rec.recommendation}</p>
                                          {rec.implementation_difficulty && renderDifficulty(rec.implementation_difficulty)}
                                        </div>
                                        <p className="text-gray-600 dark:text-gray-400 text-sm"><span className="text-purple-500 font-medium">Benefit:</span> {rec.expected_benefit}</p>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                            
                            {/* Model info footer */}
                            <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-md text-xs text-gray-500 dark:text-gray-400 flex justify-between">
                              <span>
                                <InfoCircleOutlined className="mr-1" /> 
                                Analysis by {currentTabData.model_used || "AI"}
                              </span>
                              {currentTabData.tokens_used && (
                                <span>Tokens: {currentTabData.tokens_used.total_tokens}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : currentTabData && !isLoading ? (
                        <div className="text-center bg-white dark:bg-gray-900 p-8 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                          <div className="text-6xl text-purple-500 mb-4 flex justify-center">
                            <BulbOutlined />
                          </div>
                          <h3 className="text-xl font-medium text-gray-800 dark:text-gray-200 mb-3">Get AI Insights for Your Data</h3>
                          <p className="text-gray-600 dark:text-gray-400 mb-6">
                            Our AI can analyze your {activeTab} data to provide valuable insights, trends, and recommendations.
                          </p>
                          <div className="flex justify-center">
                            <Dropdown menu={analyzeMenu} placement="top">
                              <Button.Group>
                                <Button
                                  type="primary"
                                  onClick={sendToAIInterpretation}
                                  disabled={isLoading}
                                  className="bg-purple-600 hover:bg-purple-700 border-purple-600 hover:border-purple-700"
                                  icon={<SendOutlined />}
                                >
                                  Analyze Data
                                </Button>
                                <Dropdown menu={analyzeMenu} placement="topRight">
                                  <Button
                                    type="primary"
                                    className="bg-purple-600 hover:bg-purple-700 border-purple-600 hover:border-purple-700"
                                    icon={<DownOutlined />}
                                  />
                                </Dropdown>
                              </Button.Group>
                            </Dropdown>
                          </div>
                        </div>
                      ) : null}
                      
                      {/* Raw Data Display (Togglable) */}
                      {showRawData && currentTabData && (
                        <div className="mt-6">
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="text-md font-medium text-gray-800 dark:text-gray-300">Raw Data</h4>
                            <button 
                              onClick={() => setShowRawData(false)} 
                              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                            >
                              <UpOutlined className="mr-1" /> Hide
                            </button>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-md">
                            <pre className="text-xs overflow-auto max-h-96">
                              {JSON.stringify(currentTabData, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                      
                      {/* Raw Data Toggle (when hidden) */}
                      {!showRawData && currentTabData && (
                        <div className="mt-6 text-center">
                          <button 
                            onClick={() => setShowRawData(true)} 
                            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 inline-flex items-center"
                          >
                            <DownOutlined className="mr-1" /> Show Raw Data
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Footer with navigation */}
                <div className="border-t border-gray-200 dark:border-gray-700 px-16 py-6 bg-white dark:bg-gray-800">
                  <div className="flex justify-between items-center">
                    <button 
                      className="flex items-center space-x-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>Previous</span>
                    </button>
                    
                    <button 
                      className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                    >
                      <span>Next</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </Drawer>
    </ConfigProvider>
  );
}; 

// Export these functions to be used in other components to publish changes
export const publishDateChange = (startDate: string, endDate: string) => {
  const event = new CustomEvent<DateChangeEvent>(DATE_CHANGE_EVENT, {
    detail: { startDate, endDate }
  });
  window.dispatchEvent(event);
};

export const publishFilterChange = (tab: string, filters: any) => {
  const event = new CustomEvent<FilterChangeEvent>(FILTER_CHANGE_EVENT, {
    detail: { tab, filters }
  });
  window.dispatchEvent(event);
}; 