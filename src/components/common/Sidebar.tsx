import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  ArrowLeftRight,
  TrendingUp,
  Receipt,
  PiggyBank,
  Target,
  Landmark,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useUser } from '../../hooks/useUser'
import { TAB_COLORS } from '../../lib/colors'
import { SHADOWS } from '../../lib/styles'

type Tab = 'dashboard' | 'transactions' | 'income' | 'expenses' | 'savings' | 'budget' | 'accounts' | 'chat' | 'profile'

type SidebarProps = {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  collapsed: boolean
  onToggleCollapse: () => void
}

const EXPANDED_WIDTH = 256 // w-64
const COLLAPSED_WIDTH = 68

const tabs = [
  {
    id: 'dashboard' as Tab,
    label: 'Dashboard',
    icon: LayoutDashboard,
    color: TAB_COLORS.dashboard,
  },
  {
    id: 'transactions' as Tab,
    label: 'Transactions',
    icon: ArrowLeftRight,
    color: TAB_COLORS.transactions,
  },
  {
    id: 'income' as Tab,
    label: 'Income',
    icon: TrendingUp,
    color: TAB_COLORS.income,
  },
  {
    id: 'expenses' as Tab,
    label: 'Expenses',
    icon: Receipt,
    color: TAB_COLORS.expenses,
  },
  {
    id: 'budget' as Tab,
    label: 'Budget',
    icon: Target,
    color: TAB_COLORS.budget,
  },
  {
    id: 'accounts' as Tab,
    label: 'Accounts',
    icon: Landmark,
    color: TAB_COLORS.accounts,
  },
  {
    id: 'savings' as Tab,
    label: 'Savings',
    icon: PiggyBank,
    color: TAB_COLORS.savings,
  },
  {
    id: 'chat' as Tab,
    label: 'Chat',
    icon: MessageCircle,
    color: TAB_COLORS.accounts,
  },
]

export { EXPANDED_WIDTH, COLLAPSED_WIDTH }

export function Sidebar({ activeTab, onTabChange, collapsed, onToggleCollapse }: SidebarProps) {
  const { email } = useUser()
  const activeIndex = tabs.findIndex((tab) => tab.id === activeTab)
  const [hoveredTab, setHoveredTab] = useState<string | null>(null)

  const width = collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH

  // Get initials from email
  const getInitials = (email: string | null) => {
    if (!email) return '?'
    const parts = email.split('@')[0].split(/[._-]/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return email.slice(0, 2).toUpperCase()
  }

  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1, width }}
      transition={{
        x: { duration: 0.4 },
        opacity: { duration: 0.4 },
        width: { type: 'spring', stiffness: 300, damping: 30 },
      }}
      className="fixed left-0 top-0 h-screen bg-white border-r border-[#1F1410]/10 hidden lg:flex lg:flex-col"
      style={{
        boxShadow: SHADOWS.sidebar,
      }}
    >
      {/* Collapse toggle chevron on the edge */}
      <button
        onClick={onToggleCollapse}
        className="absolute -right-3 top-7 z-10 w-6 h-6 rounded-full bg-white border border-[#1F1410]/10 flex items-center justify-center hover:bg-[#1F1410]/[0.04] transition-colors"
        style={{ boxShadow: '0 1px 4px rgba(31, 20, 16, 0.1)' }}
      >
        {collapsed ? (
          <ChevronRight className="w-3.5 h-3.5 text-[#1F1410]/50" />
        ) : (
          <ChevronLeft className="w-3.5 h-3.5 text-[#1F1410]/50" />
        )}
      </button>

      {/* Logo/Header */}
      <div className={`mb-8 overflow-hidden ${collapsed ? 'px-4 pt-6' : 'p-6 pb-0'}`}>
        <AnimatePresence mode="wait">
          {collapsed ? (
            <motion.h2
              key="collapsed-logo"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="text-xl font-bold text-[#1F1410] text-center"
            >
              P
            </motion.h2>
          ) : (
            <motion.h2
              key="expanded-logo"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="text-2xl font-bold text-[#1F1410]"
            >
              Pachi
            </motion.h2>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation Tabs */}
      <nav className={`relative flex-1 overflow-hidden ${collapsed ? 'px-2' : 'px-6'}`}>
        {/* Active tab background indicator */}
        <motion.div
          className={`absolute ${collapsed ? 'left-2 right-2' : 'left-6 right-6'} rounded-xl`}
          initial={false}
          animate={{
            y: activeIndex * 48,
            height: 48,
          }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 30,
          }}
          style={{
            backgroundColor:
              activeIndex >= 0 ? `${tabs[activeIndex].color}10` : 'transparent',
          }}
        />

        {/* Tab buttons */}
        <div className="relative">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = tab.id === activeTab
            const isHovered = hoveredTab === tab.id
            return (
              <div key={tab.id} className="relative">
                <button
                  onClick={() => onTabChange(tab.id)}
                  onMouseEnter={() => setHoveredTab(tab.id)}
                  onMouseLeave={() => setHoveredTab(null)}
                  className={`relative w-full h-12 flex items-center ${collapsed ? 'justify-center px-0' : 'gap-3 px-4'} rounded-xl transition-colors`}
                >
                  <motion.div
                    animate={{
                      scale: isActive ? 1.1 : 1,
                    }}
                    transition={{
                      type: 'spring',
                      stiffness: 400,
                      damping: 25,
                    }}
                  >
                    <Icon
                      className="w-5 h-5"
                      style={{
                        color: isActive ? tab.color : 'rgba(31, 20, 16, 0.4)',
                      }}
                    />
                  </motion.div>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="font-medium text-sm transition-colors whitespace-nowrap"
                      style={{
                        color: isActive ? tab.color : 'rgba(31, 20, 16, 0.6)',
                      }}
                    >
                      {tab.label}
                    </motion.span>
                  )}
                </button>
                {/* Tooltip for collapsed state */}
                {collapsed && isHovered && (
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1.5 bg-[#1F1410] text-white text-xs font-medium rounded-lg whitespace-nowrap z-50 pointer-events-none">
                    {tab.label}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </nav>

      {/* Profile & Settings */}
      <div className={`pt-2 border-t border-[#1F1410]/5 overflow-hidden ${collapsed ? 'px-2 pb-4' : 'px-6 pb-6'}`}>
        <button
          onClick={() => onTabChange('profile')}
          className={`w-full rounded-lg transition-all flex items-center ${collapsed ? 'justify-center p-2' : 'gap-2.5 px-2.5 py-2'} ${activeTab === 'profile' ? 'bg-[#1F1410]/[0.04]' : 'hover:bg-[#1F1410]/[0.03]'}`}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: `linear-gradient(to bottom right, ${TAB_COLORS.profile}, #EC4899)` }}
          >
            <span className="text-[10px] font-bold text-white">{getInitials(email)}</span>
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 text-left min-w-0">
                <p className="text-xs font-medium text-[#1F1410]/70 truncate">
                  {email || 'User'}
                </p>
              </div>
              <svg className="w-3.5 h-3.5 text-[#1F1410]/25 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </>
          )}
        </button>
      </div>
    </motion.div>
  )
}
