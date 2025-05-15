'use client';

import { useState } from 'react';
import { Drawer, ConfigProvider, theme as antTheme } from 'antd';
import { motion, AnimatePresence } from 'framer-motion';
import { DownloadOutlined } from '@ant-design/icons';
import { useTheme } from 'next-themes';
import { useEffect } from 'react';

interface AIDrawerProps {
  open: boolean;
  onClose: () => void;
}

export const AIDrawer = ({ open, onClose }: AIDrawerProps) => {
  const { theme, systemTheme } = useTheme();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { darkAlgorithm, defaultAlgorithm } = antTheme;

  // Check if current theme is dark
  useEffect(() => {
    const currentTheme = theme === 'system' ? systemTheme : theme;
    setIsDarkMode(currentTheme === 'dark');
  }, [theme, systemTheme]);

  // Animation variants for the drawer content
  const drawerAnimationVariants = {
    hidden: { 
      opacity: 0,
      x: 20,
      scale: 0.98
    },
    visible: { 
      opacity: 1,
      x: 0,
      scale: 1,
      transition: { 
        type: "spring", 
        bounce: 0.4,
        duration: 0.6 
      }
    },
    exit: {
      opacity: 0,
      x: 10,
      scale: 0.98,
      transition: { 
        duration: 0.2 
      }
    }
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: isDarkMode ? darkAlgorithm : defaultAlgorithm,
      }}
    >
      <Drawer
        title="AI Assistant"
        placement="right"
        size="large"
        onClose={onClose}
        open={open}
        rootClassName="ai-drawer-custom"
        style={{ overflow: 'hidden' }}
        styles={{
          header: { 
            background: isDarkMode ? '#1f2937' : '#ffffff',
            color: isDarkMode ? '#f9fafb' : '#111827'
          },
          body: { 
            padding: 0,
            background: isDarkMode ? '#1f2937' : '#ffffff'
          },
          mask: { backgroundColor: 'rgba(0, 0, 0, 0.65)' },
          content: { 
            boxShadow: isDarkMode 
              ? '-4px 0 12px rgba(0, 0, 0, 0.5)' 
              : '-4px 0 12px rgba(0, 0, 0, 0.15)',
            background: isDarkMode ? '#1f2937' : '#ffffff'
          },
          wrapper: {}
        }}
      >
        <AnimatePresence>
          {open && (
            <>
              {/* Export icon on left margin - repositioned for right drawer */}
              <div className="absolute left-6 top-20 z-10">
                <button 
                  className="p-2 rounded-full bg-white dark:bg-gray-700 shadow-md hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-gray-700 dark:text-gray-200"
                  aria-label="Export"
                >
                  <DownloadOutlined style={{ fontSize: '18px' }} />
                </button>
              </div>
              
              <motion.div
                className="flex flex-col h-full bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                variants={drawerAnimationVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                {/* Main content with specified padding */}
                <div className="flex-1 px-16 py-[64px]">
                  <p>AI assistant content will go here.</p>
                </div>
                
                {/* Footer with navigation */}
                <div className="border-t border-gray-200 dark:border-gray-700 px-16 py-6 bg-white dark:bg-gray-800">
                  <div className="flex justify-between items-center">
                    <button 
                      className="flex items-center space-x-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
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
    </ConfigProvider>
  );
}; 