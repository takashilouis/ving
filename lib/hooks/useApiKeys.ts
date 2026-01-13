'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/context/AuthContext'

interface ApiKeys {
  geminiKey: string
  klingAccessKey: string
  klingSecretKey: string
}

export function useApiKeys() {
  const { user, isDemoMode } = useAuth()
  const [geminiKey, setGeminiKey] = useState('')
  const [klingAccessKey, setKlingAccessKey] = useState('')
  const [klingSecretKey, setKlingSecretKey] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load keys on mount
  useEffect(() => {
    const loadKeys = async () => {
      setIsLoading(true)
      setError(null)

      try {
        if (isDemoMode) {
          // Load from localStorage
          const gemini = localStorage.getItem('gemini-api-key') || ''
          const klingAccess = localStorage.getItem('kling-access-key') || ''
          const klingSecret = localStorage.getItem('kling-secret-key') || ''
          setGeminiKey(gemini)
          setKlingAccessKey(klingAccess)
          setKlingSecretKey(klingSecret)
        } else {
          // Fetch from Supabase
          const response = await fetch('/api/user/api-keys')
          if (!response.ok) {
            throw new Error('Failed to load API keys')
          }

          const keys = await response.json()
          const gemini = keys.find((k: any) => k.type === 'gemini')?.value || ''
          const klingAccess = keys.find((k: any) => k.type === 'kling-access')?.value || ''
          const klingSecret = keys.find((k: any) => k.type === 'kling-secret')?.value || ''

          setGeminiKey(gemini)
          setKlingAccessKey(klingAccess)
          setKlingSecretKey(klingSecret)
        }
      } catch (err) {
        console.error('Error loading API keys:', err)
        setError(err instanceof Error ? err.message : 'Failed to load API keys')
      } finally {
        setIsLoading(false)
      }
    }

    loadKeys()
  }, [isDemoMode, user])

  const saveGeminiKey = async (key: string) => {
    try {
      if (isDemoMode) {
        localStorage.setItem('gemini-api-key', key)
        setGeminiKey(key)
      } else {
        const response = await fetch('/api/user/api-keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keyType: 'gemini', keyValue: key }),
        })

        if (!response.ok) {
          throw new Error('Failed to save API key')
        }

        setGeminiKey(key)
      }
      return { success: true }
    } catch (err) {
      console.error('Error saving Gemini key:', err)
      return { success: false, error: err instanceof Error ? err.message : 'Failed to save key' }
    }
  }

  const saveKlingKeys = async (accessKey: string, secretKey: string) => {
    try {
      if (isDemoMode) {
        localStorage.setItem('kling-access-key', accessKey)
        localStorage.setItem('kling-secret-key', secretKey)
        setKlingAccessKey(accessKey)
        setKlingSecretKey(secretKey)
      } else {
        await Promise.all([
          fetch('/api/user/api-keys', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ keyType: 'kling-access', keyValue: accessKey }),
          }),
          fetch('/api/user/api-keys', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ keyType: 'kling-secret', keyValue: secretKey }),
          }),
        ])

        setKlingAccessKey(accessKey)
        setKlingSecretKey(secretKey)
      }
      return { success: true }
    } catch (err) {
      console.error('Error saving Kling keys:', err)
      return { success: false, error: err instanceof Error ? err.message : 'Failed to save keys' }
    }
  }

  const clearGeminiKey = async () => {
    try {
      if (isDemoMode) {
        localStorage.removeItem('gemini-api-key')
        setGeminiKey('')
      } else {
        const response = await fetch('/api/user/api-keys', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keyType: 'gemini' }),
        })

        if (!response.ok) {
          throw new Error('Failed to clear API key')
        }

        setGeminiKey('')
      }
      return { success: true }
    } catch (err) {
      console.error('Error clearing Gemini key:', err)
      return { success: false, error: err instanceof Error ? err.message : 'Failed to clear key' }
    }
  }

  const clearKlingKeys = async () => {
    try {
      if (isDemoMode) {
        localStorage.removeItem('kling-access-key')
        localStorage.removeItem('kling-secret-key')
        setKlingAccessKey('')
        setKlingSecretKey('')
      } else {
        await Promise.all([
          fetch('/api/user/api-keys', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ keyType: 'kling-access' }),
          }),
          fetch('/api/user/api-keys', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ keyType: 'kling-secret' }),
          }),
        ])

        setKlingAccessKey('')
        setKlingSecretKey('')
      }
      return { success: true }
    } catch (err) {
      console.error('Error clearing Kling keys:', err)
      return { success: false, error: err instanceof Error ? err.message : 'Failed to clear keys' }
    }
  }

  return {
    geminiKey,
    klingAccessKey,
    klingSecretKey,
    isLoading,
    error,
    saveGeminiKey,
    saveKlingKeys,
    clearGeminiKey,
    clearKlingKeys,
    setGeminiKey,
    setKlingAccessKey,
    setKlingSecretKey,
  }
}
