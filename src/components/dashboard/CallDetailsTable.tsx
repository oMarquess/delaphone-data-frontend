'use client';

import { 
  PhoneOutgoing, 
  PhoneIncoming, 
  Phone 
} from 'lucide-react';
import { format } from 'date-fns';
import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CallRecord {
  calldate: string;
  clid: string;
  src: string;
  dst: string;
  duration: number;
  billsec: number;
  disposition: string;
  direction: string;
  recordingfile: string;
  [key: string]: any;
}

interface CallDetailsTableProps {
  records?: CallRecord[];
  isLoading?: boolean;
}

export default function CallDetailsTable({
  records = [],
  isLoading = false
}: CallDetailsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;
  
  // Calculate pagination indices
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  
  const formatPhoneNumber = (phoneNumber: string) => {
    if (!phoneNumber) return 'Unknown';
    
    // Strip any non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Format based on length
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    } else if (cleaned.length > 10 && cleaned.startsWith('233')) {
      // Handle Ghana numbers starting with 233
      return `+${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
    }
    
    return phoneNumber;
  };
  
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  const getStatusColor = (disposition: string) => {
    switch (disposition) {
      case 'ANSWERED':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'NO ANSWER':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'BUSY':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'FAILED':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };
  
  const getDirectionIcon = (direction: string) => {
    switch (direction) {
      case 'inbound':
        return <PhoneIncoming className="w-4 h-4 text-blue-500" />;
      case 'outbound':
        return <PhoneOutgoing className="w-4 h-4 text-purple-500" />;
      default:
        return <Phone className="w-4 h-4 text-gray-500" />;
    }
  };
  
  const currentRecords = records.slice(
    (currentPage - 1) * recordsPerPage,
    currentPage * recordsPerPage
  );
  
  const totalPages = Math.ceil(records.length / recordsPerPage);
  
  const columns = useMemo(() => [
    {
      header: 'Source',
      accessorKey: 'src',
    },
    {
      header: 'Destination',
      accessorKey: 'dst',
    },
    {
      header: 'Date',
      accessorKey: 'calldate',
      cell: ({ row }: any) => {
        const calldate = row.original.calldate;
        try {
          // Try to format as a date if possible, otherwise show as is
          return calldate ? format(new Date(calldate), 'MMM d, yyyy') : 'N/A';
        } catch (error) {
          return calldate || 'N/A';
        }
      },
    },
    {
      header: 'Calls',
      accessorKey: 'calls',
      cell: ({ row }: any) => {
        const calls = row.original.calls;
        return <span>{calls || 1}</span>;
      },
    },
    {
      header: 'Direction',
      accessorKey: 'direction',
      cell: ({ row }: any) => {
        const direction = row.original.direction;
        const color = 
          direction === 'inbound' ? 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400' :
          direction === 'outbound' ? 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400' :
          direction === 'internal' ? 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400' :
          'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-400';
        
        return (
          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-md ${color}`}>
            {direction === 'inbound' ? 'Inbound' :
             direction === 'outbound' ? 'Outbound' :
             direction === 'internal' ? 'Internal' : 'Unknown'}
          </span>
        );
      },
    },
    {
      header: 'Duration',
      accessorKey: 'duration',
      cell: ({ row }: any) => {
        const duration = row.original.duration;
        const avg_duration = row.original.avg_duration;
        
        // Use avg_duration if it's available and a specific duration isn't
        const displayDuration = (duration === undefined && avg_duration !== undefined) 
          ? avg_duration 
          : duration;
          
        return <span>{formatDuration(displayDuration || 0)}</span>;
      },
    },
    {
      header: 'Status',
      accessorKey: 'disposition',
      cell: ({ row }: any) => {
        const disposition = row.original.disposition;
        const color = 
          disposition === 'ANSWERED' ? 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400' :
          disposition === 'NO ANSWER' ? 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400' :
          disposition === 'BUSY' ? 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400' :
          'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
        
        return (
          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-md ${color}`}>
            {disposition === 'ANSWERED' ? 'Answered' :
             disposition === 'NO ANSWER' ? 'No Answer' :
             disposition === 'BUSY' ? 'Busy' : 'Failed'}
          </span>
        );
      },
    },
  ], []);
  
  if (isLoading) {
    return (
      <div className="overflow-x-auto">
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-4 animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr>
                {[...Array(5)].map((_, i) => (
                  <th key={i} className="px-6 py-3">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {[...Array(5)].map((_, i) => (
                <tr key={i}>
                  {[...Array(5)].map((_, j) => (
                    <td key={j} className="px-6 py-4">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
  
  if (records.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400">No call records available for the selected period</p>
      </div>
    );
  }
  
  return (
    <div className="overflow-hidden">
      <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">Call Details</h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 uppercase tracking-wider">
            <tr>
              {columns.map((column, i) => (
                <th key={i} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentRecords.length > 0 ? (
              currentRecords.map((record, i) => (
                <tr 
                  key={i} 
                  className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  {columns.map((column, j) => (
                    <td key={j} className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">
                      {column.cell ? 
                        column.cell({ row: { original: record } }) : 
                        record[column.accessorKey as keyof typeof record]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                  No call records found for the selected time period
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {records.length > 0 && (
        <div className="flex justify-between items-center px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Showing {currentRecords.length === 0 ? 0 : startIndex + 1}-{Math.min(endIndex, records.length)} of {records.length} records
          </div>
          
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className={`p-1 rounded ${
                currentPage === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <ChevronLeft size={18} />
            </button>
            
            <span className="text-sm text-gray-700 dark:text-gray-300">Page {currentPage} of {totalPages}</span>
            
            <button 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className={`p-1 rounded ${
                currentPage === totalPages ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 