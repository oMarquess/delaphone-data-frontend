/**
 * Types for chart data collection and visualization
 */

// Type definitions for different visualization data formats
export type MetricData = {
  value: number | string;
  label?: string;
  previousValue?: number | string;
  change?: number;
  changeDirection?: 'up' | 'down' | 'neutral';
  [key: string]: any;
};

export type ChartData = {
  labels?: string[];
  datasets?: any[];
  [key: string]: any;
};

export type TableData = {
  headers?: string[];
  rows?: any[];
  [key: string]: any;
};

// Visualization types supported by the application
export type VisualizationType = 'metric' | 'chart' | 'table' | 'gauge' | 'heatmap';

// Generic visualization object structure
export interface Visualization {
  id: string;
  title: string;
  type: VisualizationType;
  data: MetricData | ChartData | TableData | any;
  config?: {
    [key: string]: any;
  };
}

// Map of tab identifiers to collections of visualizations
export interface TabVisualizations {
  [tabId: string]: Visualization[];
}

/**
 * Helper function to collect visualization data from a specific tab
 * (This is a placeholder - actual implementation would depend on the app's architecture)
 */
export const collectTabVisualizations = (
  tabId: string,
  visualizations: Visualization[]
): TabVisualizations => {
  return {
    [tabId]: visualizations
  };
}; 