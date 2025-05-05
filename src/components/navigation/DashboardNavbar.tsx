'use client';

import { ThemeToggle } from '@/components/theme/ThemeToggle';
import Logo from '@/components/logo/Logo';
import { useState, useEffect } from 'react';
import { useSidebar } from './SidebarContext';
import { 
  MenuFoldOutlined, 
  MenuUnfoldOutlined, 
  CalendarOutlined, 
  FilterOutlined, 
  DownloadOutlined,
  MenuOutlined
} from '@ant-design/icons';

export default function DashboardNavbar() {
  const [timeRange, setTimeRange] = useState('Last 7 days');
  const [agent, setAgent] = useState('All Agents');
  const { collapsed, toggleSidebar, mobileNavOpen, toggleMobileNav } = useSidebar();
  const [isMobile, setIsMobile] = useState(false);
  
  // Check screen size on mount and resize
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);
  
  return (
    <header className={`fixed top-0 z-30 h-14 md:h-16 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-between transition-all duration-300 ${
      collapsed ? 'lg:left-20' : 'lg:left-64'
    } left-0 right-0`}>
      {/* Left side - Logo and toggle */}
      <div className="flex items-center space-x-2 md:space-x-4 pl-2 md:pl-4">
        {/* Mobile menu button */}
        <button
          className="lg:hidden p-1.5 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          onClick={toggleMobileNav}
          aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
        >
          <MenuOutlined style={{ fontSize: isMobile ? '16px' : '20px' }} />
        </button>
        
        <Logo />
        
        {/* Desktop sidebar toggle - hidden on mobile */}
        <button
          className="hidden lg:block p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          onClick={toggleSidebar}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <MenuUnfoldOutlined style={{ fontSize: '18px' }} />
          ) : (
            <MenuFoldOutlined style={{ fontSize: '18px' }} />
          )}
        </button>
      </div>
      
      {/* Right side - Controls */}
      <div className="flex items-center pr-2 md:pr-4">
        {/* Hide on small screens */}
        <div className="hidden md:flex items-center space-x-2 lg:space-x-3">
          {/* <button className="flex items-center space-x-1 px-2 py-1 md:px-3 md:py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-xs md:text-sm text-gray-700 dark:text-gray-300">
            <CalendarOutlined style={{ fontSize: '14px' }} />
            <span>{timeRange}</span>
          </button>
          
          <button className="flex items-center space-x-1 px-2 py-1 md:px-3 md:py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-xs md:text-sm text-gray-700 dark:text-gray-300">
            <FilterOutlined style={{ fontSize: '14px' }} />
            <span>{agent}</span>
          </button> */}
          
          <button className="flex items-center space-x-1 px-2 py-1 md:px-3 md:py-1.5 bg-gray-800 dark:bg-gray-700 text-white rounded-md text-xs md:text-sm">
            <DownloadOutlined style={{ fontSize: '14px' }} />
            <span>Export</span>
          </button>
        </div>
        
        {/* Mobile controls - simplified version */}
        <div className="md:hidden flex items-center space-x-2">
          <button className="p-1.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
            <FilterOutlined style={{ fontSize: '14px' }} />
          </button>
          <button className="p-1.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
            <CalendarOutlined style={{ fontSize: '14px' }} />
          </button>
        </div>
        
        {/* Always visible */}
        <div className="ml-2 md:ml-3">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
} 