'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import authService from '@/services/auth';
import { ROUTES } from '@/config/constants';

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
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [rateLimit, setRateLimit] = useState<RateLimitState>({
    type: 'none',
    message: '',
    remainingTime: 0,
  });
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || ROUTES.APP.DASHBOARD;
  const { login, isAuthenticated } = useAuth();
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [error, setError] = useState('');

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      router.push(ROUTES.APP.DASHBOARD);
    }
  }, [isAuthenticated, router]);

  // Handle rate limit timer
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

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }

    setError(Object.values(newErrors)[0] || '');
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRateLimited) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await login({
        email: formData.email,
        password: formData.password
      }, rememberMe);

      toast.success('Login successful!', {
        description: 'Welcome back!',
        duration: 3000,
      });

      router.push('/dashboard');
    
    try {
      const response = await login(formData.email, formData.password, rememberMe);
      
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
      router.push(redirectPath);
    } catch (error: any) {
      console.error('Login error:', error);
      
      if (error.type === 'verification_required') {
        toast.error('Account Not Verified', {
          description: 'Your account is pending verification. Please check your email for verification instructions. This process may take 24-48 hours.',
          duration: 8000,
        });
      } else if (error.type === 'validation') {
        // Handle validation errors
        if (error.errors && Array.isArray(error.errors)) {
          error.errors.forEach((err: string) => {
            toast.error('Invalid Login', {
              description: err,
              duration: 5000,
            });
          });
        } else {
          toast.error('Invalid Login', {
            description: error.message || 'Please check your credentials and try again.',
            duration: 5000,
          });
        }
      } else if (error.type === 'delay') {
        const remainingTime = parseInt(error.delay);
        setRateLimit({
          type: 'delay',
          message: error.message,
          remainingTime
        });
        setIsRateLimited(true);
        toast.error('Too Many Attempts', {
          description: `Please wait ${formatRemainingTime(remainingTime)} before trying again.`,
          duration: 5000,
        });
      } else if (error.type === 'lockout') {
        const lockoutTime = parseInt(error.lockoutTime);
        setRateLimit({
          type: 'lockout',
          message: error.message,
          remainingTime: lockoutTime
        });
        setIsRateLimited(true);
        toast.error('Account Locked', {
          description: `Too many failed attempts. Please try again in ${formatRemainingTime(lockoutTime)}.`,
          duration: 5000,
        });
      } else if (error.message) {
        setError(error.message);
        toast.error('Login failed', {
          description: error.message,
          duration: 5000,
        });
      } else {
        setError('An unexpected error occurred. Please try again.');
        toast.error('Login failed', {
          description: 'An unexpected error occurred. Please try again.',
          duration: 5000,
        });
      // Handle different error types
      switch (error.type) {
        case 'error':
          // Handle simple error (like incorrect password)
          toast.error('Login failed', {
            description: error.message,
          });
          break;
          
        case 'delay':
          // Handle rate limit delay
          setRateLimit({
            type: 'delay',
            message: error.message,
            remainingTime: error.delay,
            attemptsRemaining: error.attemptsRemaining
          });
          
          toast.error('Login attempt delayed', {
            description: error.message,
          });
          break;
          
        case 'lockout':
          // Handle account lockout
          setRateLimit({
            type: 'lockout',
            message: error.message,
            remainingTime: error.lockoutTime,
          });
          
          toast.error('Account locked', {
            description: error.message,
            duration: 6000,
          });
          break;
          
        case 'verification':
          // Handle verification required
          toast.error('Account not verified', {
            description: error.message || 'Your account needs to be verified. Please check your email for verification instructions.',
            duration: 6000,
          });
          break;
          
        default:
          // Handle unknown errors
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

  // Show a special message if the user was redirected from a protected route
  const showRedirectMessage = searchParams.has('redirect');

  return (
    <div className="space-y-2">
      {showRedirectMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full p-4 bg-blue-900/40 backdrop-blur-xl rounded-xl border border-blue-500/30 text-blue-100"
        >
          <div className="flex items-start">
            <div className="mr-2 mt-0.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="font-medium">Please log in to continue</p>
              <p className="text-sm">You need to be logged in to access this page.</p>
            </div>
          </div>
        </motion.div>
      )}
      
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
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
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
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white focus:outline-none"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                disabled={isLoading || (rateLimit.type !== 'none' && rateLimit.remainingTime > 0)}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center">
              <input 
                type="checkbox" 
                className="w-4 h-4 border-white/15 rounded bg-gray-800/50 text-purple-500 focus:ring-purple-500/50" 
                disabled={isLoading || (rateLimit.type !== 'none' && rateLimit.remainingTime > 0)}
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
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