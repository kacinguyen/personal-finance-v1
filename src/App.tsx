import { useState } from 'react'
import { DemoBanner } from './components/common/DemoBanner'
import { Sidebar } from './components/common/Sidebar'
import { DashboardView } from './components/views/DashboardView'
import { TransactionsView } from './components/views/TransactionsView'
import { TransactionFeed } from './components/views/TransactionFeed'
import { IncomeView } from './components/views/IncomeView'
import { SavingsView } from './components/views/SavingsView'
import { ProfileView } from './components/views/ProfileView'
import { BudgetView } from './components/views/BudgetView'
import { AccountsView } from './components/views/AccountsView'
import { ProtectedRoute } from './components/common/ProtectedRoute'

type Tab = 'dashboard' | 'transactions' | 'income' | 'expenses' | 'savings' | 'budget' | 'accounts' | 'profile'

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')

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
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="flex-1 lg:pl-64">{renderView()}</main>
      </div>
    </ProtectedRoute>
  )
}
