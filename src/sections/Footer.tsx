'use client';
import Logo from "@/assets/logo.svg";
import LogoIcon from "@/assets/logo-dela.png";
import Image from "next/image";
import InstagramIcon from "@/assets/social-instagram.svg";
import YoutubeIcon from "@/assets/social-youtube.svg";
import { Press_Start_2P } from "next/font/google";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

// Load font directly in this component
const pressStart2P = Press_Start_2P({ 
  weight: "400",
  subsets: ["latin"],
});

export const Footer = () => {
  // Simulated status - in a real app, this would come from a status API
  const [systemStatus, setSystemStatus] = useState({
    isActive: true,
    lastChecked: new Date()
  });

  return <footer className="py-5 border-t border-white/15 relative">
    {/* Creative status indicator - positioned at the bottom right corner */}
    <motion.div 
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className="absolute right-4 -top-5 shadow-lg"
    >
      <div className="relative">
        {/* Outer glow effect */}
        <div className={`absolute inset-0 rounded-full blur-md ${systemStatus.isActive ? 'bg-green-500/30' : 'bg-red-500/30'}`}></div>
        
        {/* Status pill */}
        <div className="flex items-center gap-2 bg-gray-900/90 border border-white/10 backdrop-blur-sm px-3.5 py-1.5 rounded-full">
          {/* Pulse dot */}
          <div className="relative">
            <div className={`absolute inset-0 ${systemStatus.isActive ? 'bg-green-500' : 'bg-red-500'} rounded-full blur animate-ping opacity-75`}></div>
            <div className={`relative h-2.5 w-2.5 rounded-full ${systemStatus.isActive ? 'bg-green-400' : 'bg-red-400'}`}></div>
          </div>
          
          {/* Status text with cyberpunk-style font for "System" */}
          <div className="flex items-center">
            <span className={`${pressStart2P.className} text-[8px] mr-1 text-white/70`}>System</span>
            <span className="text-xs font-medium text-white">{systemStatus.isActive ? 'Active' : 'Down'}</span>
          </div>
        </div>
      </div>
    </motion.div>

    <div className="container">
      <div className="flex flex-col md:flex-row items-center md:justify-between gap-5">
        <div className="flex items-center gap-2">
          <div className="border h-10 w-10 rounded-lg inline-flex items-center justify-center">
            <Image src={LogoIcon} alt="Dela Logo" className="w-6 h-6" />
          </div>
          <div className={`${pressStart2P.className} text-xs leading-relaxed`}>Delaphone AI</div>
        </div>
        
        <nav className="flex items-center gap-5 md:gap-8 text-gray-400">
          <a href="/" className="hover:text-white transition-colors text-xs md:text-sm">Features</a>
          <a href="/" className="hover:text-white transition-colors text-xs md:text-sm">How It Works</a>
          <a href="/" className="hover:text-white transition-colors text-xs md:text-sm">Use Cases</a>
          <a href="/" className="hover:text-white transition-colors text-xs md:text-sm">Pricing</a>
        </nav>
        
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-5">
            <InstagramIcon className="text-white/50 hover:text-white transition-colors"/>
            <YoutubeIcon className="text-white/50 hover:text-white transition-colors"/>
          </div>
          
          <div className="text-xs text-gray-500 whitespace-nowrap">
            © {new Date().getFullYear()} Delaphone.AI
          </div>
        </div>
      </div>
    </div>
  </footer>;
};
