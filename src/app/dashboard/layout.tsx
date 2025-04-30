import SideNav from '@/components/navigation/SideNav';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-gray-100">
      <SideNav />
      <main className="flex-1 overflow-auto p-8">
        {children}
      </main>
    </div>
  );
} 