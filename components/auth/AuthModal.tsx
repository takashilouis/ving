'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import EmailAuthForm from './EmailAuthForm'
import GoogleAuthButton from './GoogleAuthButton'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  defaultMode?: 'signin' | 'signup'
}

export default function AuthModal({ isOpen, onClose, defaultMode = 'signin' }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>(defaultMode)

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg shadow-xl max-w-md w-full p-6 relative"
            >
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Header */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">
                  {mode === 'signin' ? 'Welcome back' : 'Create account'}
                </h2>
                <p className="text-gray-400 text-sm">
                  {mode === 'signin'
                    ? 'Sign in to create latest trendy Gen-AI images/videos'
                    : 'Sign up to generate creative AI images/videos'}
                </p>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-[#2A2A2A] mb-6">
                <button
                  onClick={() => setMode('signin')}
                  className={`flex-1 pb-3 text-sm font-medium transition-colors relative ${mode === 'signin' ? 'text-green-500' : 'text-gray-400 hover:text-white'
                    }`}
                >
                  Sign In
                  {mode === 'signin' && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500"
                    />
                  )}
                </button>
                <button
                  onClick={() => setMode('signup')}
                  className={`flex-1 pb-3 text-sm font-medium transition-colors relative ${mode === 'signup' ? 'text-green-500' : 'text-gray-400 hover:text-white'
                    }`}
                >
                  Sign Up
                  {mode === 'signup' && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500"
                    />
                  )}
                </button>
              </div>

              {/* Auth forms */}
              <div className="space-y-4">
                <EmailAuthForm mode={mode} onSuccess={onClose} />

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#2A2A2A]" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-2 bg-[#1A1A1A] text-gray-400">OR</span>
                  </div>
                </div>

                <GoogleAuthButton />
              </div>

              {/* Footer */}
              <div className="mt-6 pt-6 border-t border-[#2A2A2A]">
                <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>10 free credits</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>No credit card</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
