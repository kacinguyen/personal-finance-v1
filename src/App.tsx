import { useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { DashboardView } from './components/DashboardView'
import { TransactionsView } from './components/TransactionsView'
import { TransactionFeed } from './components/TransactionFeed'
import { IncomeView } from './components/IncomeView'
import { SavingsView } from './components/SavingsView'
import { ProfileView } from './components/ProfileView'
import { BudgetView } from './components/BudgetView'
import { AccountsView } from './components/AccountsView'
import { ProtectedRoute } from './components/ProtectedRoute'

type Tab = 'dashboard' | 'transactions' | 'income' | 'expenses' | 'savings' | 'budget' | 'accounts' | 'profile'

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')

  const renderView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />
      case 'transactions':
        return <TransactionsView />
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
      <div className="flex min-h-screen bg-[#FFFBF5]">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="flex-1 lg:pl-64">{renderView()}</main>
      </div>
    </ProtectedRoute>
  )
}
