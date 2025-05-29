import type { Metadata } from "next";
import { Inter, Press_Start_2P } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { AuthProvider } from "@/context/AuthContext";
import { SettingsProvider } from "@/context/SettingsContext";
import RouteGuard from "@/components/auth/RouteGuard";
import CacheProvider from "@/context/CacheProvider";

const inter = Inter({ subsets: ["latin"] });
const pressStart2P = Press_Start_2P({ 
  weight: "400",
  subsets: ["latin"],
  variable: "--font-press-start-2p",
});

export const metadata: Metadata = {
  title: "DLP.AI | Call Intelligence Platform",
  description: "Transform your customer conversations into actionable insights. Boost revenue and reduce costs with AI-powered call analytics.",
  icons: {
    icon: '/assets/dlp-logo.png',
    apple: '/assets/dlp-logo.png',
    shortcut: '/assets/dlp-logo.png',
  },
  openGraph: {
    images: '/assets/dlp-logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} ${pressStart2P.variable}`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider>
            <SettingsProvider>
              <CacheProvider>
                <RouteGuard>
                  {children}
                </RouteGuard>
              </CacheProvider>
            </SettingsProvider>
          </AuthProvider>
        <Toaster 
          duration={10000} // 10 seconds default duration for all toasts
          toastOptions={{
            className: 'font-medium text-sm',
            classNames: {
              error: 'bg-red-900/90 border-red-500 text-white font-medium',
            },
          }}
        />
        </ThemeProvider>
      </body>
    </html>
  );
}
