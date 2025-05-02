'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { authService, RegisterCredentials } from '@/services/auth';
import { VALIDATION } from '@/config/constants';
import { toast } from 'sonner';
import debounce from 'lodash/debounce';
import { Steps, ConfigProvider, theme } from 'antd';

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Items for Ant Design Steps
  const stepItems = [
    { title: '' },
    { title: '' },
    { title: '' }
  ];

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
      } else if (emailStatus === 'taken') {
        // Prevent continuing if email is already taken
        newErrors.email = 'Email already registered. Please use a different email.';
      } else if (emailStatus === 'checking') {
        // Prevent continuing if still checking email availability
        newErrors.email = 'Please wait while we verify email availability';
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
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              value={formData.password}
              onChange={(e) => updateFormData('password', e.target.value)}
              className={`w-full px-3 py-2 bg-gray-800/50 border ${errors.password ? 'border-red-500' : 'border-white/15'} rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all`}
              placeholder="Create a password"
              required
              disabled={isLoading}
              minLength={8}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white focus:outline-none"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
              disabled={isLoading}
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
          {renderError('password')}
        </div>
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
            Confirm Password
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              id="confirmPassword"
              value={formData.confirmPassword}
              onChange={(e) => updateFormData('confirmPassword', e.target.value)}
              className={`w-full px-3 py-2 bg-gray-800/50 border ${errors.confirmPassword ? 'border-red-500' : 'border-white/15'} rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all`}
              placeholder="Confirm your password"
              required
              disabled={isLoading}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white focus:outline-none"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              tabIndex={-1}
              disabled={isLoading}
            >
              {showConfirmPassword ? (
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
            className={`w-full px-3 py-2 bg-gray-800/50 border ${errors.company_code ? 'border-red-500' : 'border-white/15'} rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all text-sm`}
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
        {/* Ant Design Steps Component */}
        <motion.div 
          className="mb-8 custom-steps-wrapper"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <ConfigProvider
            theme={{
              algorithm: theme.darkAlgorithm,
              token: {
                colorPrimary: '#8B5CF6',
                colorBgContainer: 'transparent',
                colorText: '#FFFFFF',
              }
            }}
          >
            <Steps
              current={step - 1}
              items={stepItems}
              className="custom-steps"
            />
          </ConfigProvider>
          <style jsx global>{`
            /* Custom styles for Ant Design Steps */
            .custom-steps-wrapper {
              margin: 0;
              padding: 0;
              overflow: hidden;
              width: 100%;
            }
            .custom-steps-wrapper .ant-steps {
              background: transparent;
              max-width: 100%;
            }
            .custom-steps-wrapper .ant-steps-item {
              padding: 0 !important;
              flex: 1;
            }
            .custom-steps-wrapper .ant-steps-item-title {
              display: none;
            }
            /* Common styles for both desktop and mobile */
            .custom-steps-wrapper .ant-steps-item-process .ant-steps-item-icon {
              background-color: #8B5CF6 !important;
              border-color: #8B5CF6 !important;
            }
            .custom-steps-wrapper .ant-steps-item-finish .ant-steps-item-icon {
              background-color: transparent !important;
              border-color: white !important;
            }
            .custom-steps-wrapper .ant-steps-item-finish .ant-steps-item-icon > .ant-steps-icon {
              color: white !important;
            }
            .custom-steps-wrapper .ant-steps-item-wait .ant-steps-item-icon {
              background-color: #1F2937 !important;
              border-color: #4B5563 !important;
            }
            .custom-steps-wrapper .ant-steps-item-tail::after {
              background-color: #4B5563 !important;
            }
            .custom-steps-wrapper .ant-steps-item-finish .ant-steps-item-tail::after {
              background-color: white !important;
            }
            /* Remove the pulsing animation since it's not rendering properly */
            .custom-steps-wrapper .ant-steps-item-process .ant-steps-item-icon {
              /* No animation */
            }
          `}</style>
        </motion.div>

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
              disabled={isLoading || (step === 1 && (emailStatus === 'checking' || emailStatus === 'taken'))}
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