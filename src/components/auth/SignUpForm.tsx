'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { authService, RegisterCredentials } from '@/services/auth';
import { VALIDATION } from '@/config/constants';
import { toast } from 'sonner';

interface FormData {
  full_name: string;
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
  company_code: string;
  role: string; // This is just for UI, not sent to API
}

export default function SignUpForm() {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    full_name: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    company_code: '',
    role: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const router = useRouter();

  const updateFormData = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error on field change
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateStep = (currentStep: number): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (currentStep === 1) {
      if (!formData.full_name.trim()) {
        newErrors.full_name = 'Full name is required';
      }
      
      if (!formData.email.trim()) {
        newErrors.email = 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address';
      }

      if (!formData.username.trim()) {
        newErrors.username = 'Username is required';
      } else if (formData.username.length < 3) {
        newErrors.username = 'Username must be at least 3 characters long';
      }
    }
    
    if (currentStep === 2) {
      if (!formData.password) {
        newErrors.password = 'Password is required';
      } else if (!VALIDATION.PASSWORD.PATTERN.test(formData.password)) {
        newErrors.password = VALIDATION.PASSWORD.MESSAGE;
      }
      
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }
    
    if (currentStep === 3) {
      if (!formData.company_code.trim()) {
        newErrors.company_code = 'Company code is required';
      } else if (!/^[A-Z0-9]{8}$/.test(formData.company_code)) {
        newErrors.company_code = VALIDATION.COMPANY_CODE.MESSAGE;
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateStep(step)) {
      return;
    }
    
    if (step < 3) {
      setStep(step + 1);
    } else {
      setIsLoading(true);
      
      try {
        const registerData: RegisterCredentials = {
          email: formData.email,
          username: formData.username,
          password: formData.password,
          full_name: formData.full_name,
          company_code: formData.company_code
        };
        
        await authService.register(registerData);
        toast.success('Registration successful!');
        router.push('/dashboard');
      } catch (error) {
        toast.error('Registration failed', {
          description: error instanceof Error ? error.message : 'Please try again later',
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const goBack = () => {
    setStep(step - 1);
  };

  const renderError = (field: keyof FormData) => {
    return errors[field] ? (
      <p className="mt-1 text-sm text-red-400">{errors[field]}</p>
    ) : null;
  };

  const steps = {
    1: (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="space-y-5"
      >
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-2">Personal Information</h2>
          <p className="text-gray-400 text-sm">Let's start with your basic details</p>
        </div>
        <div>
          <label htmlFor="full_name" className="block text-sm font-medium text-gray-300 mb-2">
            Full Name
          </label>
          <input
            type="text"
            id="full_name"
            value={formData.full_name}
            onChange={(e) => updateFormData('full_name', e.target.value)}
            className={`w-full px-3 py-2 bg-gray-800/50 border ${errors.full_name ? 'border-red-500' : 'border-white/15'} rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all`}
            placeholder="Enter your full name"
            required
            disabled={isLoading}
          />
          {renderError('full_name')}
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
            Email
          </label>
          <input
            type="email"
            id="email"
            value={formData.email}
            onChange={(e) => updateFormData('email', e.target.value)}
            className={`w-full px-3 py-2 bg-gray-800/50 border ${errors.email ? 'border-red-500' : 'border-white/15'} rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all`}
            placeholder="Enter your email"
            required
            disabled={isLoading}
          />
          {renderError('email')}
        </div>
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
            Username
          </label>
          <input
            type="text"
            id="username"
            value={formData.username}
            onChange={(e) => updateFormData('username', e.target.value)}
            className={`w-full px-3 py-2 bg-gray-800/50 border ${errors.username ? 'border-red-500' : 'border-white/15'} rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all`}
            placeholder="Choose a username"
            required
            disabled={isLoading}
          />
          {renderError('username')}
        </div>
      </motion.div>
    ),
    2: (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="space-y-5"
      >
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-2">Security</h2>
          <p className="text-gray-400 text-sm">Create a secure password for your account</p>
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
            Password
          </label>
          <input
            type="password"
            id="password"
            value={formData.password}
            onChange={(e) => updateFormData('password', e.target.value)}
            className={`w-full px-3 py-2 bg-gray-800/50 border ${errors.password ? 'border-red-500' : 'border-white/15'} rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all`}
            placeholder="Create a password"
            required
            disabled={isLoading}
            minLength={8}
          />
          {renderError('password')}
        </div>
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
            Confirm Password
          </label>
          <input
            type="password"
            id="confirmPassword"
            value={formData.confirmPassword}
            onChange={(e) => updateFormData('confirmPassword', e.target.value)}
            className={`w-full px-3 py-2 bg-gray-800/50 border ${errors.confirmPassword ? 'border-red-500' : 'border-white/15'} rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all`}
            placeholder="Confirm your password"
            required
            disabled={isLoading}
          />
          {renderError('confirmPassword')}
        </div>
      </motion.div>
    ),
    3: (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="space-y-5"
      >
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-2">Work Details</h2>
          <p className="text-gray-400 text-sm">Tell us about your organization</p>
        </div>
        <div>
          <label htmlFor="company_code" className="block text-sm font-medium text-gray-300 mb-2">
            Company Code
          </label>
          <input
            type="text"
            id="company_code"
            value={formData.company_code}
            onChange={(e) => updateFormData('company_code', e.target.value.toUpperCase())}
            className={`w-full px-3 py-2 bg-gray-800/50 border ${errors.company_code ? 'border-red-500' : 'border-white/15'} rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all`}
            placeholder="Enter your company code"
            required
            disabled={isLoading}
            maxLength={8}
            pattern="[A-Z0-9]{8}"
          />
          {renderError('company_code')}
        </div>
        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-300 mb-2">
            Your Role (optional)
          </label>
          <input
            type="text"
            id="role"
            value={formData.role}
            onChange={(e) => updateFormData('role', e.target.value)}
            className="w-full px-3 py-2 bg-gray-800/50 border border-white/15 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
            placeholder="Enter your role"
            disabled={isLoading}
          />
        </div>
      </motion.div>
    )
  };

  return (
    <div className="space-y-2">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="w-full p-6 space-y-4 bg-gray-900/40 backdrop-blur-xl rounded-xl border border-white/15"
      >
        {/* Progress Bar */}
        <div className="relative mb-6">
          <div className="h-1 bg-gray-800 rounded-full">
            <motion.div
              className="h-1 bg-purple-500 rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: `${(step / 3) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <div className="flex justify-between mt-2">
            <div className="flex items-center">
              <motion.div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                  step >= 1 ? 'bg-purple-500 text-white' : 'bg-gray-800 text-gray-400'
                }`}
                animate={{
                  scale: step === 1 ? 1.1 : 1,
                  backgroundColor: step >= 1 ? '#8B5CF6' : '#1F2937'
                }}
              >
                1
              </motion.div>
            </div>
            <div className="flex items-center">
              <motion.div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                  step >= 2 ? 'bg-purple-500 text-white' : 'bg-gray-800 text-gray-400'
                }`}
                animate={{
                  scale: step === 2 ? 1.1 : 1,
                  backgroundColor: step >= 2 ? '#8B5CF6' : '#1F2937'
                }}
              >
                2
              </motion.div>
            </div>
            <div className="flex items-center">
              <motion.div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                  step >= 3 ? 'bg-purple-500 text-white' : 'bg-gray-800 text-gray-400'
                }`}
                animate={{
                  scale: step === 3 ? 1.1 : 1,
                  backgroundColor: step >= 3 ? '#8B5CF6' : '#1F2937'
                }}
              >
                3
              </motion.div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <AnimatePresence mode="wait">
            {steps[step as keyof typeof steps]}
          </AnimatePresence>

          <div className="flex justify-between mt-6">
            {step > 1 && (
              <button
                type="button"
                onClick={goBack}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                disabled={isLoading}
              >
                Back
              </button>
            )}
            <button
              type="submit"
              disabled={isLoading}
              className="relative ml-auto px-4 py-2 text-white font-medium text-sm rounded-lg bg-purple-500 hover:bg-purple-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {step === 3 ? 'Creating Account...' : 'Processing...'}
                </span>
              ) : (
                <span>{step === 3 ? 'Complete Setup' : 'Continue'}</span>
              )}
            </button>
          </div>
        </form>

        <p className="text-center text-sm text-gray-400">
          Already have an account?{' '}
          <button
            onClick={() => router.push('/login')}
            className="text-purple-500 hover:text-purple-400 font-medium transition-colors"
            disabled={isLoading}
          >
            Sign in
          </button>
        </p>
      </motion.div>

      <p className="text-xs text-gray-400 text-center">
        By clicking {step === 3 ? 'complete setup' : 'continue'}, you agree to our{' '}
        <a href="/terms" className="text-purple-500 hover:text-purple-400 transition-colors">
          Terms of Service
        </a>{' '}
        and{' '}
        <a href="/privacy" className="text-purple-500 hover:text-purple-400 transition-colors">
          Privacy Policy
        </a>
      </p>
    </div>
  );
} 