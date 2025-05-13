'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { FilterIcon, ChevronDownIcon, CalendarIcon, Download } from 'lucide-react';
import QuickDateSelector from '@/components/analytics/QuickDateSelector';
import CallLogsAdvancedFilter, { CallLogsFilterValues } from '@/components/dashboard/CallLogsAdvancedFilter';
import CallLogsTable, { CallLog } from '@/components/dashboard/CallLogsTable';

// Mock data for demonstration
const mockCallLogs: CallLog[] = [
  {
    calldate: '2025-05-13T13:35:58',
    clid: '"Agent/109 Login" <1009>',
    src: '1009',
    dst: 's',
    dcontext: 'from-internal',
    channel: 'SIP/1009-000011a9',
    dstchannel: '',
    lastapp: 'AgentLogin',
    lastdata: '109',
    duration: 6027,
    billsec: 6025,
    disposition: 'ANSWERED',
    amaflags: 3,
    accountcode: '',
    uniqueid: '1747143358.5357',
    userfield: '',
    recordingfile: '',
    cnum: '',
    cnam: '',
    outbound_cnum: '',
    outbound_cnam: '',
    dst_cnam: '',
    did: '',
    direction: 'outbound'
  },
  {
    calldate: '2025-05-13T11:03:56',
    clid: '"Agent/109 Login" <1009>',
    src: '1009',
    dst: 's',
    dcontext: 'from-internal',
    channel: 'SIP/1009-0000119f',
    dstchannel: '',
    lastapp: 'AgentLogin',
    lastdata: '109',
    duration: 9097,
    billsec: 9095,
    disposition: 'ANSWERED',
    amaflags: 3,
    accountcode: '',
    uniqueid: '1747134236.5339',
    userfield: '',
    recordingfile: '',
    cnum: '',
    cnam: '',
    outbound_cnum: '',
    outbound_cnam: '',
    dst_cnam: '',
    did: '',
    direction: 'outbound'
  },
  // Add more mock records as needed
];

export default function CallLogsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [dateRangeLabel, setDateRangeLabel] = useState('Last 7 Days');
  const [dateRange, setDateRange] = useState({
    startDate: format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  });
  const [filters, setFilters] = useState<CallLogsFilterValues>({
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
    sortOrder: 'desc'
  });
  
  // Mock data state
  const [callLogsData, setCallLogsData] = useState({
    records: mockCallLogs,
    totalCount: 10637,
    filteredCount: 42
  });
  
  const handleDateRangeChange = (startDate: string, endDate: string, label: string) => {
    setDateRangeLabel(label);
    setDateRange({ startDate, endDate });
    
    // If Custom is selected, open the advanced filters section
    if (label === 'Custom') {
      setFilterVisible(true);
      
      if (!startDate) {
        // If custom is selected but no dates provided, just update the label and keep current dates
        return;
      }
    } else {
      // If any preset is selected, close the advanced filters
      setFilterVisible(false);
    }
    
    // Here you would fetch call logs with the new date range
    fetchCallLogs(startDate, endDate, filters);
  };
  
  const handleFilterChange = (newFilters: CallLogsFilterValues) => {
    setFilters(newFilters);
    // Here you would fetch call logs with the updated filters
    fetchCallLogs(dateRange.startDate, dateRange.endDate, newFilters);
  };
  
  const fetchCallLogs = async (startDate: string, endDate: string, filterValues: CallLogsFilterValues) => {
    setIsLoading(true);
    
    try {
      // This is where you would make the API call to fetch call logs
      // For now, we'll just simulate a delay and return mock data
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // In a real implementation, you would set the data from the API response
      
      // For now, just keeping the mock data
      setCallLogsData({
        records: mockCallLogs,
        totalCount: 10637,
        filteredCount: 42
      });
    } catch (error) {
      console.error('Error fetching call logs:', error);
      // Handle error state
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Header with filter toggle */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Call Logs</h1>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <button 
            onClick={() => setFilterVisible(!filterVisible)}
            className="flex items-center gap-2 py-2 px-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <FilterIcon size={16} />
            <span>Advanced Filters</span>
            <ChevronDownIcon size={16} className={`transition-transform ${filterVisible ? 'rotate-180' : ''}`} />
          </button>
          
          <div className="flex items-center gap-2 py-2 px-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md">
            <CalendarIcon size={16} className="text-gray-500 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {dateRange.startDate} to {dateRange.endDate}
            </span>
          </div>
          
          <button className="flex items-center gap-2 py-2 px-4 bg-gray-800 dark:bg-gray-700 text-white rounded-md">
            <Download size={16} />
            <span>Download Logs</span>
          </button>
        </div>
      </div>
      
      {/* Quick date range selector */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Quick Select:</span>
          <QuickDateSelector 
            onChange={handleDateRangeChange} 
            activeLabel={dateRangeLabel}
            filterVisible={filterVisible}
          />
        </div>
      </div>
      
      {/* Collapsible filter section */}
      <div className={`transition-all duration-300 overflow-hidden ${filterVisible ? 'max-h-[1200px] opacity-100 mb-10' : 'max-h-0 opacity-0'}`}>
        <CallLogsAdvancedFilter 
          visible={filterVisible} 
          onFilterChange={handleFilterChange} 
          initialValues={filters}
        />
      </div>
      
      {/* Dashboard status */}
      <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800">
        <div className="text-sm text-blue-800 dark:text-blue-300">
          <span className="font-medium">Period:</span> {dateRange.startDate} to {dateRange.endDate}
          <span className="mx-2">•</span>
          <span className="font-medium">Results:</span> {callLogsData.filteredCount} calls
        </div>
        {isLoading && (
          <div className="flex items-center text-blue-700 dark:text-blue-400">
            <div className="animate-spin h-4 w-4 border-2 border-t-transparent border-blue-500 rounded-full mr-2"></div>
            <span className="text-sm">Loading...</span>
          </div>
        )}
      </div>
      
      {/* Call Logs Table */}
      <CallLogsTable 
        records={callLogsData.records}
        totalCount={callLogsData.totalCount}
        filteredCount={callLogsData.filteredCount}
      />
    </div>
  );
} 