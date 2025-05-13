'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ChevronDownIcon, ChevronUpIcon, Play, Download } from 'lucide-react';

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
}

export default function CallLogsTable({ records, totalCount, filteredCount }: CallLogsTableProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [sortField, setSortField] = useState<string>('calldate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
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

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200">
          Call Logs
        </h2>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Showing {filteredCount} of {totalCount} calls
        </div>
      </div>
      
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
            {sortedRecords.map((record) => (
              <>
                <tr 
                  key={record.uniqueid}
                  className="hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer"
                  onClick={() => toggleRowExpansion(record.uniqueid)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                    {formatDate(record.calldate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                    {formatPhoneNumber(record.src)}
                    {record.cnam && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">{record.cnam}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                    {formatPhoneNumber(record.dst)}
                    {record.dst_cnam && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">{record.dst_cnam}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
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
                  <tr className="bg-gray-50 dark:bg-gray-750">
                    <td colSpan={7} className="px-6 py-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Call Details</h4>
                          <div className="mt-2 text-sm">
                            <div><span className="font-medium">ID:</span> {record.uniqueid}</div>
                            <div><span className="font-medium">Channel:</span> {record.channel}</div>
                            <div><span className="font-medium">Dest. Channel:</span> {record.dstchannel || 'N/A'}</div>
                            <div><span className="font-medium">Context:</span> {record.dcontext}</div>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Duration Details</h4>
                          <div className="mt-2 text-sm">
                            <div><span className="font-medium">Total Duration:</span> {formatDuration(record.duration)}</div>
                            <div><span className="font-medium">Bill Duration:</span> {formatDuration(record.billsec)}</div>
                            <div><span className="font-medium">DID:</span> {record.did || 'N/A'}</div>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Application</h4>
                          <div className="mt-2 text-sm">
                            <div><span className="font-medium">Last App:</span> {record.lastapp}</div>
                            <div><span className="font-medium">Last Data:</span> {record.lastdata}</div>
                            <div><span className="font-medium">Account Code:</span> {record.accountcode || 'N/A'}</div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
            
            {records.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                  No call records found matching your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {filteredCount > records.length && (
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 text-center text-sm text-gray-500 dark:text-gray-400">
          Showing {records.length} of {filteredCount} results. 
          <button className="ml-2 text-blue-600 dark:text-blue-400 hover:underline">
            Load more
          </button>
        </div>
      )}
    </div>
  );
} 