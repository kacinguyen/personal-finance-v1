import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  ArrowLeftRight,
  TrendingUp,
  Receipt,
  PiggyBank,
  Target,
  Landmark,
} from 'lucide-react'
import { TAB_COLORS } from '../../lib/colors'

type Tab = 'dashboard' | 'transactions' | 'income' | 'expenses' | 'savings' | 'budget' | 'accounts' | 'profile'

type BottomTabBarProps = {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

const tabs = [
  { id: 'dashboard' as Tab, label: 'Dashboard', icon: LayoutDashboard, color: TAB_COLORS.dashboard },
  { id: 'transactions' as Tab, label: 'Transactions', icon: ArrowLeftRight, color: TAB_COLORS.transactions },
  { id: 'income' as Tab, label: 'Income', icon: TrendingUp, color: TAB_COLORS.income },
  { id: 'expenses' as Tab, label: 'Expenses', icon: Receipt, color: TAB_COLORS.expenses },
  { id: 'budget' as Tab, label: 'Budget', icon: Target, color: TAB_COLORS.budget },
  { id: 'savings' as Tab, label: 'Savings', icon: PiggyBank, color: TAB_COLORS.savings },
  { id: 'accounts' as Tab, label: 'Accounts', icon: Landmark, color: TAB_COLORS.accounts },
]

export function BottomTabBar({ activeTab, onTabChange }: BottomTabBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#1F1410]/10 lg:hidden">
      <div className="flex overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = tab.id === activeTab
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="flex-shrink-0 flex flex-col items-center justify-center gap-0.5 px-4 py-2 min-w-[72px] relative"
            >
              {isActive && (
                <motion.div
                  layoutId="bottomTabIndicator"
                  className="absolute top-0 left-2 right-2 h-[2px] rounded-full"
                  style={{ backgroundColor: tab.color }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <Icon
                className="w-5 h-5"
                style={{
                  color: isActive ? tab.color : 'rgba(31, 20, 16, 0.35)',
                }}
              />
              <span
                className="text-[10px] font-medium"
                style={{
                  color: isActive ? tab.color : 'rgba(31, 20, 16, 0.4)',
                }}
              >
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
      {/* Safe area padding for notched devices */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </div>
  )
}
