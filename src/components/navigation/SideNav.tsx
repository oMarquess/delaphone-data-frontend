'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useSidebar } from './SidebarContext';
import { useEffect } from 'react';
import { 
  DashboardOutlined, 
  BarChartOutlined, 
  FileTextOutlined, 
  SettingOutlined,
  UserOutlined,
  LogoutOutlined
} from '@ant-design/icons';

interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
}

const SideNav = () => {
  const pathname = usePathname();
  const { collapsed, mobileNavOpen, setActiveTab, toggleMobileNav } = useSidebar();
  
  // Close mobile nav when route changes
  useEffect(() => {
    if (mobileNavOpen) {
      toggleMobileNav();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const navItems = [
    { 
      path: '/dashboard', 
      name: 'Overview', 
      icon: <DashboardOutlined className="text-gray-700 dark:text-gray-300" style={{ fontSize: '18px' }} />
    },
    { 
      path: '/dashboard/analytics', 
      name: 'Analytics', 
      icon: <BarChartOutlined className="text-gray-700 dark:text-gray-300" style={{ fontSize: '18px' }} />
    },
    { 
      path: '/dashboard/reports', 
      name: 'Reports', 
      icon: <FileTextOutlined className="text-gray-700 dark:text-gray-300" style={{ fontSize: '18px' }} />
    },
    { 
      path: '/dashboard/settings', 
      name: 'Settings', 
      icon: <SettingOutlined className="text-gray-700 dark:text-gray-300" style={{ fontSize: '18px' }} />
    },
  ];

  // Set active tab based on pathname
  useEffect(() => {
    const currentNav = navItems.find(item => item.path === pathname);
    if (currentNav) {
      setActiveTab(currentNav.name);
    }
  }, [pathname, setActiveTab]);

  return (
    <>
      {/* Sidebar */}
      <div 
        className={`fixed inset-y-0 left-0 z-40 lg:z-10 transition-transform duration-300 transform ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <nav className={`flex flex-col h-full bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'}`}>
          <div className="flex-1 p-4 overflow-y-auto">
            <ul className="space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.path;
                return (
                  <li key={item.path}>
                    <Link
                      href={item.path}
                      className={`flex items-center p-3 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                        isActive
                          ? 'bg-gray-100 dark:bg-gray-700 font-medium text-gray-900 dark:text-gray-100'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                      }`}
                    >
                      <div className="flex items-center">
                        <div className="mr-3">{item.icon}</div>
                        {!collapsed && <span>{item.name}</span>}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
          
          {/* User profile section */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 relative w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                <UserOutlined className="text-gray-700 dark:text-gray-300" style={{ fontSize: '20px' }} />
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">John Smith</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">DalaPhone Inc.</p>
                </div>
              )}
              {!collapsed && (
                <button className="p-1 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
                  <LogoutOutlined style={{ fontSize: '18px' }} />
                </button>
              )}
            </div>
          </div>
        </nav>
      </div>
      
      {/* Mobile overlay - only render when needed */}
      {mobileNavOpen && (
        <div 
          onClick={toggleMobileNav}
          aria-hidden="true"
          className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm"
        />
      )}
    </>
  );
};

export default SideNav; 