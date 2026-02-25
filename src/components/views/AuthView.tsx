import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, Wallet, Lock, Loader2, AlertCircle, ArrowRight } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { isDemoMode, DEMO_EMAIL, DEMO_PASSWORD } from '../../lib/demo'

export function AuthView() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState(isDemoMode ? DEMO_EMAIL : '')
  const [password, setPassword] = useState(isDemoMode ? DEMO_PASSWORD : '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    try {
      const { error } = await signIn(email, password)

      if (error) {
        setError(error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#FFFBF5] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#14B8A6] to-[#10B981] flex items-center justify-center mx-auto mb-4"
          >
            <Wallet className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-3xl font-bold text-[#1F1410]">Pachi</h1>
          <p className="text-[#1F1410]/40 mt-1 text-sm tracking-wide">Personal Finance Tracker</p>
        </div>

        {/* Auth Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="bg-white rounded-2xl p-8 shadow-sm"
          style={{ boxShadow: '0 2px 12px rgba(31, 20, 16, 0.06)' }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-[#1F1410]/70 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#1F1410]/40" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#1F1410]/10 focus:border-[#14B8A6]/30 focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/10 transition-all placeholder:text-[#1F1410]/30"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-[#1F1410]/70 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#1F1410]/40" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#1F1410]/10 focus:border-[#14B8A6]/30 focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/10 transition-all placeholder:text-[#1F1410]/30"
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-3 rounded-xl bg-[#FF6B6B]/10 text-[#FF6B6B]"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </motion.div>
            )}

            {/* Submit Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full p-4 rounded-xl bg-[#1F1410] text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </motion.button>
          </form>

          {/* Demo Quick Login */}
          {isDemoMode && (
            <button
              type="button"
              onClick={() => {
                setEmail(DEMO_EMAIL)
                setPassword(DEMO_PASSWORD)
                // Submit the form programmatically
                const form = document.querySelector('form')
                if (form) form.requestSubmit()
              }}
              className="w-full mt-3 p-3 rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/5 text-sm font-medium text-[#F59E0B] hover:bg-[#F59E0B]/10 transition-colors"
            >
              Sign in as demo user
            </button>
          )}

        </motion.div>
      </motion.div>
    </div>
  )
}
