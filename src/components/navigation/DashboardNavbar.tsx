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
  MenuOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import { Sparkles, Download } from 'lucide-react';
import { Drawer } from 'antd';
import { motion, AnimatePresence } from 'framer-motion';

export default function DashboardNavbar() {
  const [timeRange, setTimeRange] = useState('Last 7 days');
  const [agent, setAgent] = useState('All Agents');
  const { collapsed, toggleSidebar, mobileNavOpen, toggleMobileNav } = useSidebar();
  const [isMobile, setIsMobile] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  // Check screen size on mount and resize
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const openAIDrawer = () => {
    setDrawerOpen(true);
  };

  const closeAIDrawer = () => {
    setDrawerOpen(false);
  };

  // Animation variants for the drawer content
  const drawerAnimationVariants = {
    hidden: { 
      opacity: 0,
      y: 20,
      scale: 0.95
    },
    visible: { 
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { 
        type: "spring", 
        bounce: 0.4,
        duration: 0.6 
      }
    },
    exit: {
      opacity: 0,
      y: 10,
      scale: 0.98,
      transition: { 
        duration: 0.2 
      }
    }
  };
  
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
          
          <button 
            className="relative p-2.5 rounded-lg overflow-hidden bg-gradient-to-b from-[#8c45ff] to-[#5F17ED] transition-transform hover:scale-105 group"
            onClick={openAIDrawer}
            aria-label="AI Assistant"
          >
            <div className="absolute inset-0 rounded-lg">
              <div className="border border-white/20 absolute inset-0 rounded-lg [mask-image:linear-gradient(to_bottom,black,transparent)]"></div>
              <div className="border absolute inset-0 rounded-lg border-white/40 [mask-image:linear-gradient(to_top,black,transparent)]"></div>
            </div>
            <div className="relative flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full animate-ping"></div>
            </div>
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
          <button 
            className="relative p-1.5 rounded-full overflow-hidden bg-gradient-to-b from-[#8c45ff] to-[#5F17ED] group"
            onClick={openAIDrawer}
            aria-label="AI Assistant"
          >
            <Sparkles className="h-4 w-4 text-white" />
            <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-white rounded-full animate-ping"></div>
          </button>
        </div>
        
        {/* Always visible */}
        <div className="ml-2 md:ml-3">
          <ThemeToggle />
        </div>
      </div>

      {/* AI Drawer */}
      <Drawer
        title="AI Assistant"
        placement="bottom"
        size="large"
        onClose={closeAIDrawer}
        open={drawerOpen}
        rootClassName="ai-drawer-custom"
        style={{ borderTopLeftRadius: '24px', borderTopRightRadius: '24px', overflow: 'hidden' }}
        styles={{
          header: { borderTopLeftRadius: '24px', borderTopRightRadius: '24px' },
          body: { borderTopLeftRadius: '24px', borderTopRightRadius: '24px', padding: 0 },
          mask: { backgroundColor: 'rgba(0, 0, 0, 0.65)' },
          content: { 
            borderTopLeftRadius: '24px', 
            borderTopRightRadius: '24px',
            boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.15)'
          },
          wrapper: { borderRadius: '24px 24px 0 0' }
        }}
      >
        <AnimatePresence>
          {drawerOpen && (
            <>
              {/* Export icon on right margin - outside of the animated div */}
              <div className="absolute right-6 top-20 z-10">
                <button 
                  className="p-2 rounded-full bg-white dark:bg-gray-800 shadow-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  aria-label="Export"
                >
                  <DownloadOutlined style={{ fontSize: '18px' }} />
                </button>
              </div>
              
              <motion.div
                className="flex flex-col h-full"
                variants={drawerAnimationVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                {/* Main content with specified padding */}
                <div className="flex-1 px-[120px] py-16">
                  <p>AI assistant content will go here.</p>
                </div>
                
                {/* Footer with navigation */}
                <div className="border-t border-gray-200 dark:border-gray-700 px-[120px] py-6">
                  <div className="flex justify-between items-center">
                    <button 
                      className="flex items-center space-x-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>Previous</span>
                    </button>
                    
                    <button 
                      className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                    >
                      <span>Next</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </Drawer>
    </header>
  );
} 