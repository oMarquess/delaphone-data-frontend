import { SidebarProvider } from '@/components/navigation/SidebarContext';
import DashboardContent from '@/components/dashboard/DashboardContent';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <DashboardContent>{children}</DashboardContent>
    </SidebarProvider>
  );
} 