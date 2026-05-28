'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

interface AuthContextType {
  user: User | null
  session: Session | null
  isLoading: boolean
  isDemoMode: boolean
  signInWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signUpWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signInWithGoogle: () => Promise<{ error: AuthError | null }>
  signOut: () => Promise<{ error: AuthError | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  // useMemo ensures one stable client instance — prevents re-render loop
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setIsLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  const isDemoMode = !user

  const signInWithEmail = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    // DEBUG: Always log to see what we got
    console.log('🔍 Sign in response:', { data, error })

    // DEBUG: Log JWT token (visible in browser console)
    if (data?.session?.access_token) {
      console.log('╔═══════════════════════════════════════════════════════════╗')
      console.log('║           🔐 JWT TOKEN DEBUG (Login)                      ║')
      console.log('╚═══════════════════════════════════════════════════════════╝')
      console.log('📝 Full JWT Token:')
      console.log(data.session.access_token)
      console.log('\n📦 Token Structure (3 parts separated by dots):')
      const parts = data.session.access_token.split('.')
      console.log('  1️⃣  Header (Algorithm & Type):', parts[0])
      console.log('  2️⃣  Payload (User Data):', parts[1])
      console.log('  3️⃣  Signature (Verification):', parts[2])
      console.log('\n👤 Decoded User Info:')
      console.log('  • User ID:', data.session.user.id)
      console.log('  • Email:', data.session.user.email)
      console.log('  • Expires At:', new Date(data.session.expires_at! * 1000).toLocaleString())
      console.log('  • Issued At:', new Date(data.session.user.created_at).toLocaleString())
      console.log('\n🔗 Test on jwt.io: https://jwt.io')
      console.log('   Paste the token above to decode it!')
      console.log('═══════════════════════════════════════════════════════════')

      // Also send to server for terminal logging
      fetch('/api/debug/log-jwt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: data.session.access_token })
      }).catch(e => console.error('Failed to send JWT to server:', e))
    } else {
      console.log('❌ No JWT token in response!')
    }

    return { error }
  }

  const signUpWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    return { error }
  }

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    return { error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  const value = {
    user,
    session,
    isLoading,
    isDemoMode,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
