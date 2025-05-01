import type { Metadata } from "next";
import { Inter, Press_Start_2P } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });
const pressStart2P = Press_Start_2P({ 
  weight: "400",
  subsets: ["latin"],
  variable: "--font-press-start-2p",
});

export const metadata: Metadata = {
  title: "Delaphone.AI | Call Intelligence Platform",
  description: "Transform your customer conversations into actionable insights. Boost revenue and reduce costs with AI-powered call analytics.",
  icons: {
    icon: '/assets/logo-dela.png',
    apple: '/assets/logo-dela.png',
    shortcut: '/assets/logo-dela.png',
  },
  openGraph: {
    images: '/assets/logo-dela.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${pressStart2P.variable}`}>
        {children}
        <Toaster 
          toastOptions={{
            error: {
              style: { 
                background: '#7f1d1d', // dark red background
                color: 'white',        // white text
                fontWeight: '500',     // medium font weight
                border: '1px solid #ef4444' // red border
              },
            },
            className: 'font-medium text-sm',
          }}
        />
      </body>
    </html>
  );
}
