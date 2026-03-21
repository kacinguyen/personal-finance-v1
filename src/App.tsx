import { useState } from 'react'
import { motion } from 'framer-motion'
import { DemoBanner } from './components/common/DemoBanner'
import { Sidebar, EXPANDED_WIDTH, COLLAPSED_WIDTH } from './components/common/Sidebar'
import { BottomTabBar } from './components/common/BottomTabBar'
import { DashboardView } from './components/views/DashboardView'
import { TransactionsView } from './components/views/TransactionsView'
import { TransactionFeed } from './components/views/TransactionFeed'
import { IncomeView } from './components/views/IncomeView'
import { SavingsView } from './components/views/SavingsView'
import { ProfileView } from './components/views/ProfileView'
import { BudgetView } from './components/views/BudgetView'
import { AccountsView } from './components/views/AccountsView'
import { ChatView } from './components/views/ChatView'
import { ProtectedRoute } from './components/common/ProtectedRoute'
import { useMediaQuery } from './hooks/useMediaQuery'

type Tab = 'dashboard' | 'transactions' | 'income' | 'expenses' | 'savings' | 'budget' | 'accounts' | 'chat' | 'profile'

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  const renderView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />
      case 'transactions':
        return <TransactionsView onNavigate={(tab) => setActiveTab(tab as Tab)} />
      case 'income':
        return <IncomeView />
      case 'expenses':
        return <TransactionFeed />
      case 'savings':
        return <SavingsView />
      case 'budget':
        return <BudgetView />
      case 'accounts':
        return <AccountsView />
      case 'chat':
        return <ChatView />
      case 'profile':
        return <ProfileView />
      default:
        return <DashboardView />
    }
  }

  return (
    <ProtectedRoute>
      <DemoBanner />
      <div className="flex min-h-screen bg-[#FFFBF5]">
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <motion.main
          className="flex-1 pb-16 lg:pb-0"
          animate={{
            paddingLeft: isDesktop
              ? sidebarCollapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH
              : 0,
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          {renderView()}
        </motion.main>
        <BottomTabBar activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </ProtectedRoute>
  )
}
