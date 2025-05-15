'use client';

import { useState, useEffect } from 'react';
import { Drawer, ConfigProvider, theme as antTheme } from 'antd';
import { motion, AnimatePresence } from 'framer-motion';
import { DownloadOutlined } from '@ant-design/icons';
import { useTheme } from 'next-themes';
import { useSidebar } from '@/components/navigation/SidebarContext';
import { dashboardService } from '@/services/dashboard';
import { format } from 'date-fns';

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
        case 'Call Analytics':
          data = await dashboardService.getCallMetrics(
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
              <div className="absolute left-6 top-20 z-10">
                <button 
                  className="p-2 rounded-full bg-white dark:bg-gray-700 shadow-md hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-gray-700 dark:text-gray-200"
                  aria-label="Export"
                >
                  <DownloadOutlined style={{ fontSize: '18px' }} />
                </button>
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
                <div className="flex-1 px-16 py-[48px]">
                  {isLoading ? (
                    <div className="flex justify-center items-center h-full">
                      <div className="animate-spin h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full"></div>
                    </div>
                  ) : error ? (
                    <div className="p-4 border border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-800 rounded-md">
                      <p className="text-red-600 dark:text-red-400">{error}</p>
                    </div>
                  ) : (
                    <div>
                      <h3 className="font-medium text-lg mb-4">AI insights for {activeTab}</h3>
                      
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
                      
                      {/* Contextual data display */}
                      {currentTabData && (
                        <div className="space-y-4">
                          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-md">
                            <h4 className="text-sm font-medium mb-2">Data from {activeTab}</h4>
                            <pre className="text-xs overflow-auto max-h-96">
                              {JSON.stringify(currentTabData, null, 2)}
                            </pre>
                          </div>
                          
                          <p className="text-gray-600 dark:text-gray-300">
                            AI assistant analysis will process this data to provide insights.
                          </p>
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