import { supabase } from './supabase'
import { getFirstOfMonth, getMonthRange, formatMonth, getMonthKey } from './dateUtils'

export type ExportMonth = {
  label: string
  value: string
  startDate?: string
  endDate?: string
}

/**
 * Fetch the range of months that have transactions, for the month picker.
 */
export async function fetchAvailableMonths(userId: string): Promise<ExportMonth[]> {
  const { data } = await supabase
    .from('transactions')
    .select('date')
    .eq('user_id', userId)
    .order('date', { ascending: true })
    .limit(1)

  const { data: dataDesc } = await supabase
    .from('transactions')
    .select('date')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(1)

  if (!data?.length || !dataDesc?.length) return []

  const minDate = new Date(data[0].date + 'T00:00:00')
  const maxDate = new Date(dataDesc[0].date + 'T00:00:00')

  const months: ExportMonth[] = [{ label: 'All transactions', value: 'all' }]

  // Generate months from max (most recent) to min
  const cursor = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1)
  const minMonth = new Date(minDate.getFullYear(), minDate.getMonth(), 1)

  while (cursor >= minMonth) {
    const monthDate = getFirstOfMonth(cursor.getFullYear(), cursor.getMonth())
    const { startOfMonth, endOfMonth } = getMonthRange(monthDate)
    months.push({
      label: formatMonth(monthDate),
      value: getMonthKey(monthDate),
      startDate: startOfMonth,
      endDate: endOfMonth,
    })
    cursor.setMonth(cursor.getMonth() - 1)
  }

  return months
}

const CSV_HEADERS = ['Date', 'Merchant', 'Category', 'Type', 'Amount', 'Account', 'Tags', 'Notes', 'Payment Channel']

function escapeCSV(value: string | null | undefined): string {
  if (value == null) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

/**
 * Fetch transactions (with splits resolved) and return a CSV string.
 */
export async function exportTransactionsToCSV(
  userId: string,
  startDate?: string,
  endDate?: string,
): Promise<string> {
  // 1. Fetch categories
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, category_type')
    .eq('user_id', userId)

  const categoryMap = new Map<string, { name: string; category_type: string }>()
  for (const c of categories ?? []) {
    categoryMap.set(c.id, { name: c.name, category_type: c.category_type })
  }

  // 2. Fetch transactions
  let query = supabase
    .from('transactions')
    .select('id, date, merchant, category_id, amount, source_name, tags, notes, payment_channel')
    .eq('user_id', userId)
    .order('date', { ascending: true })

  if (startDate) query = query.gte('date', startDate)
  if (endDate) query = query.lte('date', endDate)

  const { data: transactions } = await query
  if (!transactions?.length) return ''

  // 3. Fetch splits (batched)
  const txIds = transactions.map(t => t.id)
  const splitsMap = new Map<string, { amount: number; category_id: string | null }[]>()

  for (let i = 0; i < txIds.length; i += 500) {
    const batch = txIds.slice(i, i + 500)
    const { data: splits } = await supabase
      .from('transaction_splits')
      .select('transaction_id, amount, category_id')
      .in('transaction_id', batch)

    for (const s of splits ?? []) {
      const list = splitsMap.get(s.transaction_id) || []
      list.push({ amount: s.amount, category_id: s.category_id })
      splitsMap.set(s.transaction_id, list)
    }
  }

  // 4. Build CSV rows
  const rows: string[][] = []

  for (const tx of transactions) {
    const splits = splitsMap.get(tx.id)

    if (splits && splits.length > 0) {
      // One row per split
      for (const split of splits) {
        const cat = split.category_id ? categoryMap.get(split.category_id) : null
        rows.push([
          tx.date,
          tx.merchant ?? '',
          cat?.name ?? '',
          cat?.category_type ?? '',
          String(split.amount),
          tx.source_name ?? '',
          tx.tags ?? '',
          tx.notes ?? '',
          tx.payment_channel ?? '',
        ])
      }
    } else {
      const cat = tx.category_id ? categoryMap.get(tx.category_id) : null
      rows.push([
        tx.date,
        tx.merchant ?? '',
        cat?.name ?? '',
        cat?.category_type ?? '',
        String(tx.amount),
        tx.source_name ?? '',
        tx.tags ?? '',
        tx.notes ?? '',
        tx.payment_channel ?? '',
      ])
    }
  }

  // 5. Generate CSV string
  const lines = [
    CSV_HEADERS.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(',')),
  ]

  return lines.join('\n')
}

/**
 * Trigger a browser download of a CSV string.
 */
export function triggerCSVDownload(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
