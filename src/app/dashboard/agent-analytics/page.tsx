'use client';

import React, { useState } from 'react';
import { PhoneIcon, UserIcon, ClockIcon, BarChartIcon, FilterIcon, ChevronDownIcon, CalendarIcon, CheckCircleIcon } from 'lucide-react';
import { AnalyticsFilters } from '@/components/analytics/AnalyticsFilterBar';
import { AgentAnalyticsFilterBar, AgentAnalyticsFilters } from '@/components/analytics/AgentAnalyticsFilterBar';
import { useAnalyticsData, formatDuration } from '@/services/analytics';
import QuickDateSelector from '@/components/analytics/QuickDateSelector';
import { publishDateChange, publishFilterChange } from '@/components/ai/AIDrawer';
import AgentPerformanceChart from '@/components/analytics/AgentPerformanceChart';
import AgentDispositionChart from '@/components/analytics/AgentDispositionChart';
import AgentEfficiencyGauges from '@/components/analytics/AgentEfficiencyGauges';

export default function AgentAnalyticsPage() {
  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];
  
  // Initial filters
  const initialFilters: AgentAnalyticsFilters = {
    startDate: today,
    endDate: today,
    minCalls: 1,
    disposition: 'all',
    direction: 'all',
    sortBy: 'count',
    limit: 100,
    agent: 'all'
  };

  const [filters, setFilters] = useState<AgentAnalyticsFilters>(initialFilters);
  const { data, isLoading, isError } = useAnalyticsData(filters, 'agent');
  const [filterVisible, setFilterVisible] = useState(false);
  const [dateRangeLabel, setDateRangeLabel] = useState('Custom');

  // State for tab selection in the detailed analysis section
  const [analysisTab, setAnalysisTab] = useState<string>('performance');

  const handleFilterChange = (newFilters: AgentAnalyticsFilters) => {
    setFilters(newFilters);
    
    // Publish filter changes for AI Drawer to sync
    publishFilterChange('Agent Analytics', newFilters);
    
    // Also publish date changes if they're included
    if (newFilters.startDate && newFilters.endDate) {
      publishDateChange(newFilters.startDate, newFilters.endDate);
    }
  };

  const handleDateRangeChange = (startDate: string, endDate: string, label: string) => {
    setDateRangeLabel(label);
    
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
    
    // Publish date changes for AI Drawer to sync
    publishDateChange(startDate, endDate);
    
    const newFilters = {
      ...filters,
      startDate,
      endDate
    };
    setFilters(newFilters);
    
    // If we select a preset, automatically apply the filter
    if (label !== 'Custom') {
      publishFilterChange('Agent Analytics', newFilters);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with filter toggle */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Agent Analytics</h1>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <button 
            onClick={() => setFilterVisible(!filterVisible)}
            className="flex items-center gap-2 py-2 px-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <FilterIcon size={16} />
            <span>Advanced Filters</span>
            <ChevronDownIcon size={16} className={`transition-transform ${filterVisible ? 'rotate-180' : ''}`} />
          </button>
          
          <div className="flex items-center gap-2 py-2 px-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md">
            <CalendarIcon size={16} className="text-gray-500 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {data?.time_period?.start_date} to {data?.time_period?.end_date}
            </span>
          </div>
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
      <div className={`transition-all duration-300 overflow-hidden ${filterVisible ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
        <AgentAnalyticsFilterBar 
          onFilterChange={handleFilterChange} 
          initialFilters={initialFilters}
          agents={data?.agents || []}
        />
      </div>
      
      {/* Error message */}
      {isError && (
        <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg border border-red-200 dark:border-red-800">
          <h2 className="text-lg font-medium text-red-800 dark:text-red-400 mb-2">Error Loading Data</h2>
          <p className="text-red-600 dark:text-red-400">Failed to load analytics data. Please try again later.</p>
        </div>
      )}
      
      {/* Dashboard status with improved styling */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
        <div className="text-sm text-blue-800 dark:text-blue-300 space-y-1 sm:space-y-0">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="inline-flex items-center">
              <CalendarIcon size={14} className="mr-1.5" />
              <span className="font-medium mr-1.5">Period:</span> {filters.startDate} to {filters.endDate}
            </span>
            
            <span className="hidden sm:inline-block text-blue-300 dark:text-blue-700">|</span>
            
            <span className="inline-flex items-center">
              <PhoneIcon size={14} className="mr-1.5" />
              <span className="font-medium">Direction:</span> {filters.direction}
            </span>
            
            <span className="hidden sm:inline-block text-blue-300 dark:text-blue-700">|</span>
            
            <span className="inline-flex items-center">
              <CheckCircleIcon size={14} className="mr-1.5" />
              <span className="font-medium">Call Type:</span> {filters.disposition}
            </span>
          </div>
        </div>
        
        {isLoading && (
          <div className="flex items-center text-blue-700 dark:text-blue-400 mt-2 sm:mt-0">
            <div className="animate-spin h-4 w-4 border-2 border-t-transparent border-blue-500 rounded-full mr-2"></div>
            <span className="text-sm">Loading insights...</span>
          </div>
        )}
      </div>
      
      {/* Key Metrics Cards - Agent-focused metrics */}
      <section aria-labelledby="summary-metrics" className="pt-2">
        <div className="sr-only" id="summary-metrics">Agent Summary Metrics</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-xl shadow-sm border border-blue-100 dark:border-blue-800/50 transition-all hover:shadow-md">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-sm font-medium text-blue-700 dark:text-blue-400">Total Agents</h3>
              <div className="p-2 rounded-full bg-white/80 dark:bg-gray-800/80 shadow-sm">
                <UserIcon size={18} className="text-blue-500 dark:text-blue-400" />
              </div>
            </div>
            
            <div className="text-3xl font-bold text-gray-800 dark:text-white mb-1">
              {isLoading ? 
                <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div> : 
                data?.summary?.total_agents || 0
              }
            </div>
            
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {(data?.summary?.total_agents || 0) === 1 ? 'Active agent' : 'Active agents'}
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-6 rounded-xl shadow-sm border border-purple-100 dark:border-purple-800/50 transition-all hover:shadow-md">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-sm font-medium text-purple-700 dark:text-purple-400">Avg Calls/Agent</h3>
              <div className="p-2 rounded-full bg-white/80 dark:bg-gray-800/80 shadow-sm">
                <PhoneIcon size={18} className="text-purple-500 dark:text-purple-400" />
              </div>
            </div>
            
            <div className="text-3xl font-bold text-gray-800 dark:text-white mb-1">
              {isLoading ? 
                <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div> : 
                Math.round((data?.summary?.total_calls || 0) / (data?.summary?.total_agents || 1))
              }
            </div>
            
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {Math.round((data?.summary?.total_calls || 0) / (data?.summary?.total_agents || 1)) === 1 ? 
                'Call per agent' : 
                'Calls per agent'}
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 p-6 rounded-xl shadow-sm border border-green-100 dark:border-green-800/50 transition-all hover:shadow-md">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-sm font-medium text-green-700 dark:text-green-400">Avg Handle Time</h3>
              <div className="p-2 rounded-full bg-white/80 dark:bg-gray-800/80 shadow-sm">
                <ClockIcon size={18} className="text-green-500 dark:text-green-400" />
              </div>
            </div>
            
            <div className="text-3xl font-bold text-gray-800 dark:text-white mb-1">
              {isLoading ? 
                <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div> : 
                Math.round(((data?.summary?.avg_handling_time || data?.summary?.avg_handle_time || 
                  (data?.summary?.team_averages?.call_duration || 0)) / 60) || 1)
              }
            </div>
            
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Minutes per call
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-6 rounded-xl shadow-sm border border-amber-100 dark:border-amber-800/50 transition-all hover:shadow-md">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-sm font-medium text-amber-700 dark:text-amber-400">Avg Resolution Rate</h3>
              <div className="p-2 rounded-full bg-white/80 dark:bg-gray-800/80 shadow-sm">
                <CheckCircleIcon size={18} className="text-amber-500 dark:text-amber-400" />
              </div>
            </div>
            
            <div className="text-3xl font-bold text-gray-800 dark:text-white mb-1">
              {isLoading ? 
                <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div> : 
                `${Math.round(data?.summary?.avg_answer_rate || 0)}%`
              }
            </div>
            
            <div className="text-sm text-gray-500 dark:text-gray-400">
              First call resolution
            </div>
          </div>
        </div>
      </section>
      
      {/* Placeholder for agent analytics charts */}
      <section aria-labelledby="agent-analysis" className="pt-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Tab navigation */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setAnalysisTab('performance')}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                analysisTab === 'performance'
                  ? 'bg-gray-50 dark:bg-gray-700/50 border-b-2 border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700/30'
              }`}
            >
              Agent Performance
            </button>
            <button
              onClick={() => setAnalysisTab('efficiency')}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                analysisTab === 'efficiency'
                  ? 'bg-gray-50 dark:bg-gray-700/50 border-b-2 border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700/30'
              }`}
            >
              Efficiency Metrics
            </button>
            <button
              onClick={() => setAnalysisTab('satisfaction')}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                analysisTab === 'satisfaction'
                  ? 'bg-gray-50 dark:bg-gray-700/50 border-b-2 border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700/30'
              }`}
            >
              Customer Satisfaction
            </button>
          </div>
          
          {/* Tab content */}
          <div className="p-6">
            {analysisTab === 'performance' && (
              <div className="h-[400px]">
                <AgentPerformanceChart 
                  agents={data?.agents || []} 
                  isLoading={isLoading}
                  teamAverages={data?.summary?.team_averages}
                />
              </div>
            )}
            
            {analysisTab === 'efficiency' && (
              <div className="h-[400px]">
                <AgentDispositionChart
                  dispositionData={data?.disposition_data || []}
                  isLoading={isLoading}
                />
              </div>
            )}
            
            {analysisTab === 'satisfaction' && (
              <div className="h-[530px]">
                <AgentEfficiencyGauges
                  efficiencyData={data?.gauge_metrics?.efficiency_score || []}
                  isLoading={isLoading}
                />
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
} 