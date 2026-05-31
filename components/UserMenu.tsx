'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/lib/context/AuthContext'

export default function UserMenu() {
  const { user, signOut } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      await signOut()
      setIsOpen(false)
    } catch (error) {
      console.error('Error signing out:', error)
    } finally {
      setIsSigningOut(false)
    }
  }

  // Generate initials from email
  const getInitials = (email: string) => {
    const parts = email.split('@')[0].split('.')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return email.slice(0, 2).toUpperCase()
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-full bg-green-500 hover:bg-green-600 text-white font-medium flex items-center justify-center transition-colors"
      >
        {user?.email ? getInitials(user.email) : '?'}
      </button>

      {isOpen && (
        <div className="absolute top-12 right-0 z-50 w-64 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg shadow-xl overflow-hidden">
          {/* User info */}
          <div className="p-4 border-b border-[#2A2A2A]">
            <p className="text-sm font-medium text-white truncate">{user?.email}</p>
            <p className="text-xs text-gray-400 mt-1">Signed in</p>
          </div>

          {/* Menu items */}
          <div className="py-2">
            <button
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-[#2A2A2A] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isSigningOut ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Signing out...
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4 mr-3"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign Out
                </>
              )}
            </button>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 bg-[#0E0E0E] border-t border-[#2A2A2A]">
            <p className="text-xs text-gray-500">
              Your API keys and video history are synced to your account.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
