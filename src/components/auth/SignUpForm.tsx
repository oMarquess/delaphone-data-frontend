'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { authService, RegisterCredentials } from '@/services/auth';
import { VALIDATION } from '@/config/constants';
import { toast } from 'sonner';
import debounce from 'lodash/debounce';

interface FormData {
  full_name: string;
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
  company_code: string;
}

export default function SignUpForm() {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    full_name: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    company_code: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [emailStatus, setEmailStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const router = useRouter();

  // Add debounce function for email checking
  const debouncedCheckEmail = useCallback(
    debounce(async (email: string) => {
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setEmailStatus('idle');
        return;
      }
      
      try {
        setEmailStatus('checking');
        setIsCheckingEmail(true);
        const result = await authService.checkEmailAvailability(email);
        
        if (result.isAvailable) {
          setEmailStatus('available');
          setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors.email;
            return newErrors;
          });
        } else {
          setEmailStatus('taken');
          setErrors(prev => ({ 
            ...prev, 
            email: 'Email already registered. Please use a different email.' 
          }));
        }
      } catch (error) {
        console.error('Error checking email:', error);
        setEmailStatus('idle');
      } finally {
        setIsCheckingEmail(false);
      }
    }, 500),
    []
  );

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

    // Check email availability when email field changes
    if (field === 'email' && value && value.includes('@')) {
      debouncedCheckEmail(value);
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
      if (formData.company_code.trim() && !/^[A-Z0-9]{8}$/.test(formData.company_code)) {
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
        
        // Make the API call and explicitly check for success response
        const response = await authService.register(registerData);
        
        // Print the response for debugging
        console.log('Signup API Success Response:', response);
        
        // Only proceed if we get a successful response
        // Clear any auth data that might have been stored during registration
        authService.logout();
        
        toast.success('Registration successful!', {
          description: 'Please log in with your credentials to access your account.',
          duration: 5000
        });
        
        // Redirect to login page instead of dashboard
        router.push('/login');
      } catch (error) {
        // Print detailed error for debugging
        console.error('Registration error details:', error);
        
        // Check for API response with success: false
        if (error && typeof error === 'object' && 'success' in error && error.success === false) {
          if ('errors' in error && Array.isArray(error.errors) && error.errors.length > 0) {
            // Join all error messages
            const errorMessages = error.errors;
            const combinedErrorMessage = errorMessages.join(', ');
            console.log('Error messages from API:', combinedErrorMessage);
            
            // Check if any error is about email already registered
            if (errorMessages.some(msg => 
              msg.includes('Email already registered') || 
              msg.includes('already exists') || 
              msg.toLowerCase().includes('email'))) {
              toast.error('Email already registered', {
                description: 'Please use a different email address to continue with registration.',
                duration: 5000
              });
            } else {
              toast.error('Registration failed', {
                description: combinedErrorMessage,
                duration: 5000
              });
            }
            return;
          }
        }
        
        // Default case - extract error message if possible
        let errorMessage = 'Please try again later';
        if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
          errorMessage = error.message;
        }
        
        toast.error('Registration failed', {
          description: errorMessage,
          duration: 5000
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
          <div className="relative">
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => updateFormData('email', e.target.value)}
              className={`w-full px-3 py-2 bg-gray-800/50 border ${errors.email ? 'border-red-500' : emailStatus === 'available' ? 'border-green-500' : 'border-white/15'} rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 ${emailStatus === 'available' ? 'focus:ring-green-500/50' : errors.email ? 'focus:ring-red-500/50' : 'focus:ring-purple-500/50'} focus:border-transparent transition-all`}
              placeholder="Enter your email"
              required
              disabled={isLoading}
            />
            {emailStatus === 'checking' && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <svg className="animate-spin h-5 w-5 text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            )}
            {emailStatus === 'available' && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
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
          <h2 className="text-xl font-semibold text-white mb-2">Account Details</h2>
          <p className="text-gray-400 text-sm">Complete your account setup</p>
        </div>
        <div>
          <label htmlFor="company_code" className="block text-sm font-medium text-gray-300 mb-2">
            Company Code <span className="text-gray-400 text-xs">(optional)</span>
          </label>
          <input
            type="text"
            id="company_code"
            value={formData.company_code}
            onChange={(e) => updateFormData('company_code', e.target.value.toUpperCase())}
            className={`w-full px-3 py-2 bg-gray-800/50 border ${errors.company_code ? 'border-red-500' : 'border-white/15'} rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all`}
            placeholder="Enter your company code (if you have one)"
            disabled={isLoading}
            maxLength={8}
          />
          {renderError('company_code')}
          <div className="mt-2 p-3 bg-gray-800/50 rounded border border-white/10 text-xs text-gray-300">
            <p className="font-medium mb-1 text-purple-400">About Company Codes:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>If you have a company code, enter it to gain immediate access</li>
              <li>Without a code, your account will require admin verification</li>
              <li>Verification typically takes 24 hours</li>
              <li>You'll receive an email when your account is verified</li>
            </ul>
          </div>
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