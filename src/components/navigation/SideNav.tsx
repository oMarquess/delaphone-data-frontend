'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useSidebar } from './SidebarContext';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext'; 
import { 
  DashboardOutlined, 
  BarChartOutlined, 
  FileTextOutlined, 
  SettingOutlined,
  UserOutlined,
  LogoutOutlined,
  PhoneOutlined,
  BulbOutlined,
  DownOutlined
} from '@ant-design/icons';

interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  themeColor?: string; // Add theme color for each nav item
}

const SideNav = () => {
  const pathname = usePathname();
  const { collapsed, mobileNavOpen, setActiveTab, toggleMobileNav } = useSidebar();
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  // Close mobile nav when route changes
  useEffect(() => {
    if (mobileNavOpen) {
      toggleMobileNav();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (dropdownOpen && !target.closest('.user-profile-dropdown')) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  const navItems: NavItem[] = [
    {
      path: '/dashboard',
      name: 'Analytics Dashboard', 
      icon: <DashboardOutlined className="text-gray-700 dark:text-gray-300" style={{ fontSize: '18px' }} />,
      themeColor: 'border-blue-400'
    },
    {
      path: '/dashboard/call-logs',
      name: 'Call Logs', 
      icon: <PhoneOutlined className="text-gray-700 dark:text-gray-300" style={{ fontSize: '18px' }} />,
      themeColor: 'border-blue-400'
    },
    {
      path: '/dashboard/reports', 
      name: 'Reports',
      icon: <FileTextOutlined className="text-gray-700 dark:text-gray-300" style={{ fontSize: '18px' }} />,
      themeColor: 'border-purple-400'
    },
    {
      path: '/dashboard/ai-insights', 
      name: 'AI Insights',
      icon: <BulbOutlined className="text-gray-700 dark:text-gray-300" style={{ fontSize: '18px' }} />,
      themeColor: 'border-amber-500'
    },
    {
      path: '/dashboard/settings', 
      name: 'Settings',
      icon: <SettingOutlined className="text-gray-700 dark:text-gray-300" style={{ fontSize: '18px' }} />,
      themeColor: 'border-gray-500'
    },
  ];

  // Set active tab based on pathname
  useEffect(() => {
    const currentNav = navItems.find(item => item.path === pathname);
    if (currentNav) {
      setActiveTab(currentNav.name);
    }
  }, [pathname, setActiveTab]);

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
  };

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

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
                          ? `bg-gray-100 dark:bg-gray-700 font-medium text-gray-900 dark:text-gray-100 border-l-[3px] ${item.themeColor}`
                          : `text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 ${isActive ? '' : 'border-l-[3px] border-transparent hover:border-l-[3px] hover:' + item.themeColor}`
                }`}
              >
                      <div className="flex items-center w-full">
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
            {collapsed ? (
              <div className="relative user-profile-dropdown">
                <button 
                  onClick={toggleDropdown}
                  className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  aria-label="User profile menu"
                >
                  <UserOutlined className="text-gray-700 dark:text-gray-300" style={{ fontSize: '20px' }} />
                </button>
                
                {dropdownOpen && (
                  <div className="absolute bottom-full left-0 mb-2 w-40 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                    <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {user?.username || 'User'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {user?.email || 'user@example.com'}
                      </p>
                    </div>
                    <button 
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                      onClick={handleLogout}
                    >
                      <LogoutOutlined className="mr-2" style={{ fontSize: '16px' }} />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                    <UserOutlined className="text-gray-700 dark:text-gray-300" style={{ fontSize: '20px' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {user?.username || 'User'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {user?.email || 'user@example.com'}
                    </p>
                  </div>
                </div>
                <button 
                  className="p-1 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  onClick={handleLogout}
                  aria-label="Logout"
                >
                  <LogoutOutlined style={{ fontSize: '18px' }} />
                </button>
              </div>
            )}
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