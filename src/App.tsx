import { useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { DashboardView } from './components/DashboardView'
import { TransactionFeed } from './components/TransactionFeed'
import { IncomeView } from './components/IncomeView'
import { SavingsView } from './components/SavingsView'
import { ProfileView } from './components/ProfileView'
import { BudgetView } from './components/BudgetView'
import { ProtectedRoute } from './components/ProtectedRoute'

type Tab = 'dashboard' | 'income' | 'expenses' | 'savings' | 'budget' | 'profile'

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')

  const renderView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />
      case 'income':
        return <IncomeView />
      case 'expenses':
        return <TransactionFeed />
      case 'savings':
        return <SavingsView />
      case 'budget':
        return <BudgetView />
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
