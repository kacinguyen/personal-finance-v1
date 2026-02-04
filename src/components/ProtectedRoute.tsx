import React from 'react'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { AuthView } from './AuthView'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[#FFFBF5] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="w-8 h-8 text-[#A855F7] animate-spin" />
          <p className="text-sm text-[#1F1410]/60">Loading...</p>
        </motion.div>
      </div>
    )
  }

  if (!user) {
    return <AuthView />
  }

  return <>{children}</>
}
