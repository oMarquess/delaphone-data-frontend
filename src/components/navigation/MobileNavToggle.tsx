'use client';

import { useSidebar } from './SidebarContext';
import { MenuOutlined, CloseOutlined } from '@ant-design/icons';

export default function MobileNavToggle() {
  const { mobileNavOpen, toggleMobileNav } = useSidebar();
  
  return (
    <button
      className="lg:hidden p-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
      onClick={toggleMobileNav}
      aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"}
    >
      {mobileNavOpen ? (
        <CloseOutlined style={{ fontSize: '20px' }} />
      ) : (
        <MenuOutlined style={{ fontSize: '20px' }} />
      )}
    </button>
  );
} 