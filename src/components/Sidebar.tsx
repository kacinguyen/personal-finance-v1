import React from 'react'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  TrendingUp,
  Receipt,
  PiggyBank,
  Target,
  User,
} from 'lucide-react'

type Tab = 'dashboard' | 'income' | 'expenses' | 'savings' | 'budget' | 'profile'

type SidebarProps = {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

const tabs = [
  {
    id: 'dashboard' as Tab,
    label: 'Dashboard',
    icon: LayoutDashboard,
    color: '#F59E0B',
  },
  {
    id: 'income' as Tab,
    label: 'Income',
    icon: TrendingUp,
    color: '#10B981',
  },
  {
    id: 'expenses' as Tab,
    label: 'Expenses',
    icon: Receipt,
    color: '#FF6B6B',
  },
  {
    id: 'savings' as Tab,
    label: 'Savings',
    icon: PiggyBank,
    color: '#38BDF8',
  },
  {
    id: 'budget' as Tab,
    label: 'Budget',
    icon: Target,
    color: '#6366F1',
  },
]

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const activeIndex = tabs.findIndex((tab) => tab.id === activeTab)

  return (
    <motion.div
      initial={{
        x: -20,
        opacity: 0,
      }}
      animate={{
        x: 0,
        opacity: 1,
      }}
      transition={{
        duration: 0.4,
      }}
      className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-[#1F1410]/10 p-6 hidden lg:flex lg:flex-col"
      style={{
        boxShadow: '2px 0 12px rgba(31, 20, 16, 0.04)',
      }}
    >
      {/* Logo/Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-[#1F1410]">Finance</h2>
        <p className="text-sm text-[#1F1410]/50 mt-1">Track your money</p>
      </div>

      {/* Navigation Tabs */}
      <nav className="relative flex-1">
        {/* Active tab background indicator */}
        <motion.div
          className="absolute left-0 w-full rounded-xl"
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
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className="relative w-full h-12 flex items-center gap-3 px-4 rounded-xl transition-colors"
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
                <span
                  className="font-medium text-sm transition-colors"
                  style={{
                    color: isActive ? tab.color : 'rgba(31, 20, 16, 0.6)',
                  }}
                >
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>

      {/* Profile Section */}
      <div>
        <button
          onClick={() => onTabChange('profile')}
          className={`w-full p-3 rounded-xl transition-all flex items-center gap-3 ${activeTab === 'profile' ? 'bg-[#A855F7]/10' : 'hover:bg-[#1F1410]/5'}`}
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#A855F7] to-[#EC4899] flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-white">JD</span>
          </div>
          <div className="flex-1 text-left min-w-0">
            <p
              className="text-sm font-semibold truncate"
              style={{
                color: activeTab === 'profile' ? '#A855F7' : '#1F1410',
              }}
            >
              John Doe
            </p>
            <p className="text-xs text-[#1F1410]/50 truncate">View profile</p>
          </div>
          <User
            className="w-4 h-4 flex-shrink-0"
            style={{
              color:
                activeTab === 'profile' ? '#A855F7' : 'rgba(31, 20, 16, 0.4)',
            }}
          />
        </button>
      </div>
    </motion.div>
  )
}
