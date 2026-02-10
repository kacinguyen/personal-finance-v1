import { motion } from 'framer-motion'
import { User, Mail, Bell, Lock, CreditCard, Globe, Moon, Shield, LogOut } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useUser } from '../../hooks/useUser'
import { TAB_COLORS } from '../../lib/colors'
import { SHADOWS } from '../../lib/styles'

export function ProfileView() {
  const { signOut } = useAuth()
  const { email } = useUser()

  // Get initials from email
  const getInitials = (email: string | null) => {
    if (!email) return '?'
    const parts = email.split('@')[0].split(/[._-]/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return email.slice(0, 2).toUpperCase()
  }

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <div className="min-h-screen w-full bg-[#FFFBF5] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
              className="w-12 h-12 rounded-xl bg-[#A855F7]/10 flex items-center justify-center"
            >
              <User className="w-6 h-6 text-[#A855F7]" />
            </motion.div>
            <h1 className="text-3xl sm:text-4xl font-bold text-[#1F1410]">Profile</h1>
          </div>
          <p className="text-[#1F1410]/60 text-lg">Manage your account settings and preferences</p>
        </motion.div>

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="bg-white rounded-2xl p-8 shadow-sm mb-6"
          style={{ boxShadow: SHADOWS.card }}
        >
          <div className="flex items-center gap-6 mb-6">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center"
              style={{ background: `linear-gradient(to bottom right, ${TAB_COLORS.profile}, #EC4899)` }}
            >
              <span className="text-3xl font-bold text-white">{getInitials(email)}</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#1F1410] mb-1">{email || 'User'}</h2>
              <p className="text-[#1F1410]/60">Logged in</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[#1F1410]/5">
              <div className="flex items-center gap-3 mb-2">
                <Mail className="w-5 h-5 text-[#1F1410]/60" />
                <span className="text-sm font-semibold text-[#1F1410]/70">Email</span>
              </div>
              <p className="text-[#1F1410]">{email || 'Not available'}</p>
            </div>
            <div className="p-4 rounded-xl bg-[#1F1410]/5">
              <div className="flex items-center gap-3 mb-2">
                <User className="w-5 h-5 text-[#1F1410]/60" />
                <span className="text-sm font-semibold text-[#1F1410]/70">Account Status</span>
              </div>
              <p className="text-[#1F1410]">Active</p>
            </div>
          </div>
        </motion.div>

        {/* Settings Sections */}
        <div className="space-y-6">
          {/* Account Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="bg-white rounded-2xl p-6 shadow-sm"
            style={{ boxShadow: '0 2px 12px rgba(31, 20, 16, 0.06)' }}
          >
            <h3 className="text-lg font-bold text-[#1F1410] mb-4">Account Settings</h3>
            <div className="space-y-3">
              {[
                { icon: Lock, label: 'Change Password', value: '••••••••' },
                { icon: Shield, label: 'Two-Factor Authentication', value: 'Enabled' },
                { icon: CreditCard, label: 'Payment Methods', value: '2 cards' },
              ].map((item, index) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.05 }}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-[#1F1410]/5 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-5 h-5 text-[#1F1410]/60" />
                    <span className="text-sm font-medium text-[#1F1410]">{item.label}</span>
                  </div>
                  <span className="text-sm text-[#1F1410]/50">{item.value}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Preferences */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="bg-white rounded-2xl p-6 shadow-sm"
            style={{ boxShadow: '0 2px 12px rgba(31, 20, 16, 0.06)' }}
          >
            <h3 className="text-lg font-bold text-[#1F1410] mb-4">Preferences</h3>
            <div className="space-y-3">
              {[
                { icon: Bell, label: 'Notifications', value: 'All enabled' },
                { icon: Moon, label: 'Dark Mode', value: 'Off' },
                { icon: Globe, label: 'Language', value: 'English' },
              ].map((item, index) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + index * 0.05 }}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-[#1F1410]/5 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-5 h-5 text-[#1F1410]/60" />
                    <span className="text-sm font-medium text-[#1F1410]">{item.label}</span>
                  </div>
                  <span className="text-sm text-[#1F1410]/50">{item.value}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Sign Out Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.4 }}
            className="bg-white rounded-2xl p-6 shadow-sm border-2 border-[#FF6B6B]/20"
            style={{ boxShadow: '0 2px 12px rgba(255, 107, 107, 0.1)' }}
          >
            <h3 className="text-lg font-bold text-[#1F1410] mb-2">Sign Out</h3>
            <p className="text-sm text-[#1F1410]/60 mb-4">
              You'll need to sign in again to access your account
            </p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSignOut}
              className="w-full p-4 rounded-xl bg-[#FF6B6B] text-white font-semibold flex items-center justify-center gap-2 hover:bg-[#FF5252] transition-colors"
              style={{ boxShadow: '0 2px 8px rgba(255, 107, 107, 0.3)' }}
            >
              <LogOut className="w-5 h-5" />
              <span>Sign Out</span>
            </motion.button>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
