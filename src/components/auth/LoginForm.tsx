'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { authService } from '@/services/auth';
import { toast } from 'sonner';

interface RateLimitState {
  type: 'none' | 'delay' | 'lockout';
  message: string;
  remainingTime: number;
  attemptsRemaining?: number;
}

export default function LoginForm() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [rateLimit, setRateLimit] = useState<RateLimitState>({
    type: 'none',
    message: '',
    remainingTime: 0,
  });
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Clean up timer on unmount
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Start countdown timer if rate limited
    if (rateLimit.type !== 'none' && rateLimit.remainingTime > 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      timerRef.current = setInterval(() => {
        setRateLimit(prev => {
          const newTime = prev.remainingTime - 1;
          if (newTime <= 0) {
            // Clear timer and reset rate limit state
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            return { type: 'none', message: '', remainingTime: 0 };
          }
          return { ...prev, remainingTime: newTime };
        });
      }, 1000);
    }
  }, [rateLimit.type, rateLimit.remainingTime]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent submission if rate limited
    if (rateLimit.type !== 'none' && rateLimit.remainingTime > 0) {
      toast.error('Please wait before trying again', {
        description: rateLimit.message,
      });
      return;
    }
    
    setIsLoading(true);

    try {
      const response = await authService.login(formData);
      
      // Check if user is verified
      if (response.is_verified === false) {
        toast.error('Account not verified', {
          description: 'Your account needs to be verified. Please check your email for verification instructions.',
          duration: 6000,
        });
        setIsLoading(false);
        return;
      }
      
      toast.success('Login successful!');
      router.push('/dashboard');
    } catch (error: any) {
      // Handle verification error from API
      if (error.response?.data?.detail?.verification_required) {
        toast.error('Account not verified', {
          description: error.response.data.detail.message || 'Your account needs to be verified before you can log in.',
          duration: 6000,
        });
      }
      // Handle rate limiting errors
      else if (error.type === 'delay') {
        setRateLimit({
          type: 'delay',
          message: error.message,
          remainingTime: error.delay,
          attemptsRemaining: error.attemptsRemaining
        });
        
        toast.error('Login attempt delayed', {
          description: error.message,
        });
      } else if (error.type === 'lockout') {
        setRateLimit({
          type: 'lockout',
          message: error.message,
          remainingTime: error.lockoutTime,
        });
        
        toast.error('ACCOUNT LOCKED', {
          description: error.message,
          duration: 6000,
        });
      } else if (error.type === 'verification') {
        toast.error('Account not verified', {
          description: error.message || 'Your account needs to be verified. Please check your email for verification instructions.',
          duration: 6000,
        });
      } else {
        // Regular error
        toast.error('Login failed', {
          description: error.message || 'Please check your credentials and try again.',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatRemainingTime = (seconds: number): string => {
    return authService.formatRemainingTime(seconds);
  };

  return (
    <div className="space-y-2">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="w-full p-6 space-y-4 bg-gray-900/40 backdrop-blur-xl rounded-xl border border-white/15"
      >
        {rateLimit.type !== 'none' && (
          <div className={`p-3 rounded-lg text-sm ${
            rateLimit.type === 'delay' ? 'bg-yellow-900/40 border border-yellow-600/40 text-yellow-200' : 
            'bg-red-900/40 border border-red-600/40 text-red-200'
          }`}>
            <div className="flex items-start">
              <div className="mr-2 mt-0.5">
                {rateLimit.type === 'delay' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                )}
              </div>
              <div>
                <p className="font-medium mb-1">
                  {rateLimit.type === 'delay' ? 'Please wait before trying again' : 'Account temporarily locked'}
                </p>
                <p>{rateLimit.message}</p>
                {rateLimit.remainingTime > 0 && (
                  <p className="mt-1 font-medium">
                    Time remaining: {formatRemainingTime(rateLimit.remainingTime)}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-gray-800/50 border border-white/15 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
              placeholder="Enter your email"
              required
              disabled={isLoading || (rateLimit.type !== 'none' && rateLimit.remainingTime > 0)}
              autoComplete="email"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-gray-800/50 border border-white/15 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
              placeholder="Enter your password"
              required
              disabled={isLoading || (rateLimit.type !== 'none' && rateLimit.remainingTime > 0)}
              autoComplete="current-password"
              minLength={8}
            />
          </div>
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center">
              <input 
                type="checkbox" 
                className="w-4 h-4 border-white/15 rounded bg-gray-800/50 text-purple-500 focus:ring-purple-500/50" 
                disabled={isLoading || (rateLimit.type !== 'none' && rateLimit.remainingTime > 0)}
              />
              <span className="ml-2 text-gray-400">Remember me</span>
            </label>
            <button 
              type="button" 
              className="text-purple-500 hover:text-purple-400 transition-colors disabled:text-purple-700 disabled:cursor-not-allowed"
              onClick={() => router.push('/forgot-password')}
              disabled={isLoading || (rateLimit.type !== 'none' && rateLimit.remainingTime > 0)}
            >
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading || (rateLimit.type !== 'none' && rateLimit.remainingTime > 0)}
            className="w-full px-4 py-2 text-white font-medium text-sm rounded-lg bg-purple-500 hover:bg-purple-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
              </span>
            ) : rateLimit.type !== 'none' && rateLimit.remainingTime > 0 ? (
              `Wait ${formatRemainingTime(rateLimit.remainingTime)}`
            ) : (
              'Sign in'
            )}
          </button>
        </form>
        <p className="text-center text-sm text-gray-400">
          Don't have an account?{' '}
          <button
            onClick={() => router.push('/signup')}
            className="text-purple-500 hover:text-purple-400 font-medium transition-colors"
            disabled={isLoading || (rateLimit.type !== 'none' && rateLimit.remainingTime > 0)}
          >
            Sign up
          </button>
        </p>
      </motion.div>

      <p className="text-xs text-gray-400 text-center">
        By clicking continue, you agree to our{' '}
        <a href="/terms" className="text-purple-500 hover:text-purple-400 transition-colors">Terms</a>{' '}
        and{' '}
        <a href="/privacy" className="text-purple-500 hover:text-purple-400 transition-colors">Privacy Policy</a>
      </p>
    </div>
  );
} 