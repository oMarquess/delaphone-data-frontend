'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

interface FormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  company: string;
  role: string;
}

export default function SignUpForm() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    company: '',
    role: ''
  });
  const router = useRouter();

  const updateFormData = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 3) {
      setStep(step + 1);
    } else {
      // TODO: Implement signup logic here
      console.log('Signup complete with:', formData);
    }
  };

  const goBack = () => {
    setStep(step - 1);
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
          <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
            Full Name
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => updateFormData('name', e.target.value)}
            className="w-full px-4 py-3 bg-gray-800/50 border border-white/15 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
            placeholder="Enter your full name"
            required
          />
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
            className="w-full px-4 py-3 bg-gray-800/50 border border-white/15 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
            placeholder="Enter your email"
            required
          />
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
            className="w-full px-4 py-3 bg-gray-800/50 border border-white/15 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
            placeholder="Create a password"
            required
          />
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
            className="w-full px-4 py-3 bg-gray-800/50 border border-white/15 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
            placeholder="Confirm your password"
            required
          />
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
          <label htmlFor="company" className="block text-sm font-medium text-gray-300 mb-2">
            Company Name
          </label>
          <input
            type="text"
            id="company"
            value={formData.company}
            onChange={(e) => updateFormData('company', e.target.value)}
            className="w-full px-4 py-3 bg-gray-800/50 border border-white/15 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
            placeholder="Enter your company name"
            required
          />
        </div>
        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-300 mb-2">
            Your Role
          </label>
          <input
            type="text"
            id="role"
            value={formData.role}
            onChange={(e) => updateFormData('role', e.target.value)}
            className="w-full px-4 py-3 bg-gray-800/50 border border-white/15 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
            placeholder="Enter your role"
            required
          />
        </div>
      </motion.div>
    )
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="w-full p-8 space-y-6 bg-gray-900/40 backdrop-blur-xl rounded-xl border border-white/15"
    >
      {/* Progress Bar */}
      <div className="relative mb-8">
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

        <div className="flex justify-between mt-8">
          {step > 1 && (
            <button
              type="button"
              onClick={goBack}
              className="px-6 py-3 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Back
            </button>
          )}
          <button
            type="submit"
            className="relative ml-auto px-6 py-3 text-white font-medium text-sm rounded-lg overflow-hidden bg-purple-500 hover:bg-purple-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            <span className="relative">{step === 3 ? 'Complete Setup' : 'Continue'}</span>
          </button>
        </div>
      </form>

      <p className="text-center text-sm text-gray-400">
        Already have an account?{' '}
        <button
          onClick={() => router.push('/login')}
          className="text-purple-500 hover:text-purple-400 font-medium transition-colors"
        >
          Sign in
        </button>
      </p>
    </motion.div>
  );
} 