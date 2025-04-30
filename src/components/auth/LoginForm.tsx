'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement login logic here
    console.log('Login attempt with:', { email, password });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="w-full p-8 space-y-6 bg-gray-900/40 backdrop-blur-xl rounded-xl border border-white/15"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
            Email
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-gray-800/50 border border-white/15 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
            placeholder="Enter your email"
            required
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
            Password
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-gray-800/50 border border-white/15 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
            placeholder="Enter your password"
            required
          />
        </div>
        <div className="flex items-center justify-between">
          <label className="flex items-center">
            <input type="checkbox" className="w-4 h-4 border-white/15 rounded bg-gray-800/50 text-purple-500 focus:ring-purple-500/50" />
            <span className="ml-2 text-sm text-gray-400">Remember me</span>
          </label>
          <button type="button" className="text-sm text-purple-500 hover:text-purple-400 transition-colors">
            Forgot password?
          </button>
        </div>
        <button
          type="submit"
          className="relative w-full px-6 py-3 text-white font-medium text-sm rounded-lg overflow-hidden bg-purple-500 hover:bg-purple-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-2 focus:ring-offset-gray-900"
        >
          <span className="relative">Sign in</span>
        </button>
      </form>
      <p className="text-center text-sm text-gray-400">
        Don't have an account?{' '}
        <button
          onClick={() => router.push('/signup')}
          className="text-purple-500 hover:text-purple-400 font-medium transition-colors"
        >
          Sign up
        </button>
      </p>
    </motion.div>
  );
} 