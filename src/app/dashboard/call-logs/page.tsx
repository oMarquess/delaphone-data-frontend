'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { SearchOutlined, FilterOutlined, DownloadOutlined } from '@ant-design/icons';

export default function CallLogsPage() {
  const [isLoading, setIsLoading] = useState(false);
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Call Logs</h1>
        <div className="flex items-center space-x-2">
          <button className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md flex items-center space-x-1">
            <FilterOutlined style={{ fontSize: '14px' }} />
            <span>Filter</span>
          </button>
          <button className="px-4 py-2 bg-gray-800 dark:bg-gray-700 text-white rounded-md flex items-center space-x-1">
            <DownloadOutlined style={{ fontSize: '14px' }} />
            <span>Export</span>
          </button>
        </div>
      </div>
      
      {/* Search bar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500 dark:text-gray-400">
            <SearchOutlined style={{ fontSize: '16px' }} />
          </span>
          <input
            type="text"
            placeholder="Search by caller ID, direction, disposition..."
            className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400"
          />
        </div>
      </div>
      
      {/* Call logs table */}
      <div className="bg-white dark:bg-gray-800 overflow-hidden rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        {isLoading ? (
          <div className="p-6 flex items-center justify-center">
            <div className="flex flex-col items-center space-y-2">
              <div className="w-8 h-8 border-4 border-t-purple-500 border-b-purple-700 border-l-purple-600 border-r-purple-600 rounded-full animate-spin"></div>
              <p className="text-gray-500 dark:text-gray-400">Loading call logs...</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Direction
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    From
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    To
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Duration
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                <tr className="text-sm text-gray-700 dark:text-gray-300">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {format(new Date(), 'MMM dd, yyyy HH:mm:ss')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                      Inbound
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">+15551234567</td>
                  <td className="px-6 py-4 whitespace-nowrap">+17778889999</td>
                  <td className="px-6 py-4 whitespace-nowrap">2m 45s</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                      Answered
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300">
                      View Details
                    </button>
                  </td>
                </tr>
                <tr className="text-sm text-gray-700 dark:text-gray-300">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {format(new Date(Date.now() - 3600000), 'MMM dd, yyyy HH:mm:ss')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">
                      Outbound
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">+17778889999</td>
                  <td className="px-6 py-4 whitespace-nowrap">+12223334444</td>
                  <td className="px-6 py-4 whitespace-nowrap">1m 15s</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                      Answered
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300">
                      View Details
                    </button>
                  </td>
                </tr>
                <tr className="text-sm text-gray-700 dark:text-gray-300">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {format(new Date(Date.now() - 7200000), 'MMM dd, yyyy HH:mm:ss')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                      Inbound
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">+13334445555</td>
                  <td className="px-6 py-4 whitespace-nowrap">+17778889999</td>
                  <td className="px-6 py-4 whitespace-nowrap">0m 0s</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">
                      No Answer
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300">
                      View Details
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
} 