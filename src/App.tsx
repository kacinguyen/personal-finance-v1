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
import { ChatButton } from './components/chat/ChatButton'
import { ChatPanel } from './components/chat/ChatPanel'
import { ProtectedRoute } from './components/common/ProtectedRoute'
import { ChatProvider, useChatContext } from './contexts/ChatContext'
import { useMediaQuery } from './hooks/useMediaQuery'

type Tab = 'dashboard' | 'transactions' | 'income' | 'expenses' | 'savings' | 'budget' | 'accounts' | 'chat' | 'profile'

const CHAT_PANEL_WIDTH = 400

function AppContent() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const { isOpen: isChatOpen } = useChatContext()

  const showChatOverlay = activeTab !== 'chat'
  const mainPaddingRight = isDesktop && isChatOpen && showChatOverlay ? CHAT_PANEL_WIDTH : 0

  const renderView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />
      case 'transactions':
        return <TransactionsView selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} onNavigate={(tab) => setActiveTab(tab as Tab)} />
      case 'income':
        return <IncomeView selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />
      case 'expenses':
        return <TransactionFeed selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />
      case 'savings':
        return <SavingsView />
      case 'budget':
        return <BudgetView selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />
      case 'accounts':
        return <AccountsView />
      case 'chat':
        return <ChatView />
      case 'profile':
        return <ProfileView />
      default:
        return <DashboardView selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />
    }
  }

  return (
    <>
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
            paddingRight: mainPaddingRight,
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          {renderView()}
        </motion.main>
        <BottomTabBar activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
      {showChatOverlay && (
        <>
          <ChatButton />
          <ChatPanel />
        </>
      )}
    </>
  )
}

export function App() {
  return (
    <ProtectedRoute>
      <ChatProvider>
        <AppContent />
      </ChatProvider>
    </ProtectedRoute>
  )
}
