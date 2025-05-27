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
  MoreOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import { useTheme } from 'next-themes';
import { useSidebar } from '@/components/navigation/SidebarContext';
import { dashboardService } from '@/services/dashboard';
import { format } from 'date-fns';
import axios from 'axios';
import { API_BASE_URL } from '@/config/constants';
import TokenManager from '@/services/tokenManager';

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
  const [selectedModel, setSelectedModel] = useState('gpt-4-turbo'); // Default model
  const [dateRange, setDateRange] = useState({
    startDate: format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  });
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [showRawData, setShowRawData] = useState(false);
  
  // NEW: Persistent interpretations storage
  const [persistentInterpretations, setPersistentInterpretations] = useState<Record<string, any>>({});

  // NEW: Load persistent interpretations from localStorage on component mount
  useEffect(() => {
    const stored = localStorage.getItem('aiDrawerInterpretations');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        console.log('=== LOADED PERSISTENT INTERPRETATIONS ===');
        console.log('Stored data keys:', Object.keys(parsed));
        setPersistentInterpretations(parsed);
      } catch (err) {
        console.error('Failed to parse stored interpretations:', err);
      }
    }
  }, []);

  // NEW: Save interpretations to localStorage whenever they change
  useEffect(() => {
    if (Object.keys(persistentInterpretations).length > 0) {
      console.log('=== SAVING INTERPRETATIONS TO STORAGE ===');
      console.log('Saving interpretations for tabs:', Object.keys(persistentInterpretations));
      localStorage.setItem('aiDrawerInterpretations', JSON.stringify(persistentInterpretations));
    }
  }, [persistentInterpretations]);

  // NEW: Function to generate a unique key for interpretation storage
  const getInterpretationKey = (tab: string, startDate: string, endDate: string, model: string, filters: any = {}) => {
    const filterHash = JSON.stringify(filters);
    return `${tab}_${startDate}_${endDate}_${model}_${btoa(filterHash).slice(0, 8)}`;
  };

  // NEW: Function to reset all interpretations
  const resetAllInterpretations = () => {
    console.log('=== RESETTING ALL INTERPRETATIONS ===');
    setPersistentInterpretations({});
    localStorage.removeItem('aiDrawerInterpretations');
    
    // Also clear current tab data if it has interpretation
    if (currentTabData && currentTabData.interpretation) {
      const { interpretation, model_used, tokens_used, ...dataWithoutInterpretation } = currentTabData;
      setCurrentTabData(dataWithoutInterpretation);
    }
    
    message.success('All AI interpretations have been reset');
  };

  // Available AI models
  const availableModels = [
    { key: 'gpt-4-turbo', label: 'GPT-4 Turbo', description: 'Latest GPT-4 model (Default)' },
    { key: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', description: 'Google\'s newest model' },
    { key: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', description: 'Faster and more cost-effective' },
    { key: 'gpt-4', label: 'GPT-4', description: 'Standard GPT-4 model' },
    { key: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', description: 'Google\'s balanced model' },
    // { key: 'claude-3-sonnet', label: 'Claude 3 Sonnet', description: 'Anthropic\'s balanced model' },
    // { key: 'claude-3-haiku', label: 'Claude 3 Haiku', description: 'Fast and efficient' }
  ];

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
      
      // NEW: Check for existing interpretation in persistent storage
      const interpretationKey = getInterpretationKey(tab, dates.startDate, dates.endDate, selectedModel, filters);
      const existingInterpretation = persistentInterpretations[interpretationKey];
      
      if (existingInterpretation) {
        console.log('=== FOUND EXISTING INTERPRETATION ===');
        console.log('Interpretation key:', interpretationKey);
        console.log('Restoring interpretation for:', tab);
        
        // Merge the existing interpretation with fresh data
        data = {
          ...data,
          interpretation: existingInterpretation.interpretation,
          model_used: existingInterpretation.model_used,
          tokens_used: existingInterpretation.tokens_used
        };
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
    console.log('=== AI INTERPRETATION DEBUG START ===');
    console.log('Current tab data check:', {
      hasCurrentTabData: !!currentTabData,
      currentTabDataType: typeof currentTabData,
      currentTabDataKeys: currentTabData ? Object.keys(currentTabData) : null
    });
    
    if (!currentTabData) return;
    
    try {
      console.log('Setting loading state and processing data...');
      setIsLoading(true);
      
      console.log('Initial data:', {
        activeTab,
        selectedModel,
        originalDataKeys: Object.keys(currentTabData),
        originalDataSize: JSON.stringify(currentTabData).length
      });
      
      // Process the data based on tab type
      let processedData = currentTabData;
      
      if (activeTab === 'Overview' && processedData) {
        console.log('Processing Overview data - removing daily_data...');
        // Remove daily_data as requested
        const { daily_data, ...dataWithoutDaily } = processedData;
        processedData = dataWithoutDaily;
        console.log('Overview data processed:', {
          removedDailyData: !!daily_data,
          remainingKeys: Object.keys(processedData)
        });
      }
      
      if (activeTab === 'Call Logs' && processedData) {
        console.log('Processing Call Logs data - removing records...');
        // Remove records array from Call Logs data
        const { records, ...dataWithoutRecords } = processedData;
        processedData = dataWithoutRecords;
        console.log('Call Logs data processed:', {
          removedRecords: !!records,
          recordsCount: records ? records.length : 0,
          remainingKeys: Object.keys(processedData)
        });
      }
      
      console.log('Final processed data:', {
        processedDataKeys: Object.keys(processedData),
        processedDataSize: JSON.stringify(processedData).length,
        sampleData: Object.keys(processedData).slice(0, 3).reduce((acc, key) => {
          acc[key] = typeof processedData[key];
          return acc;
        }, {} as Record<string, string>)
      });
      
      // Convert the data to a string
      const stringifiedData = JSON.stringify(processedData);
      console.log('Data stringification:', {
        stringifiedLength: stringifiedData.length,
        stringifiedPreview: stringifiedData.substring(0, 200) + '...'
      });
      
      console.log('Preparing API request:', {
        url: `${API_BASE_URL}/ai/interpret`,
        method: 'POST',
        dataLength: stringifiedData.length,
        model: selectedModel,
        hasAuthToken: !!TokenManager.getAccessToken()
      });
      
      // Ensure we have a valid token before making the request
      console.log('Getting valid auth token...');
      const authToken = await TokenManager.getValidToken();
      console.log('Valid auth token obtained, proceeding with API request...');
      
      // Send to backend
      const response = await axios.post(`${API_BASE_URL}/ai/interpret`, {
        data: stringifiedData,
        model: selectedModel
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      console.log('API Response received:', {
        status: response.status,
        statusText: response.statusText,
        hasData: !!response.data,
        responseDataKeys: response.data ? Object.keys(response.data) : null,
        hasInterpretation: !!(response.data && response.data.interpretation)
      });
      
      // Handle successful response
      if (response.data) {
        console.log('Processing successful response:', {
          interpretation: response.data.interpretation ? 'present' : 'missing',
          modelUsed: response.data.model_used,
          tokensUsed: response.data.tokens_used
        });
        
        // Store interpretation directly from response
        const updatedData = {
          ...processedData,
          interpretation: response.data.interpretation,
          model_used: response.data.model_used,
          tokens_used: response.data.tokens_used
        };
        
        setCurrentTabData(updatedData);
        
        // NEW: Save interpretation to persistent storage
        const interpretationKey = getInterpretationKey(
          activeTab, 
          dateRange.startDate, 
          dateRange.endDate, 
          selectedModel, 
          activeFilters[activeTab] || {}
        );
        
        const interpretationData = {
          interpretation: response.data.interpretation,
          model_used: response.data.model_used,
          tokens_used: response.data.tokens_used,
          timestamp: new Date().toISOString()
        };
        
        console.log('=== SAVING NEW INTERPRETATION ===');
        console.log('Interpretation key:', interpretationKey);
        console.log('Saving for tab:', activeTab);
        
        setPersistentInterpretations(prev => ({
          ...prev,
          [interpretationKey]: interpretationData
        }));
        
        console.log('Data updated successfully with interpretation');
        message.success("AI interpretation completed successfully");
      }
      
      console.log('=== AI INTERPRETATION DEBUG SUCCESS ===');
    } catch (err: any) {
      console.log('=== AI INTERPRETATION DEBUG ERROR ===');
      console.error('Full error object:', err);
      console.error('Error details:', {
        message: err.message,
        code: err.code,
        status: err.response?.status,
        statusText: err.response?.statusText,
        responseData: err.response?.data,
        requestConfig: {
          url: err.config?.url,
          method: err.config?.method,
          headers: err.config?.headers,
          data: err.config?.data ? 'present' : 'missing'
        }
      });
      
      setError(`Failed to interpret data: ${err.response?.data?.detail || err.message}`);
      message.error("Failed to interpret data");
    } finally {
      console.log('Cleaning up - setting loading to false');
      setIsLoading(false);
      console.log('=== AI INTERPRETATION DEBUG END ===');
    }
  };

  // Function to refresh data based on active tab
  const refreshData = async () => {
    console.log('=== REFRESH DATA DEBUG START ===');
    console.log('Refresh data conditions:', {
      drawerOpen: open,
      activeTab,
      dateRange,
      activeFilters: activeFilters[activeTab] || 'none'
    });
    
    if (!open) {
      console.log('Drawer not open - aborting refresh');
      console.log('=== REFRESH DATA DEBUG END (NOT OPEN) ===');
      return;
    }
    
    console.log('Setting loading state for refresh...');
    setIsLoading(true);
    
    try {
      console.log(`Fetching ${activeTab} data...`);
      let data;
      
      // Fetch different data based on active tab
      switch (activeTab) {
        case 'Overview':
          console.log('Calling getDashboardMetrics for Overview...');
          data = await dashboardService.getDashboardMetrics(dateRange.startDate, dateRange.endDate);
          console.log('Overview data received:', {
            hasData: !!data,
            dataKeys: data ? Object.keys(data) : null,
            dataSize: data ? JSON.stringify(data).length : 0
          });
          break;
        case 'Call Logs':
          const callLogFilters = activeFilters[activeTab] || {
            limit: '20',
            sortBy: 'calldate',
            sortOrder: 'desc'
          };
          console.log('Calling getCallLogs for Call Logs with filters:', callLogFilters);
          data = await dashboardService.getCallLogs(dateRange.startDate, dateRange.endDate, callLogFilters);
          console.log('Call Logs data received:', {
            hasData: !!data,
            dataKeys: data ? Object.keys(data) : null,
            dataSize: data ? JSON.stringify(data).length : 0,
            recordsCount: data && data.records ? data.records.length : 0
          });
          break;
        case 'Caller Analytics':
          console.log('Calling getCallMetrics for Caller Analytics...');
          data = await dashboardService.getCallMetrics(
            dateRange.startDate, 
            dateRange.endDate,
            activeFilters[activeTab]?.disposition
          );
          console.log('Caller Analytics data received:', {
            hasData: !!data,
            dataKeys: data ? Object.keys(data) : null,
            dataSize: data ? JSON.stringify(data).length : 0
          });
          break;
        case 'Agent Analytics':
          console.log('Calling getAgentMetrics for Agent Analytics...');
          data = await dashboardService.getAgentMetrics(
            dateRange.startDate, 
            dateRange.endDate,
            activeFilters[activeTab]?.disposition
          );
          console.log('Agent Analytics data received:', {
            hasData: !!data,
            dataKeys: data ? Object.keys(data) : null,
            dataSize: data ? JSON.stringify(data).length : 0
          });
          break;
        default:
          console.log('Default case - calling getDashboardMetrics...');
          data = await dashboardService.getDashboardMetrics(dateRange.startDate, dateRange.endDate);
          console.log('Default data received:', {
            hasData: !!data,
            dataKeys: data ? Object.keys(data) : null,
            dataSize: data ? JSON.stringify(data).length : 0
          });
      }
      
      console.log('Cleaning data - removing previous interpretation...');
      // Remove any previous interpretation
      const { interpretation, model_used, tokens_used, ...dataWithoutInterpretation } = data;
      console.log('Data cleaning result:', {
        hadInterpretation: !!interpretation,
        hadModelUsed: !!model_used,
        hadTokensUsed: !!tokens_used,
        cleanDataKeys: Object.keys(dataWithoutInterpretation),
        cleanDataSize: JSON.stringify(dataWithoutInterpretation).length
      });
      
      console.log('Setting current tab data...');
      setCurrentTabData(dataWithoutInterpretation);
      
      console.log('Refresh successful - showing success message');
      message.success("Data refreshed successfully");
      
      console.log('=== REFRESH DATA DEBUG SUCCESS ===');
      return dataWithoutInterpretation;
    } catch (err: any) {
      console.log('=== REFRESH DATA DEBUG ERROR ===');
      console.error('Refresh data error:', err);
      console.error('Refresh error details:', {
        message: err.message,
        stack: err.stack,
        activeTab,
        dateRange,
        filters: activeFilters[activeTab]
      });
      
      message.error("Failed to refresh data");
      console.log('=== REFRESH DATA DEBUG END (ERROR) ===');
      return null;
    } finally {
      console.log('Cleaning up refresh - setting loading to false');
      setIsLoading(false);
      console.log('=== REFRESH DATA DEBUG END ===');
    }
  };
  
  // Function to refresh and then analyze
  const refreshAndAnalyze = async () => {
    console.log('=== REFRESH AND ANALYZE DEBUG START ===');
    console.log('Starting refresh and analyze process...');
    
    const freshData = await refreshData();
    console.log('Fresh data retrieved:', {
      hasFreshData: !!freshData,
      freshDataKeys: freshData ? Object.keys(freshData) : null,
      freshDataSize: freshData ? JSON.stringify(freshData).length : 0
    });
    
    if (freshData) {
      // Use the fresh data for analysis
      console.log('Proceeding with analysis of fresh data...');
      setIsLoading(true);
      
      try {
        console.log('Processing fresh data for analysis:', {
          activeTab,
          selectedModel,
          originalDataKeys: Object.keys(freshData),
          originalDataSize: JSON.stringify(freshData).length
        });
        
        let processedData = freshData;
        
        if (activeTab === 'Overview' && processedData) {
          console.log('Processing Overview fresh data - removing daily_data...');
          // Remove daily_data as requested
          const { daily_data, ...dataWithoutDaily } = processedData;
          processedData = dataWithoutDaily;
          console.log('Overview fresh data processed:', {
            removedDailyData: !!daily_data,
            remainingKeys: Object.keys(processedData)
          });
        }
        
        if (activeTab === 'Call Logs' && processedData) {
          console.log('Processing Call Logs fresh data - removing records...');
          // Remove records array from Call Logs data
          const { records, ...dataWithoutRecords } = processedData;
          processedData = dataWithoutRecords;
          console.log('Call Logs fresh data processed:', {
            removedRecords: !!records,
            recordsCount: records ? records.length : 0,
            remainingKeys: Object.keys(processedData)
          });
        }
        
        console.log('Final processed fresh data:', {
          processedDataKeys: Object.keys(processedData),
          processedDataSize: JSON.stringify(processedData).length,
          sampleData: Object.keys(processedData).slice(0, 3).reduce((acc, key) => {
            acc[key] = typeof processedData[key];
            return acc;
          }, {} as Record<string, string>)
        });
        
        // Convert the data to a string
        const stringifiedData = JSON.stringify(processedData);
        console.log('Fresh data stringification:', {
          stringifiedLength: stringifiedData.length,
          stringifiedPreview: stringifiedData.substring(0, 200) + '...'
        });
        
        console.log('Preparing refresh and analyze API request:', {
          url: `${API_BASE_URL}/ai/interpret`,
          method: 'POST',
          dataLength: stringifiedData.length,
          model: selectedModel,
          hasAuthToken: !!TokenManager.getAccessToken()
        });
        
        // Ensure we have a valid token before making the request
        console.log('Getting valid auth token for refresh and analyze...');
        const authToken = await TokenManager.getValidToken();
        console.log('Valid auth token obtained for refresh and analyze, proceeding with API request...');
        
        // Send to backend
        const response = await axios.post(`${API_BASE_URL}/ai/interpret`, {
          data: stringifiedData,
          model: selectedModel
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          }
        });
        
        console.log('Refresh and analyze API response received:', {
          status: response.status,
          statusText: response.statusText,
          hasData: !!response.data,
          responseDataKeys: response.data ? Object.keys(response.data) : null,
          hasInterpretation: !!(response.data && response.data.interpretation)
        });
        
        // Handle successful response
        if (response.data) {
          console.log('Processing successful refresh and analyze response:', {
            interpretation: response.data.interpretation ? 'present' : 'missing',
            modelUsed: response.data.model_used,
            tokensUsed: response.data.tokens_used
          });
          
          const updatedData = {
            ...processedData,
            interpretation: response.data.interpretation,
            model_used: response.data.model_used,
            tokens_used: response.data.tokens_used
          };
          
          setCurrentTabData(updatedData);
          
          // NEW: Save interpretation to persistent storage
          const interpretationKey = getInterpretationKey(
            activeTab, 
            dateRange.startDate, 
            dateRange.endDate, 
            selectedModel, 
            activeFilters[activeTab] || {}
          );
          
          const interpretationData = {
            interpretation: response.data.interpretation,
            model_used: response.data.model_used,
            tokens_used: response.data.tokens_used,
            timestamp: new Date().toISOString()
          };
          
          console.log('=== SAVING REFRESH AND ANALYZE INTERPRETATION ===');
          console.log('Interpretation key:', interpretationKey);
          console.log('Saving for tab:', activeTab);
          
          setPersistentInterpretations(prev => ({
            ...prev,
            [interpretationKey]: interpretationData
          }));
          
          console.log('Fresh data updated successfully with interpretation');
          message.success("Data refreshed and analyzed successfully");
        }
        
        console.log('=== REFRESH AND ANALYZE DEBUG SUCCESS ===');
      } catch (err: any) {
        console.log('=== REFRESH AND ANALYZE DEBUG ERROR ===');
        console.error('Full refresh and analyze error object:', err);
        console.error('Refresh and analyze error details:', {
          message: err.message,
          code: err.code,
          status: err.response?.status,
          statusText: err.response?.statusText,
          responseData: err.response?.data,
          requestConfig: {
            url: err.config?.url,
            method: err.config?.method,
            headers: err.config?.headers,
            data: err.config?.data ? 'present' : 'missing'
          }
        });
        
        setError(`Failed to analyze data: ${err.response?.data?.detail || err.message}`);
        message.error("Failed to analyze refreshed data");
      } finally {
        console.log('Cleaning up refresh and analyze - setting loading to false');
        setIsLoading(false);
        console.log('=== REFRESH AND ANALYZE DEBUG END ===');
      }
    } else {
      console.log('No fresh data available - aborting analysis');
      console.log('=== REFRESH AND ANALYZE DEBUG END (NO DATA) ===');
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
        onClick: () => {
          console.log('=== ANALYZE CURRENT DATA MENU CLICKED ===');
          console.log('Selected model:', selectedModel);
          console.log('Active tab:', activeTab);
          console.log('Has current data:', !!currentTabData);
          console.log('Current data keys:', currentTabData ? Object.keys(currentTabData) : 'none');
          sendToAIInterpretation();
        }
      },
      {
        key: '2',
        label: 'Refresh & Analyze',
        icon: <SyncOutlined />,
        onClick: () => {
          console.log('=== REFRESH & ANALYZE MENU CLICKED ===');
          console.log('Selected model:', selectedModel);
          console.log('Active tab:', activeTab);
          console.log('Date range:', dateRange);
          console.log('Active filters:', activeFilters[activeTab] || 'none');
          refreshAndAnalyze();
        }
      },
    ],
  };

  // Model selection dropdown menu
  const modelMenu = {
    items: availableModels.map(model => ({
      key: model.key,
      label: (
        <div className="py-1">
          <div className="font-medium">{model.label}</div>
          <div className="text-xs text-gray-500">{model.description}</div>
        </div>
      ),
      onClick: () => {
        console.log('=== MODEL SWITCH DEBUG ===');
        console.log('Previous model:', selectedModel);
        console.log('New model selected:', model.key);
        console.log('New model label:', model.label);
        console.log('Has current interpretation:', !!(currentTabData && currentTabData.interpretation));
        console.log('Active tab:', activeTab);
        console.log('Date range:', dateRange);
        console.log('=== MODEL SWITCH DEBUG END ===');
        
        setSelectedModel(model.key);
        message.success(`Switched to ${model.label}`);
      }
    })),
  };

  // Get current model display info
  const currentModel = availableModels.find(model => model.key === selectedModel);

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
              <div className="absolute left-6 top-32 z-10 flex flex-col space-y-2">
                <Tooltip title={`Current Model: ${currentModel?.label}`} placement="right">
                  <Dropdown menu={modelMenu} placement="topRight" trigger={['click']}>
                    <div 
                      className="p-2 bg-white dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors text-gray-700 dark:text-gray-200 cursor-pointer"
                      aria-label="Select AI Model"
                    >
                      <SettingOutlined style={{ fontSize: '18px' }} />
                    </div>
                  </Dropdown>
                </Tooltip>
                
                <Tooltip title={`${showRawData ? 'Hide' : 'Show'} Raw Data`} placement="right">
                  <div 
                    className={`p-2 transition-colors cursor-pointer ${
                      showRawData 
                        ? 'text-blue-500 hover:text-blue-600' 
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                    aria-label="Toggle Raw Data"
                    onClick={() => setShowRawData(!showRawData)}
                  >
                    <CodeOutlined style={{ fontSize: '18px' }} />
                  </div>
                </Tooltip>
                
                <Tooltip title="Reset All Interpretations" placement="right">
                  <div 
                    className="p-2 transition-colors cursor-pointer text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
                    aria-label="Reset Interpretations"
                    onClick={resetAllInterpretations}
                  >
                    <DeleteOutlined style={{ fontSize: '18px' }} />
                  </div>
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
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-medium">Date Range:</span> {dateRange.startDate} to {dateRange.endDate}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-medium">AI Model:</span> 
                      <Tag color="blue" className="ml-2">{currentModel?.label}</Tag>
                    </div>
                  </div>
                </div>
                
                {/* Main content with specified padding */}
                <div className="flex-1 px-16 py-[48px] overflow-y-auto">
                  {isLoading ? (
                    <div className="flex flex-col justify-center items-center h-80">
                      <div className="animate-spin h-10 w-10 border-4 border-purple-500 border-t-transparent rounded-full mb-4"></div>
                      <p className="text-gray-600 dark:text-gray-300">Getting your data...</p>
                    </div>
                  ) : error ? (
                    <div className="flex flex-col justify-center items-center h-80">
                      <motion.div
                        initial={{ scale: 0, rotate: 0 }}
                        animate={{ 
                          scale: [0, 1.2, 1],
                          rotate: [0, -10, 10, -5, 0]
                        }}
                        transition={{ 
                          duration: 0.8,
                          times: [0, 0.5, 1],
                          type: "spring",
                          stiffness: 200
                        }}
                        className="text-6xl text-red-500 mb-4"
                      >
                        ⚠️
                      </motion.div>
                      <motion.h3 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.5 }}
                        className="text-xl font-medium text-red-700 dark:text-red-400 mb-2 text-center"
                      >
                        Oops! Something went wrong
                      </motion.h3>
                      <motion.p 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5, duration: 0.5 }}
                        className="text-red-600 dark:text-red-400 text-center mb-4 max-w-md"
                      >
                        We couldn't analyze your data right now. Please try again in a few moments.
                      </motion.p>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.7, duration: 0.3 }}
                      >
                        <Button
                          type="primary"
                          onClick={sendToAIInterpretation}
                          disabled={isLoading}
                          className="bg-red-600 hover:bg-red-700 border-red-600 hover:border-red-700"
                          icon={<SyncOutlined />}
                        >
                          Try Again
                        </Button>
                      </motion.div>
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1, duration: 0.5 }}
                        className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center max-w-sm"
                      >
                        Error details: {error}
                      </motion.div>
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
                          {/* Re-analyze Section - NEW */}
                          <div className="mb-6 bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                            <div className="flex justify-between items-center mb-3">
                              <div>
                                <h3 className="text-sm font-medium text-purple-800 dark:text-purple-400 mb-1">
                                  Ready for a new analysis?
                                </h3>
                                <p className="text-xs text-purple-600 dark:text-purple-300">
                                  Current model: <span className="font-medium">{currentModel?.label}</span>
                                </p>
                                {/* NEW: Show if interpretation was loaded from storage */}
                                {(() => {
                                  const interpretationKey = getInterpretationKey(
                                    activeTab, 
                                    dateRange.startDate, 
                                    dateRange.endDate, 
                                    selectedModel, 
                                    activeFilters[activeTab] || {}
                                  );
                                  const storedInterpretation = persistentInterpretations[interpretationKey];
                                  if (storedInterpretation && storedInterpretation.timestamp) {
                                    const timestamp = new Date(storedInterpretation.timestamp);
                                    return (
                                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                        ✓ Restored from {timestamp.toLocaleDateString()} at {timestamp.toLocaleTimeString()}
                                      </p>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                              <div className="flex space-x-2">
                                <Dropdown menu={modelMenu} placement="bottomRight" trigger={['click']}>
                                  <Button 
                                    size="small" 
                                    icon={<SettingOutlined />}
                                    className="text-purple-600 border-purple-300 hover:border-purple-500"
                                  >
                                    Switch Model
                                  </Button>
                                </Dropdown>
                                <Dropdown menu={analyzeMenu} placement="bottomRight">
                                  <Button.Group size="small">
                                    <Button
                                      type="primary"
                                      onClick={() => {
                                        console.log('=== RE-ANALYZE BUTTON CLICKED ===');
                                        console.log('Current model:', selectedModel);
                                        console.log('Has current data:', !!currentTabData);
                                        console.log('Active tab:', activeTab);
                                        sendToAIInterpretation();
                                      }}
                                      disabled={isLoading}
                                      className="bg-purple-600 hover:bg-purple-700 border-purple-600 hover:border-purple-700"
                                      icon={<SendOutlined />}
                                    >
                                      Re-analyze
                                    </Button>
                                    <Dropdown menu={analyzeMenu} placement="bottomRight">
                                      <Button
                                        type="primary"
                                        className="bg-purple-600 hover:bg-purple-700 border-purple-600 hover:border-purple-700"
                                        icon={<DownOutlined />}
                                        onClick={() => {
                                          console.log('=== RE-ANALYZE DROPDOWN CLICKED ===');
                                          console.log('Available options: Analyze Current Data, Refresh & Analyze');
                                        }}
                                      />
                                    </Dropdown>
                                  </Button.Group>
                                </Dropdown>
                              </div>
                            </div>
                          </div>

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
                            
                            {/* FALLBACK: Display interpretation as text if structured data isn't available */}
                            {typeof currentTabData.interpretation === 'string' && (
                              <div className="bg-white dark:bg-gray-900 p-5 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
                                <h3 className="text-lg font-medium mb-3 text-gray-800 dark:text-gray-200">
                                  <BulbOutlined className="text-yellow-500 mr-2" /> 
                                  AI Analysis
                                </h3>
                                <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                  {currentTabData.interpretation}
                                </div>
                              </div>
                            )}
                            
                            {/* FALLBACK: Display any interpretation content that doesn't match expected structure */}
                            {typeof currentTabData.interpretation === 'object' && 
                             !currentTabData.interpretation.summary && 
                             !currentTabData.interpretation.trends && 
                             !currentTabData.interpretation.strengths && 
                             !currentTabData.interpretation.improvement_areas && 
                             !currentTabData.interpretation.recommendations && (
                              <div className="bg-white dark:bg-gray-900 p-5 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
                                <h3 className="text-lg font-medium mb-3 text-gray-800 dark:text-gray-200">
                                  <BulbOutlined className="text-yellow-500 mr-2" /> 
                                  AI Analysis
                                </h3>
                                <div className="text-gray-700 dark:text-gray-300">
                                  <pre className="whitespace-pre-wrap font-sans">
                                    {JSON.stringify(currentTabData.interpretation, null, 2)}
                                  </pre>
                                </div>
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
                  <div className="flex justify-center items-center">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      AI interpretations are automatically saved and restored when you return
                    </div>
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