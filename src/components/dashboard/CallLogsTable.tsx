'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ChevronDownIcon, ChevronUpIcon, Play, Download, ChevronLeft, ChevronRight, Phone, Clock, Calendar, Info, ArrowUp, ArrowDown, ChevronsLeft, ChevronsRight, MessageSquare, TrendingUp, Users, Star, FileText } from 'lucide-react';
import React from 'react';
import { useAudioPlayer } from '@/components/ui/GlobalAudioPlayer';
import { API_BASE_URL } from '@/config/constants';
import tokenManager from '@/services/tokenManager';
import axios from 'axios';

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
  // Transcript fields
  transcript_id?: string;
  transcript_text?: string;
  transcript_confidence?: number;
  transcript_audio_duration?: number;
  transcript_words_count?: number;
  transcript_speakers_count?: number;
  transcript_sentiments_count?: number;
  transcript_topics_detected?: number;
  transcript_status?: string;
  transcript_processed_at?: string;
  transcript_utterances?: Array<{
    speaker: string;
    text: string;
    start: number;
    end: number;
    confidence: number;
  }>;
  transcript_sentiment_analysis?: Array<{
    text: string;
    sentiment: string;
    confidence: number;
    start: number;
    end: number;
  }>;
  transcript_lemur_analysis?: {
    custom_topic?: string;
    agent_performance?: {
      agent_identified?: string;
      customer_identified?: string;
      heat_model_analysis?: {
        halt_score?: string;
        halt_numeric?: number;
        empathy_score?: string;
        empathy_numeric?: number;
        apologize_score?: string;
        apologize_numeric?: number;
        take_action_score?: string;
        take_action_numeric?: number;
      };
      overall_performance?: string;
      overall_numeric_score?: string;
      performance_explanation?: string;
    };
    sentiment_analysis?: {
      customer_sentiment?: string;
      customer_explanation?: string;
      agent_sentiment?: string;
      agent_explanation?: string;
    };
    call_completion?: {
      status?: string;
      explanation?: string;
    };
  };
  transcript_public_url?: string;
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
  const [loadingRecording, setLoadingRecording] = useState<string | null>(null);

  // Debug: Log transcript data in records
  console.log('📋 CallLogsTable received records:', records.length);
  console.log('🎯 Records with transcript_id:', records.filter(r => r.transcript_id).length);
  console.log('📝 Sample record transcript fields:', records[0] ? {
    uniqueid: records[0].uniqueid,
    transcript_id: records[0].transcript_id,
    transcript_text: records[0].transcript_text ? records[0].transcript_text.substring(0, 100) + '...' : null,
    transcript_status: records[0].transcript_status,
    transcript_confidence: records[0].transcript_confidence,
    transcript_words_count: records[0].transcript_words_count
  } : 'No records');
  
  // Use the global audio player
  const { playAudio } = useAudioPlayer();
  
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

  // Helper functions for transcript data
  const hasTranscript = (record: CallLog): boolean => {
    const hasTranscriptData = !!(record.transcript_id && record.transcript_text && record.transcript_status === 'TranscriptStatus.completed');
    console.log('🎯 Transcript Check for record:', record.uniqueid, {
      transcript_id: record.transcript_id,
      transcript_text: record.transcript_text ? `${record.transcript_text.substring(0, 50)}...` : null,
      transcript_status: record.transcript_status,
      hasTranscriptData
    });
    return hasTranscriptData;
  };

  const getTranscriptSummary = (record: CallLog) => {
    if (!hasTranscript(record)) return null;
    return {
      wordsCount: record.transcript_words_count || 0,
      speakersCount: record.transcript_speakers_count || 0,
      confidence: record.transcript_confidence || 0,
      duration: record.transcript_audio_duration || 0
    };
  };

  const getSentimentClass = (sentiment: string): string => {
    switch (sentiment?.toUpperCase()) {
      case 'POSITIVE':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'NEGATIVE':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'NEUTRAL':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getPerformanceClass = (score: string): string => {
    switch (score?.toUpperCase()) {
      case 'EXCELLENT':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'GOOD':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'FAIR':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'POOR':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const formatMilliseconds = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
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
  // console.log('Pagination Debug:', { filteredCount, pageSize, totalPages, currentPage });

  // Updated to use global audio player
  const handlePlayRecording = async (recordingfile: string, callInfo?: { src: string; dst: string; calldate: string }) => {
    try {
      setLoadingRecording(recordingfile);
      const token = await tokenManager.getValidToken();
      const audioUrl = `${API_BASE_URL}/sftp-stream-audio?full_path=${encodeURIComponent(recordingfile)}`;
      console.log('Streaming audio from:', audioUrl);
      
      // Use axios to fetch the audio with authentication
      const response = await axios.get(audioUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        responseType: 'blob'
      });
      
      // Create a blob URL from the response
      const blob = new Blob([response.data], { type: 'audio/wav' });
      const objectUrl = URL.createObjectURL(blob);
      
      // Create title for the audio player
      const title = callInfo 
        ? `${formatPhoneNumber(callInfo.src)} → ${formatPhoneNumber(callInfo.dst)} (${formatDate(callInfo.calldate)})`
        : 'Call Recording';
      
      // Play audio using global player
      playAudio(objectUrl, title);
      
    } catch (error) {
      console.error('Error getting token or streaming audio:', error);
    } finally {
      setLoadingRecording(null);
    }
  };

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
                {/* <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div> */}
                <span className="text-gray-500 dark:text-gray-400">Loading records...</span>
              </div>
            </div>
          ) : sortedRecords.length > 0 ? (
            sortedRecords.map((record) => (
              <div 
                key={`card-${record.uniqueid}`}
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
                  
                  {/* Call direction indicator and transcript badge */}
                  <div className="flex items-center justify-between mb-3">
                    <span className={`px-2 py-0.5 text-xs rounded-full flex items-center ${getDirectionClass(record.direction)}`}>
                      {getDirectionIcon(record.direction)} <span className="ml-1">{record.direction}</span>
                    </span>
                    {hasTranscript(record) && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300 flex items-center">
                        <MessageSquare size={10} className="mr-1" /> Transcript
                      </span>
                    )}
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
                    {record.recordingfile && record.disposition !== 'FAILED' && record.disposition !== 'NO ANSWER' && (
                      <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                        <button 
                          className={`flex items-center gap-1 text-xs hover:underline ${
                            loadingRecording === record.recordingfile 
                              ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed' 
                              : 'text-blue-600 dark:text-blue-400'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlayRecording(record.recordingfile, { src: record.src, dst: record.dst, calldate: record.calldate });
                          }}
                          disabled={loadingRecording === record.recordingfile}
                          title={record.recordingfile}
                        >
                          <Play size={12} /> {loadingRecording === record.recordingfile ? 'Loading...' : 'Play recording'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Expanded details */}
                {expandedRow === record.uniqueid && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/70 border-t border-gray-200 dark:border-gray-600">
                    {/* Call Details Section */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div>
                        <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Call ID</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 break-all">{record.uniqueid}</div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">DID</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 break-words">{record.did || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Channel</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 break-words">{record.channel}</div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Dest. Channel</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 break-words">{record.dstchannel || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Last App</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 break-words">{record.lastapp}</div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Last Data</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 break-all">{record.lastdata}</div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Bill Duration</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">{formatDuration(record.billsec)}</div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Account Code</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 break-words">{record.accountcode || 'N/A'}</div>
                      </div>
                    </div>

                    {/* Transcript Section */}
                    {hasTranscript(record) && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                        <h4 className="text-sm font-semibold text-gray-800 dark:text-white mb-3 flex items-center">
                          <MessageSquare size={16} className="mr-2" />
                          Call Transcript & Analysis
                        </h4>
                        
                        {/* Transcript Summary */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                          <div className="bg-white dark:bg-gray-800 p-2 rounded border">
                            <div className="text-xs text-gray-500 dark:text-gray-400">Words</div>
                            <div className="text-sm font-medium text-gray-800 dark:text-white">{record.transcript_words_count || 0}</div>
                          </div>
                          <div className="bg-white dark:bg-gray-800 p-2 rounded border">
                            <div className="text-xs text-gray-500 dark:text-gray-400">Speakers</div>
                            <div className="text-sm font-medium text-gray-800 dark:text-white">{record.transcript_speakers_count || 0}</div>
                          </div>
                          <div className="bg-white dark:bg-gray-800 p-2 rounded border">
                            <div className="text-xs text-gray-500 dark:text-gray-400">Confidence</div>
                            <div className="text-sm font-medium text-gray-800 dark:text-white">{Math.round((record.transcript_confidence || 0) * 100)}%</div>
                          </div>
                          <div className="bg-white dark:bg-gray-800 p-2 rounded border">
                            <div className="text-xs text-gray-500 dark:text-gray-400">Audio Duration</div>
                            <div className="text-sm font-medium text-gray-800 dark:text-white">{formatDuration(record.transcript_audio_duration || 0)}</div>
                          </div>
                        </div>

                        {/* Agent Performance (if available) */}
                        {record.transcript_lemur_analysis?.agent_performance && (
                          <div className="mb-4 p-3 bg-white dark:bg-gray-800 rounded border">
                            <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                              <Star size={12} className="mr-1" />
                              Agent Performance
                            </h5>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">Overall</div>
                                <span className={`px-2 py-0.5 text-xs rounded-full ${getPerformanceClass(record.transcript_lemur_analysis.agent_performance.overall_performance || '')}`}>
                                  {record.transcript_lemur_analysis.agent_performance.overall_performance || 'N/A'}
                                </span>
                              </div>
                              {record.transcript_lemur_analysis.agent_performance.heat_model_analysis?.empathy_score && (
                                <div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">Empathy</div>
                                  <span className={`px-2 py-0.5 text-xs rounded-full ${getPerformanceClass(record.transcript_lemur_analysis.agent_performance.heat_model_analysis.empathy_score)}`}>
                                    {record.transcript_lemur_analysis.agent_performance.heat_model_analysis.empathy_score}
                                  </span>
                                </div>
                              )}
                              {record.transcript_lemur_analysis.agent_performance.heat_model_analysis?.halt_score && (
                                <div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">Listening</div>
                                  <span className={`px-2 py-0.5 text-xs rounded-full ${getPerformanceClass(record.transcript_lemur_analysis.agent_performance.heat_model_analysis.halt_score)}`}>
                                    {record.transcript_lemur_analysis.agent_performance.heat_model_analysis.halt_score}
                                  </span>
                                </div>
                              )}
                              {record.transcript_lemur_analysis.agent_performance.heat_model_analysis?.take_action_score && (
                                <div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">Action</div>
                                  <span className={`px-2 py-0.5 text-xs rounded-full ${getPerformanceClass(record.transcript_lemur_analysis.agent_performance.heat_model_analysis.take_action_score)}`}>
                                    {record.transcript_lemur_analysis.agent_performance.heat_model_analysis.take_action_score}
                                  </span>
                                </div>
                              )}
                            </div>
                            {record.transcript_lemur_analysis.agent_performance.performance_explanation && (
                              <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                                {record.transcript_lemur_analysis.agent_performance.performance_explanation}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Sentiment Analysis Summary */}
                        {record.transcript_lemur_analysis?.sentiment_analysis && (
                          <div className="mb-4 p-3 bg-white dark:bg-gray-800 rounded border">
                            <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                              <TrendingUp size={12} className="mr-1" />
                              Sentiment Analysis
                            </h5>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Customer</div>
                                <span className={`px-2 py-0.5 text-xs rounded-full ${getSentimentClass(record.transcript_lemur_analysis.sentiment_analysis.customer_sentiment || '')}`}>
                                  {record.transcript_lemur_analysis.sentiment_analysis.customer_sentiment || 'N/A'}
                                </span>
                                {record.transcript_lemur_analysis.sentiment_analysis.customer_explanation && (
                                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                    {record.transcript_lemur_analysis.sentiment_analysis.customer_explanation}
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Agent</div>
                                <span className={`px-2 py-0.5 text-xs rounded-full ${getSentimentClass(record.transcript_lemur_analysis.sentiment_analysis.agent_sentiment || '')}`}>
                                  {record.transcript_lemur_analysis.sentiment_analysis.agent_sentiment || 'N/A'}
                                </span>
                                {record.transcript_lemur_analysis.sentiment_analysis.agent_explanation && (
                                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                    {record.transcript_lemur_analysis.sentiment_analysis.agent_explanation}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Call Completion Status */}
                        {record.transcript_lemur_analysis?.call_completion && (
                          <div className="mb-4 p-3 bg-white dark:bg-gray-800 rounded border">
                            <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Call Completion</h5>
                            <div className="flex items-center">
                              <span className={`px-2 py-0.5 text-xs rounded-full ${
                                record.transcript_lemur_analysis.call_completion.status === 'COMPLETE' 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                              }`}>
                                {record.transcript_lemur_analysis.call_completion.status || 'N/A'}
                              </span>
                            </div>
                            {record.transcript_lemur_analysis.call_completion.explanation && (
                              <div className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                                {record.transcript_lemur_analysis.call_completion.explanation}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Full Transcript Text */}
                        <div className="p-3 bg-white dark:bg-gray-800 rounded border">
                          <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                            <FileText size={12} className="mr-1" />
                            Full Transcript
                          </h5>
                          <div className="text-xs text-gray-600 dark:text-gray-400 max-h-32 overflow-y-auto">
                            {record.transcript_text || 'No transcript text available'}
                          </div>
                        </div>
                      </div>
                    )}

                    {record.disposition !== 'FAILED' && record.disposition !== 'NO ANSWER' && (
                      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                        <button 
                          className="p-1 rounded bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Download size={14} />
                        </button>
                      </div>
                    )}
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
          {/* Hint text to guide users */}
          <div className="px-6 py-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 flex items-center">
            <Info size={12} className="mr-1.5" /> Click on any row to see more details
          </div>
          
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th scope="col" className="w-8 px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                </th>
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
                  Transcript
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-10 text-center">
                    <div className="flex justify-center items-center space-x-2">
                      {/* <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500"></div> */}
                      <span className="text-gray-500 dark:text-gray-400">Loading records...</span>
                    </div>
                  </td>
                </tr>
              ) : sortedRecords.length > 0 ? (
                sortedRecords.map((record) => (
                  <React.Fragment key={record.uniqueid}>
                    <tr 
                      className={`group hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer ${
                        expandedRow === record.uniqueid ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                      onClick={() => toggleRowExpansion(record.uniqueid)}
                    >
                      <td className="pl-4 pr-0 py-4 whitespace-nowrap text-center align-middle">
                        <div className={`transition-transform duration-200 ${expandedRow === record.uniqueid ? 'rotate-90' : ''}`}>
                          <ChevronRight size={16} className="text-gray-400 group-hover:text-blue-500 dark:text-gray-500 dark:group-hover:text-blue-400" />
                        </div>
                      </td>
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
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {hasTranscript(record) ? (
                          <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
                            <MessageSquare size={10} className="mr-1" />
                            Available
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-white">
                        <div className="flex space-x-2">
                          {record.disposition !== 'FAILED' && record.disposition !== 'NO ANSWER' && (
                            <>
                              <button 
                                className="p-1 rounded bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Download size={16} />
                              </button>
                              {record.recordingfile && (
                                <button 
                                  className={`flex items-center gap-1 text-xs hover:underline ${
                                    loadingRecording === record.recordingfile 
                                      ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed' 
                                      : 'text-blue-600 dark:text-blue-400'
                                  }`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePlayRecording(record.recordingfile, { src: record.src, dst: record.dst, calldate: record.calldate });
                                  }}
                                  disabled={loadingRecording === record.recordingfile}
                                  title={record.recordingfile}
                                >
                                  <Play size={12} /> {loadingRecording === record.recordingfile ? 'Loading...' : 'Play recording'}
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expandedRow === record.uniqueid && (
                      <tr key={`${record.uniqueid}-expanded`} className="bg-gray-50 dark:bg-gray-700/70">
                        <td colSpan={9} className="px-6 py-4">
                          <div className="space-y-6">
                            {/* Call Details Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-600">
                                <h4 className="text-sm font-semibold text-gray-800 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-2 mb-3">Call Details</h4>
                                <div className="space-y-2">
                                  <div className="grid grid-cols-[100px_1fr] items-baseline">
                                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">ID:</span>
                                    <span className="text-xs text-gray-800 dark:text-gray-200 font-mono break-all">{record.uniqueid}</span>
                                  </div>
                                  <div className="grid grid-cols-[100px_1fr] items-baseline">
                                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Channel:</span>
                                    <span className="text-xs text-gray-800 dark:text-gray-200 break-words">{record.channel}</span>
                                  </div>
                                  <div className="grid grid-cols-[100px_1fr] items-baseline">
                                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Dest. Channel:</span>
                                    <span className="text-xs text-gray-800 dark:text-gray-200 break-words">{record.dstchannel || 'N/A'}</span>
                                  </div>
                                  <div className="grid grid-cols-[100px_1fr] items-baseline">
                                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Context:</span>
                                    <span className="text-xs text-gray-800 dark:text-gray-200 break-words">{record.dcontext}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-600">
                                <h4 className="text-sm font-semibold text-gray-800 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-2 mb-3">Duration Details</h4>
                                <div className="space-y-2">
                                  <div className="grid grid-cols-[100px_1fr] items-baseline">
                                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Duration:</span>
                                    <span className="text-xs text-gray-800 dark:text-gray-200 break-words">{formatDuration(record.duration)}</span>
                                  </div>
                                  <div className="grid grid-cols-[100px_1fr] items-baseline">
                                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Bill Duration:</span>
                                    <span className="text-xs text-gray-800 dark:text-gray-200 break-words">{formatDuration(record.billsec)}</span>
                                  </div>
                                  <div className="grid grid-cols-[100px_1fr] items-baseline">
                                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">DID:</span>
                                    <span className="text-xs text-gray-800 dark:text-gray-200 break-words">{record.did || 'N/A'}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-600">
                                <h4 className="text-sm font-semibold text-gray-800 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-2 mb-3">Application</h4>
                                <div className="space-y-2">
                                  <div className="grid grid-cols-[100px_1fr] items-baseline">
                                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Last App:</span>
                                    <span className="text-xs text-gray-800 dark:text-gray-200 break-words">{record.lastapp}</span>
                                  </div>
                                  <div className="grid grid-cols-[100px_1fr] items-baseline">
                                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Last Data:</span>
                                    <span className="text-xs text-gray-800 dark:text-gray-200 break-all">{record.lastdata}</span>
                                  </div>
                                  <div className="grid grid-cols-[100px_1fr] items-baseline">
                                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Account Code:</span>
                                    <span className="text-xs text-gray-800 dark:text-gray-200 break-words">{record.accountcode || 'N/A'}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Transcript Section */}
                            {hasTranscript(record) && (
                              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-600">
                                <h4 className="text-sm font-semibold text-gray-800 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-2 mb-3 flex items-center">
                                  <MessageSquare size={16} className="mr-2" />
                                  Call Transcript & Analysis
                                </h4>
                                
                                {/* Transcript Summary */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                                  <div className="text-center">
                                    <div className="text-xs text-gray-500 dark:text-gray-400">Words</div>
                                    <div className="text-lg font-semibold text-gray-800 dark:text-white">{record.transcript_words_count || 0}</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-xs text-gray-500 dark:text-gray-400">Speakers</div>
                                    <div className="text-lg font-semibold text-gray-800 dark:text-white">{record.transcript_speakers_count || 0}</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-xs text-gray-500 dark:text-gray-400">Confidence</div>
                                    <div className="text-lg font-semibold text-gray-800 dark:text-white">{Math.round((record.transcript_confidence || 0) * 100)}%</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-xs text-gray-500 dark:text-gray-400">Audio Duration</div>
                                    <div className="text-lg font-semibold text-gray-800 dark:text-white">{formatDuration(record.transcript_audio_duration || 0)}</div>
                                  </div>
                                </div>

                                {/* Analysis Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                  {/* Agent Performance */}
                                  {record.transcript_lemur_analysis?.agent_performance && (
                                    <div className="p-3 border border-gray-200 dark:border-gray-600 rounded">
                                      <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                                        <Star size={12} className="mr-1" />
                                        Agent Performance
                                      </h5>
                                      <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs text-gray-500 dark:text-gray-400">Overall</span>
                                          <span className={`px-2 py-0.5 text-xs rounded-full ${getPerformanceClass(record.transcript_lemur_analysis.agent_performance.overall_performance || '')}`}>
                                            {record.transcript_lemur_analysis.agent_performance.overall_performance || 'N/A'}
                                          </span>
                                        </div>
                                        {record.transcript_lemur_analysis.agent_performance.heat_model_analysis?.empathy_score && (
                                          <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-500 dark:text-gray-400">Empathy</span>
                                            <span className={`px-2 py-0.5 text-xs rounded-full ${getPerformanceClass(record.transcript_lemur_analysis.agent_performance.heat_model_analysis.empathy_score)}`}>
                                              {record.transcript_lemur_analysis.agent_performance.heat_model_analysis.empathy_score}
                                            </span>
                                          </div>
                                        )}
                                        {record.transcript_lemur_analysis.agent_performance.heat_model_analysis?.halt_score && (
                                          <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-500 dark:text-gray-400">Listening</span>
                                            <span className={`px-2 py-0.5 text-xs rounded-full ${getPerformanceClass(record.transcript_lemur_analysis.agent_performance.heat_model_analysis.halt_score)}`}>
                                              {record.transcript_lemur_analysis.agent_performance.heat_model_analysis.halt_score}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Sentiment Analysis */}
                                  {record.transcript_lemur_analysis?.sentiment_analysis && (
                                    <div className="p-3 border border-gray-200 dark:border-gray-600 rounded">
                                      <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                                        <TrendingUp size={12} className="mr-1" />
                                        Sentiment Analysis
                                      </h5>
                                      <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs text-gray-500 dark:text-gray-400">Customer</span>
                                          <span className={`px-2 py-0.5 text-xs rounded-full ${getSentimentClass(record.transcript_lemur_analysis.sentiment_analysis.customer_sentiment || '')}`}>
                                            {record.transcript_lemur_analysis.sentiment_analysis.customer_sentiment || 'N/A'}
                                          </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs text-gray-500 dark:text-gray-400">Agent</span>
                                          <span className={`px-2 py-0.5 text-xs rounded-full ${getSentimentClass(record.transcript_lemur_analysis.sentiment_analysis.agent_sentiment || '')}`}>
                                            {record.transcript_lemur_analysis.sentiment_analysis.agent_sentiment || 'N/A'}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Transcript Text */}
                                <div className="p-3 border border-gray-200 dark:border-gray-600 rounded">
                                  <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                                    <FileText size={12} className="mr-1" />
                                    Full Transcript
                                  </h5>
                                  <div className="text-xs text-gray-600 dark:text-gray-400 max-h-32 overflow-y-auto">
                                    {record.transcript_text || 'No transcript text available'}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
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
              {/* First Page Button */}
              <button 
                onClick={() => goToPage(1)}
                disabled={currentPage === 1 || isLoading}
                className={`relative inline-flex items-center px-2 py-2 rounded-md text-sm font-medium ${
                  currentPage === 1 || isLoading
                    ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                aria-label="Go to first page"
                title="First Page"
              >
                <ChevronsLeft size={16} />
              </button>

              {/* Previous Button */}
              <button 
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1 || isLoading}
                className={`relative inline-flex items-center px-2 py-2 rounded-md text-sm font-medium ${
                  currentPage === 1 || isLoading
                    ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                aria-label="Go to previous page"
                title="Previous Page"
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
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  aria-label={`Go to page ${page}`}
                  aria-current={page === currentPage ? "page" : undefined}
                >
                  {page}
                </button>
              ))}
              
              {/* Next Button */}
              <button 
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages || isLoading}
                className={`relative inline-flex items-center px-2 py-2 rounded-md text-sm font-medium ${
                  currentPage === totalPages || isLoading
                    ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                aria-label="Go to next page"
                title="Next Page"
              >
                <ChevronRight size={16} />
              </button>

              {/* Last Page Button */}
              <button 
                onClick={() => goToPage(totalPages)}
                disabled={currentPage === totalPages || isLoading}
                className={`relative inline-flex items-center px-2 py-2 rounded-md text-sm font-medium ${
                  currentPage === totalPages || isLoading
                    ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                aria-label="Go to last page"
                title="Last Page"
              >
                <ChevronsRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 