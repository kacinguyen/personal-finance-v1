import React from 'react'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  Calendar,
  Wallet,
  TrendingDown,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Check,
  X,
  Minus,
} from 'lucide-react'

type MonthStatus = {
  month: string
  status: 'under' | 'over' | 'on-track' | 'pending'
  difference: number
  spent: number
  budget: number
}

export function DashboardView() {
  const monthData = {
    currentDay: 22,
    daysInMonth: 31,
    daysRemaining: 9,
    daysElapsed: 22,
  }

  const expectedIncome = 3500
  const totalSpent = 472.5
  const totalBudget = 1950

  const budgetTracking = {
    totalBudget,
    expectedSpending:
      (totalBudget * monthData.daysElapsed) / monthData.daysInMonth,
    remainingIncome: expectedIncome - totalSpent,
    percentageOfIncome: (totalSpent / expectedIncome) * 100,
    percentageOfBudget: (totalSpent / totalBudget) * 100,
    status: 'under' as const,
    statusColor: '#10B981',
    statusText: 'Under budget',
  }

  const monthlyStatus: MonthStatus[] = [
    { month: 'Jan', status: 'under', difference: -127.5, spent: 472.5, budget: 600 },
    { month: 'Feb', status: 'pending', difference: 0, spent: 0, budget: 600 },
    { month: 'Mar', status: 'pending', difference: 0, spent: 0, budget: 600 },
    { month: 'Apr', status: 'pending', difference: 0, spent: 0, budget: 600 },
    { month: 'May', status: 'pending', difference: 0, spent: 0, budget: 600 },
    { month: 'Jun', status: 'pending', difference: 0, spent: 0, budget: 600 },
    { month: 'Jul', status: 'pending', difference: 0, spent: 0, budget: 600 },
    { month: 'Aug', status: 'pending', difference: 0, spent: 0, budget: 600 },
    { month: 'Sep', status: 'pending', difference: 0, spent: 0, budget: 600 },
    { month: 'Oct', status: 'pending', difference: 0, spent: 0, budget: 600 },
    { month: 'Nov', status: 'pending', difference: 0, spent: 0, budget: 600 },
    { month: 'Dec', status: 'pending', difference: 0, spent: 0, budget: 600 },
  ]

  const getStatusColor = (status: MonthStatus['status']) => {
    switch (status) {
      case 'under':
        return '#10B981'
      case 'over':
        return '#FF6B6B'
      case 'on-track':
        return '#F59E0B'
      case 'pending':
        return 'rgba(31, 20, 16, 0.2)'
    }
  }

  const getStatusIcon = (status: MonthStatus['status']) => {
    switch (status) {
      case 'under':
        return Check
      case 'over':
        return X
      case 'on-track':
        return Minus
      case 'pending':
        return Calendar
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#FFFBF5] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
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
              className="w-12 h-12 rounded-xl bg-[#F59E0B]/10 flex items-center justify-center"
            >
              <LayoutDashboard className="w-6 h-6 text-[#F59E0B]" />
            </motion.div>
            <h1 className="text-3xl sm:text-4xl font-bold text-[#1F1410]">Dashboard</h1>
          </div>
          <p className="text-[#1F1410]/60 text-lg">Your financial overview for {new Date().getFullYear()}</p>
        </motion.div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Total Spent */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="bg-white rounded-2xl p-6 shadow-sm"
            style={{ boxShadow: '0 2px 12px rgba(31, 20, 16, 0.06)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-[#1F1410]/50">Total Spent</p>
              <ArrowUpRight className="w-4 h-4 text-[#FF6B6B]" />
            </div>
            <p className="text-3xl font-bold text-[#1F1410] mb-1">${totalSpent.toLocaleString()}</p>
            <p className="text-xs text-[#1F1410]/40">{Math.round(budgetTracking.percentageOfBudget)}% of budget</p>
          </motion.div>

          {/* Expected Income */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="bg-white rounded-2xl p-6 shadow-sm"
            style={{ boxShadow: '0 2px 12px rgba(31, 20, 16, 0.06)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-[#1F1410]/50">Expected Income</p>
              <ArrowDownRight className="w-4 h-4 text-[#10B981]" />
            </div>
            <p className="text-3xl font-bold text-[#1F1410] mb-1">${expectedIncome.toLocaleString()}</p>
            <p className="text-xs text-[#1F1410]/40">This month</p>
          </motion.div>

          {/* Remaining */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="bg-white rounded-2xl p-6 shadow-sm"
            style={{ boxShadow: '0 2px 12px rgba(31, 20, 16, 0.06)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-[#1F1410]/50">Remaining</p>
              <Wallet className="w-4 h-4 text-[#10B981]" />
            </div>
            <p className="text-3xl font-bold text-[#10B981] mb-1">${budgetTracking.remainingIncome.toLocaleString()}</p>
            <p className="text-xs text-[#1F1410]/40">From income</p>
          </motion.div>

          {/* Days Left */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="bg-white rounded-2xl p-6 shadow-sm"
            style={{ boxShadow: '0 2px 12px rgba(31, 20, 16, 0.06)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-[#1F1410]/50">Days Left</p>
              <Calendar className="w-4 h-4 text-[#F59E0B]" />
            </div>
            <p className="text-3xl font-bold text-[#1F1410] mb-1">{monthData.daysRemaining}</p>
            <p className="text-xs text-[#1F1410]/40">In January</p>
          </motion.div>
        </div>

        {/* Budget Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="bg-white rounded-2xl p-8 shadow-sm mb-8"
          style={{ boxShadow: '0 2px 12px rgba(31, 20, 16, 0.06)' }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-[#1F1410] mb-1">Budget Status</h2>
              <p className="text-sm text-[#1F1410]/50">Track your spending against your monthly budget</p>
            </div>
            <div className="flex items-center gap-3">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.7 }}
              >
                {budgetTracking.status === 'under' ? (
                  <TrendingDown className="w-6 h-6" style={{ color: budgetTracking.statusColor }} />
                ) : (
                  <TrendingUp className="w-6 h-6" style={{ color: budgetTracking.statusColor }} />
                )}
              </motion.div>
              <span className="font-bold text-xl" style={{ color: budgetTracking.statusColor }}>
                {budgetTracking.statusText}
              </span>
            </div>
          </div>

          {/* Progress Bars */}
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-sm text-[#1F1410]/60 mb-2">
                <span>Spent vs Budget</span>
                <span className="font-semibold text-[#1F1410]">
                  ${totalSpent.toLocaleString()} / ${totalBudget.toLocaleString()}
                </span>
              </div>
              <div className="h-3 bg-[#1F1410]/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(budgetTracking.percentageOfBudget, 100)}%` }}
                  transition={{ duration: 1, delay: 0.8, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: budgetTracking.statusColor }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm text-[#1F1410]/60 mb-2">
                <span>Spent vs Income</span>
                <span className="font-semibold text-[#1F1410]">
                  {Math.round(budgetTracking.percentageOfIncome)}% used
                </span>
              </div>
              <div className="h-3 bg-[#1F1410]/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(budgetTracking.percentageOfIncome, 100)}%` }}
                  transition={{ duration: 1, delay: 0.9, ease: 'easeOut' }}
                  className="h-full rounded-full bg-[#10B981]"
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Monthly Budget Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.4 }}
          className="mb-8"
        >
          <h2 className="text-xl font-bold text-[#1F1410] mb-4">2024 Monthly Overview</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {monthlyStatus.map((month, index) => {
              const StatusIcon = getStatusIcon(month.status)
              const statusColor = getStatusColor(month.status)
              const isPending = month.status === 'pending'
              return (
                <motion.div
                  key={month.month}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.1 + index * 0.05, duration: 0.3 }}
                  className="bg-white rounded-xl p-4 shadow-sm"
                  style={{
                    boxShadow: '0 2px 8px rgba(31, 20, 16, 0.04)',
                    opacity: isPending ? 0.5 : 1,
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-[#1F1410]">{month.month}</span>
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${statusColor}20` }}
                    >
                      <StatusIcon className="w-3.5 h-3.5" style={{ color: statusColor }} />
                    </div>
                  </div>
                  {!isPending ? (
                    <>
                      <p className="text-lg font-bold mb-1" style={{ color: statusColor }}>
                        {month.difference > 0 ? '+' : ''}${Math.abs(month.difference).toFixed(0)}
                      </p>
                      <p className="text-xs text-[#1F1410]/40">
                        {month.status === 'under' ? 'Under' : month.status === 'over' ? 'Over' : 'On track'}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-lg font-bold text-[#1F1410]/30 mb-1">--</p>
                      <p className="text-xs text-[#1F1410]/30">Pending</p>
                    </>
                  )}
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8, duration: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <div
            className="bg-white rounded-xl p-5 shadow-sm"
            style={{ boxShadow: '0 2px 8px rgba(31, 20, 16, 0.04)' }}
          >
            <p className="text-xs font-semibold text-[#1F1410]/40 uppercase tracking-wide mb-2">Daily Average</p>
            <p className="text-2xl font-bold text-[#1F1410]">${(totalSpent / monthData.daysElapsed).toFixed(2)}</p>
          </div>
          <div
            className="bg-white rounded-xl p-5 shadow-sm"
            style={{ boxShadow: '0 2px 8px rgba(31, 20, 16, 0.04)' }}
          >
            <p className="text-xs font-semibold text-[#1F1410]/40 uppercase tracking-wide mb-2">Projected Total</p>
            <p className="text-2xl font-bold text-[#1F1410]">
              ${((totalSpent / monthData.daysElapsed) * monthData.daysInMonth).toFixed(0)}
            </p>
          </div>
          <div
            className="bg-white rounded-xl p-5 shadow-sm"
            style={{ boxShadow: '0 2px 8px rgba(31, 20, 16, 0.04)' }}
          >
            <p className="text-xs font-semibold text-[#1F1410]/40 uppercase tracking-wide mb-2">Savings Rate</p>
            <p className="text-2xl font-bold text-[#10B981]">
              {Math.round(((expectedIncome - totalSpent) / expectedIncome) * 100)}%
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
