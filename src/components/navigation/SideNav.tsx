'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
}

const SideNav = () => {
  const pathname = usePathname();
  
  const navItems = [
    { path: '/dashboard', name: 'Overview', icon: null },
    { path: '/dashboard/analytics', name: 'Analytics', icon: null },
    { path: '/dashboard/reports', name: 'Reports', icon: null },
    { path: '/dashboard/settings', name: 'Settings', icon: null },
  ];

  return (
    <nav className="w-64 bg-white text-gray-800 border-r border-gray-200 h-full">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-bold">DalaPhone Data</h2>
      </div>
      <div className="p-2">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <li key={item.path}>
                <Link
                  href={item.path}
                  className={`flex items-center p-3 rounded-md hover:bg-gray-100 transition-colors ${
                    isActive
                      ? 'bg-gray-100 font-medium'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
};

export default SideNav; 