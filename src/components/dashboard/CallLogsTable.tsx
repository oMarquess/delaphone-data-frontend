'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ChevronDownIcon, ChevronUpIcon, Play, Download, ChevronLeft, ChevronRight, Phone, Clock, Calendar, Info, ArrowUp, ArrowDown } from 'lucide-react';

// Types based on the API response
export interface CallLog {
  calldate: string;
  src: string;
  dst: string;
  disposition: string;
  duration: number;
  billsec: number;
  direction: string;
  recordingfile: string;
  cnam: string;
  did: string;
  uniqueid: string;
  [key: string]: any; // For any other properties
}

interface CallLogsTableProps {
  records: CallLog[];
  totalCount: number;
  filteredCount: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  isLoading?: boolean;
}

export default function CallLogsTable({ 
  records, 
  totalCount, 
  filteredCount, 
  currentPage = 1, 
  onPageChange, 
  pageSize = 100,
  isLoading = false
}: CallLogsTableProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [sortField, setSortField] = useState<string>('calldate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  
  // Calculate total pages
  const totalPages = Math.ceil(filteredCount / pageSize);
  
  const toggleRowExpansion = (uniqueid: string) => {
    if (expandedRow === uniqueid) {
      setExpandedRow(null);
    } else {
      setExpandedRow(uniqueid);
    }
  };
  
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    return [
      hours > 0 ? `${hours}h` : '',
      minutes > 0 ? `${minutes}m` : '',
      `${remainingSeconds}s`
    ].filter(Boolean).join(' ');
  };
  
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return format(date, 'MMM dd, yyyy HH:mm:ss');
    } catch (error) {
      return dateString;
    }
  };

  const formatShortDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return format(date, 'MMM dd');
    } catch (error) {
      return dateString;
    }
  };

  const formatTime = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return format(date, 'HH:mm:ss');
    } catch (error) {
      return dateString;
    }
  };
  
  const getStatusClass = (status: string): string => {
    switch (status) {
      case 'ANSWERED':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'NO ANSWER':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'BUSY':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'FAILED':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status: string): JSX.Element => {
    return <div className={`w-2 h-2 rounded-full mr-2 ${
      status === 'ANSWERED' ? 'bg-green-500 dark:bg-green-400' :
      status === 'NO ANSWER' ? 'bg-yellow-500 dark:bg-yellow-400' :
      status === 'BUSY' ? 'bg-orange-500 dark:bg-orange-400' :
      status === 'FAILED' ? 'bg-red-500 dark:bg-red-400' :
      'bg-gray-500 dark:bg-gray-400'
    }`} />;
  };
  
  const getDirectionClass = (direction: string): string => {
    switch (direction) {
      case 'inbound':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'outbound':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'internal':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getDirectionIcon = (direction: string): JSX.Element => {
    switch (direction) {
      case 'inbound':
        return <ArrowDown size={14} className="text-blue-600 dark:text-blue-400" />;
      case 'outbound':
        return <ArrowUp size={14} className="text-purple-600 dark:text-purple-400" />;
      case 'internal':
        return <ChevronRight size={14} className="text-indigo-600 dark:text-indigo-400" />;
      default:
        return <Info size={14} className="text-gray-600 dark:text-gray-400" />;
    }
  };
  
  const formatPhoneNumber = (number: string): string => {
    if (!number) return '';
    // Simple formatting for now, could be enhanced with a library like libphonenumber
    if (number.length === 10) {
      return `(${number.substring(0, 3)}) ${number.substring(3, 6)}-${number.substring(6)}`;
    }
    return number;
  };
  
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };
  
  const renderSortIcon = (field: string) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUpIcon size={14} /> : <ChevronDownIcon size={14} />;
  };
  
  // Handle pagination
  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    onPageChange(page);
  };
  
  // Sort records based on current sort field and direction
  const sortedRecords = [...records].sort((a, b) => {
    let valueA = a[sortField];
    let valueB = b[sortField];
    
    // Handle string comparison
    if (typeof valueA === 'string') {
      valueA = valueA.toLowerCase();
      valueB = valueB.toLowerCase();
    }
    
    if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1;
    if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5; // Number of page buttons to show
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // Adjust if we're near the end
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  };

  // Debug pagination data
  console.log('Pagination Debug:', { filteredCount, pageSize, totalPages, currentPage });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200">
          Call Logs
        </h2>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {records.length} of {filteredCount} calls
          </div>
          
          {/* View toggle buttons */}
          <div className="flex rounded-md overflow-hidden border border-gray-200 dark:border-gray-700">
            <button 
              onClick={() => setViewMode('card')}
              className={`px-3 py-1 text-xs ${viewMode === 'card' 
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
            >
              Cards
            </button>
            <button 
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 text-xs ${viewMode === 'table' 
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
            >
              Table
            </button>
          </div>
        </div>
      </div>
      
      {/* Sort controls for card view */}
      {viewMode === 'card' && (
        <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900/50">
          <span className="text-xs text-gray-500 dark:text-gray-400">Sort by:</span>
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => handleSort('calldate')}
              className={`px-2 py-1 text-xs rounded-full flex items-center gap-1 ${
                sortField === 'calldate' 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              Date {sortField === 'calldate' && (sortDirection === 'asc' ? <ChevronUpIcon size={12} /> : <ChevronDownIcon size={12} />)}
            </button>
            <button 
              onClick={() => handleSort('duration')}
              className={`px-2 py-1 text-xs rounded-full flex items-center gap-1 ${
                sortField === 'duration' 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              Duration {sortField === 'duration' && (sortDirection === 'asc' ? <ChevronUpIcon size={12} /> : <ChevronDownIcon size={12} />)}
            </button>
            <button 
              onClick={() => handleSort('src')}
              className={`px-2 py-1 text-xs rounded-full flex items-center gap-1 ${
                sortField === 'src' 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              Source {sortField === 'src' && (sortDirection === 'asc' ? <ChevronUpIcon size={12} /> : <ChevronDownIcon size={12} />)}
            </button>
            <button 
              onClick={() => handleSort('dst')}
              className={`px-2 py-1 text-xs rounded-full flex items-center gap-1 ${
                sortField === 'dst' 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              Destination {sortField === 'dst' && (sortDirection === 'asc' ? <ChevronUpIcon size={12} /> : <ChevronDownIcon size={12} />)}
            </button>
          </div>
        </div>
      )}

      {/* Card View */}
      {viewMode === 'card' && (
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            <div className="col-span-full flex justify-center items-center py-12">
              <div className="flex flex-col items-center space-y-2">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                <span className="text-gray-500 dark:text-gray-400">Loading records...</span>
              </div>
            </div>
          ) : sortedRecords.length > 0 ? (
            sortedRecords.map((record) => (
              <div 
                key={record.uniqueid}
                className={`border rounded-lg overflow-hidden transition-all duration-200 ${
                  expandedRow === record.uniqueid
                    ? 'border-blue-300 dark:border-blue-700 shadow-md'
                    : 'border-gray-200 dark:border-gray-700 hover:shadow-md'
                }`}
              >
                <div 
                  className={`p-4 cursor-pointer ${
                    expandedRow === record.uniqueid
                      ? 'bg-blue-50 dark:bg-blue-900/20' 
                      : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750'
                  }`}
                  onClick={() => toggleRowExpansion(record.uniqueid)}
                >
                  {/* Header with status and date */}
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center">
                      {getStatusIcon(record.disposition)}
                      <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusClass(record.disposition)}`}>
                        {record.disposition}
                      </span>
                    </div>
                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                      <Calendar size={12} className="mr-1" />
                      {formatShortDate(record.calldate)}
                      <Clock size={12} className="ml-2 mr-1" />
                      {formatTime(record.calldate)}
                    </div>
                  </div>
                  
                  {/* Call direction indicator */}
                  <div className="flex items-center mb-3">
                    <span className={`px-2 py-0.5 text-xs rounded-full flex items-center ${getDirectionClass(record.direction)}`}>
                      {getDirectionIcon(record.direction)} <span className="ml-1">{record.direction}</span>
                    </span>
                  </div>
                  
                  {/* Call numbers */}
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center">
                        <Phone size={10} className="mr-1" /> Source
                      </div>
                      <div className="text-sm font-medium text-gray-800 dark:text-white">
                        {formatPhoneNumber(record.src)}
                      </div>
                      {record.cnam && (
                        <div className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">{record.cnam}</div>
                      )}
                    </div>
                    
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center">
                        <Phone size={10} className="mr-1" /> Destination
                      </div>
                      <div className="text-sm font-medium text-gray-800 dark:text-white">
                        {formatPhoneNumber(record.dst)}
                      </div>
                      {record.dst_cnam && (
                        <div className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">{record.dst_cnam}</div>
                      )}
                    </div>
                  </div>
                  
                  {/* Call duration */}
                  <div className="mt-3 flex items-center">
                    <Clock size={14} className="text-gray-500 dark:text-gray-400 mr-1" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Duration: <span className="font-medium text-gray-900 dark:text-white">{formatDuration(record.duration)}</span>
                    </span>
                  </div>
                  
                  {/* Actions */}
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-between">
                    <button 
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleRowExpansion(record.uniqueid);
                      }}
                    >
                      {expandedRow === record.uniqueid ? 'Hide details' : 'View details'}
                    </button>
                    <div className="flex space-x-2">
                      {record.recordingfile && (
                        <button 
                          className="p-1 rounded bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Play size={14} />
                        </button>
                      )}
                      <button 
                        className="p-1 rounded bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Download size={14} />
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Expanded details */}
                {expandedRow === record.uniqueid && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/70 border-t border-gray-200 dark:border-gray-600">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Call ID</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">{record.uniqueid}</div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">DID</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">{record.did || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Channel</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">{record.channel}</div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Dest. Channel</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">{record.dstchannel || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Last App</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">{record.lastapp}</div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Last Data</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">{record.lastdata}</div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Bill Duration</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">{formatDuration(record.billsec)}</div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Account Code</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">{record.accountcode || 'N/A'}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="col-span-full py-12 text-center text-gray-500 dark:text-gray-400">
              No call records found matching your filters.
            </div>
          )}
        </div>
      )}
      
      {/* Table View */}
      {viewMode === 'table' && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <button onClick={() => handleSort('calldate')} className="flex items-center">
                    Date/Time {renderSortIcon('calldate')}
                  </button>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <button onClick={() => handleSort('src')} className="flex items-center">
                    Source {renderSortIcon('src')}
                  </button>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <button onClick={() => handleSort('dst')} className="flex items-center">
                    Destination {renderSortIcon('dst')}
                  </button>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <button onClick={() => handleSort('duration')} className="flex items-center">
                    Duration {renderSortIcon('duration')}
                  </button>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Direction
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center">
                    <div className="flex justify-center items-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500"></div>
                      <span className="text-gray-500 dark:text-gray-400">Loading records...</span>
                    </div>
                  </td>
                </tr>
              ) : sortedRecords.length > 0 ? (
                sortedRecords.map((record) => (
                  <>
                    <tr 
                      key={record.uniqueid}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                      onClick={() => toggleRowExpansion(record.uniqueid)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-white">
                        {formatDate(record.calldate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-white">
                        {formatPhoneNumber(record.src)}
                        {record.cnam && (
                          <div className="text-xs text-gray-500 dark:text-gray-300">{record.cnam}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-white">
                        {formatPhoneNumber(record.dst)}
                        {record.dst_cnam && (
                          <div className="text-xs text-gray-500 dark:text-gray-300">{record.dst_cnam}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-white">
                        {formatDuration(record.duration)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusClass(record.disposition)}`}>
                          {record.disposition}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${getDirectionClass(record.direction)}`}>
                          {record.direction}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-white">
                        <div className="flex space-x-2">
                          {record.recordingfile && (
                            <button className="p-1 rounded bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800">
                              <Play size={16} />
                            </button>
                          )}
                          <button className="p-1 rounded bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600">
                            <Download size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedRow === record.uniqueid && (
                      <tr className="bg-gray-50 dark:bg-gray-700/70">
                        <td colSpan={7} className="px-6 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 dark:text-white">Call Details</h4>
                              <div className="mt-2 text-sm text-gray-600 dark:text-gray-200">
                                <div><span className="font-medium text-gray-700 dark:text-white">ID:</span> <span className="dark:text-gray-200">{record.uniqueid}</span></div>
                                <div><span className="font-medium text-gray-700 dark:text-white">Channel:</span> <span className="dark:text-gray-200">{record.channel}</span></div>
                                <div><span className="font-medium text-gray-700 dark:text-white">Dest. Channel:</span> <span className="dark:text-gray-200">{record.dstchannel || 'N/A'}</span></div>
                                <div><span className="font-medium text-gray-700 dark:text-white">Context:</span> <span className="dark:text-gray-200">{record.dcontext}</span></div>
                              </div>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 dark:text-white">Duration Details</h4>
                              <div className="mt-2 text-sm text-gray-600 dark:text-gray-200">
                                <div><span className="font-medium text-gray-700 dark:text-white">Total Duration:</span> <span className="dark:text-gray-200">{formatDuration(record.duration)}</span></div>
                                <div><span className="font-medium text-gray-700 dark:text-white">Bill Duration:</span> <span className="dark:text-gray-200">{formatDuration(record.billsec)}</span></div>
                                <div><span className="font-medium text-gray-700 dark:text-white">DID:</span> <span className="dark:text-gray-200">{record.did || 'N/A'}</span></div>
                              </div>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 dark:text-white">Application</h4>
                              <div className="mt-2 text-sm text-gray-600 dark:text-gray-200">
                                <div><span className="font-medium text-gray-700 dark:text-white">Last App:</span> <span className="dark:text-gray-200">{record.lastapp}</span></div>
                                <div><span className="font-medium text-gray-700 dark:text-white">Last Data:</span> <span className="dark:text-gray-200">{record.lastdata}</span></div>
                                <div><span className="font-medium text-gray-700 dark:text-white">Account Code:</span> <span className="dark:text-gray-200">{record.accountcode || 'N/A'}</span></div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                    No call records found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap items-center justify-between">
            <div className="mb-2 sm:mb-0 text-sm text-gray-700 dark:text-gray-300">
              Page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages}</span>
            </div>
            
            <div className="flex flex-wrap space-x-1">
              {/* Previous Button */}
              <button 
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1 || isLoading}
                className={`relative inline-flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                  currentPage === 1 || isLoading
                    ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <ChevronLeft size={16} />
              </button>
              
              {/* Page Numbers */}
              {getPageNumbers().map(page => (
                <button
                  key={page}
                  onClick={() => goToPage(page)}
                  disabled={isLoading}
                  className={`relative inline-flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                    page === currentPage
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {page}
                </button>
              ))}
              
              {/* Next Button */}
              <button 
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages || isLoading}
                className={`relative inline-flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                  currentPage === totalPages || isLoading
                    ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 