'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/context/AuthContext'
import AuthModal from './AuthModal'
import UserMenu from '../UserMenu'

export default function AuthButton() {
  const { user, isLoading } = useAuth()
  const [isModalOpen, setIsModalOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="fixed top-4 right-4 z-40">
        <div className="w-8 h-8 rounded-full bg-[#1A1A1A] border border-[#2A2A2A] animate-pulse" />
      </div>
    )
  }

  if (user) {
    return <UserMenu />
  }

  return (
    <>
      <div className="fixed top-4 right-4 z-40">
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-green-500 hover:bg-green-600 text-white font-medium px-4 py-2 rounded transition-colors text-sm"
        >
          Sign In
        </button>
      </div>

      <AuthModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  )
}
