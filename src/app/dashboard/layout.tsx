import { SidebarProvider } from '@/components/navigation/SidebarContext';
import DashboardContent from '@/components/dashboard/DashboardContent';
import { Fira_Sans } from "next/font/google";
import { Metadata } from 'next';

// Load Fira Sans font with all weights and styles
const firaSans = Fira_Sans({
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-fira-sans",
  display: 'swap',
  preload: true,
});

export const metadata: Metadata = {
  title: "Dashboard | Delaphone.AI",
  description: "Call intelligence dashboard with advanced analytics",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className={`${firaSans.variable} font-fira-sans`}>
        <DashboardContent>{children}</DashboardContent>
      </div>
    </SidebarProvider>
  );
} 