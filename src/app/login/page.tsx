'use client';

import LoginForm from '@/components/auth/LoginForm';
import { motion } from 'framer-motion';
import Image from "next/image";
import LogoIcon from "@/assets/logo-dela.png";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-[radial-gradient(75%_75%_at_center_center,rgb(140,69,255,0.15)_15%,rgb(14,0,36,0.5)_78%,transparent)]"></div>
      
      {/* Animated Rings */}
      <motion.div 
        animate={{ rotate: '360deg' }}
        transition={{
          duration: 60,
          repeat: Infinity,
          ease: 'linear'
        }}
        className="absolute h-[800px] w-[800px] border border-white/10 rounded-full left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      />
      <motion.div 
        animate={{ rotate: '-360deg' }}
        transition={{
          duration: 45,
          repeat: Infinity,
          ease: 'linear'
        }}
        className="absolute h-[600px] w-[600px] border border-white/10 rounded-full left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      />

      {/* Logo and Form Container */}
      <div className="relative z-10 w-full max-w-md px-8">
        <div className="flex flex-col items-center mb-8">
          <div className="border h-16 w-16 rounded-lg inline-flex items-center justify-center bg-gray-900/70 backdrop-blur-md mb-4">
            <Image src={LogoIcon} alt="Dela Logo" width={48} height={48} />
          </div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-2xl font-bold text-white mb-2"
          >
            <span className="text-white font-medium">Welcome to </span>
            <span className="relative inline-flex items-center">
              <span className="bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 text-transparent bg-clip-text font-extrabold tracking-tight">DLP</span>
              <span className="mx-1 text-white/50">.</span>
              <span className="relative">
                <span className="relative z-10 bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 text-transparent bg-clip-text font-extrabold tracking-tight inline-block [transform-style:preserve-3d] [transform:rotateX(10deg)_rotateY(-10deg)] hover:[transform:rotateX(15deg)_rotateY(-15deg)] transition-transform duration-300">AI</span>
                <span className="absolute inset-0 bg-gradient-to-r from-purple-400/20 via-pink-500/20 to-red-500/20 blur-xl [transform:translateZ(-20px)]"></span>
                <span className="absolute inset-0 bg-gradient-to-r from-purple-400/10 via-pink-500/10 to-red-500/10 [transform:translateZ(-10px)]"></span>
              </span>
            </span>
          </motion.h1>
        </div>
        <LoginForm />
      </div>

      {/* Floating Particles */}
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          animate={{
            y: [-20, 20],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            repeatType: 'reverse',
            delay: i * 0.8,
          }}
          className="absolute w-2 h-2 bg-white/20 rounded-full"
          style={{
            left: `${20 + i * 30}%`,
            top: `${30 + i * 20}%`,
          }}
        />
      ))}
    </div>
  );
} 