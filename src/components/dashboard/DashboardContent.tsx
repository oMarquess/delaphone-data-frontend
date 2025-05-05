'use client';

import { useSidebar } from '@/components/navigation/SidebarContext';
import SideNav from '@/components/navigation/SideNav';
import DashboardNavbar from '@/components/navigation/DashboardNavbar';
import React from 'react';

export default function DashboardContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();
  
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 overflow-hidden">
      {/* Sidebar - will handle its own positioning */}
      <SideNav />
      
      {/* Main content */}
      <div 
        className={`min-h-screen flex flex-col transition-all duration-300 ${
          // Adjust left margin based on collapsed state
          collapsed ? 'lg:ml-20' : 'lg:ml-64'
        }`}
      >
        <DashboardNavbar />
        <main className="flex-1 p-4 px-4 lg:px-8 pt-24 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
} 