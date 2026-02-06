/**
 * Category type definitions
 * Maps to the Supabase categories table schema
 */

export type CategoryType = 'need' | 'want' | 'income' | 'transfer'

export type Category = {
  id: string
  user_id: string
  name: string
  normalized_name: string
  icon: string
  color: string
  category_type: CategoryType
  parent_id: string | null
  is_system: boolean
  is_active: boolean
  is_budgetable: boolean
  created_at: string
  updated_at: string
}

/**
 * Input type for creating a new category (omits auto-generated fields)
 */
export type CategoryInsert = Omit<Category, 'id' | 'created_at' | 'updated_at' | 'normalized_name' | 'parent_id' | 'is_budgetable'> & {
  id?: string
  normalized_name?: string
  parent_id?: string | null
  is_budgetable?: boolean
  created_at?: string
  updated_at?: string
}

/**
 * Input type for updating a category
 */
export type CategoryUpdate = Partial<Omit<Category, 'id' | 'user_id'>> & {
  id: string
}

/**
 * Default category definition with optional children for hierarchy
 */
export type DefaultCategoryDef = Omit<CategoryInsert, 'user_id'> & {
  children?: Omit<CategoryInsert, 'user_id'>[]
}

/**
 * Default categories for new users (hierarchical structure)
 * Parent categories contain children array; children inherit parent's category_type
 */
export const DEFAULT_CATEGORIES: DefaultCategoryDef[] = [
  // Home
  {
    name: 'Home',
    icon: 'Home',
    color: '#6366F1',
    category_type: 'need',
    is_system: true,
    is_active: true,
    children: [
      { name: 'Rent', icon: 'Key', color: '#6366F1', category_type: 'need', is_system: true, is_active: true },
      { name: 'Utilities', icon: 'Zap', color: '#F59E0B', category_type: 'need', is_system: true, is_active: true },
      { name: 'Internet', icon: 'Wifi', color: '#3B82F6', category_type: 'need', is_system: true, is_active: true },
      { name: 'Insurance', icon: 'Shield', color: '#10B981', category_type: 'need', is_system: true, is_active: true },
    ],
  },
  // Transportation
  {
    name: 'Transportation',
    icon: 'Car',
    color: '#38BDF8',
    category_type: 'need',
    is_system: true,
    is_active: true,
    children: [
      { name: 'Car', icon: 'Car', color: '#38BDF8', category_type: 'need', is_system: true, is_active: true },
      { name: 'Rideshare', icon: 'Navigation', color: '#8B5CF6', category_type: 'need', is_system: true, is_active: true },
      { name: 'Public Transportation', icon: 'Train', color: '#14B8A6', category_type: 'need', is_system: true, is_active: true },
      { name: 'Parking', icon: 'ParkingCircle', color: '#6B7280', category_type: 'need', is_system: true, is_active: true },
    ],
  },
  // Shopping
  {
    name: 'Shopping',
    icon: 'ShoppingBag',
    color: '#A855F7',
    category_type: 'want',
    is_system: true,
    is_active: true,
    children: [
      { name: 'Clothing', icon: 'Shirt', color: '#EC4899', category_type: 'want', is_system: true, is_active: true },
      { name: 'Shops', icon: 'Store', color: '#A855F7', category_type: 'want', is_system: true, is_active: true },
    ],
  },
  // Food & Drink
  {
    name: 'Food & Drink',
    icon: 'UtensilsCrossed',
    color: '#FF6B6B',
    category_type: 'need',
    is_system: true,
    is_active: true,
    children: [
      { name: 'Groceries', icon: 'ShoppingCart', color: '#10B981', category_type: 'need', is_system: true, is_active: true },
      { name: 'Restaurants', icon: 'Utensils', color: '#FF6B6B', category_type: 'want', is_system: true, is_active: true },
      { name: 'Cafes', icon: 'Coffee', color: '#92400E', category_type: 'want', is_system: true, is_active: true },
    ],
  },
  // Subscriptions
  {
    name: 'Subscriptions',
    icon: 'CreditCard',
    color: '#14B8A6',
    category_type: 'want',
    is_system: true,
    is_active: true,
  },
  // Health & Wellness
  {
    name: 'Health & Wellness',
    icon: 'Heart',
    color: '#EC4899',
    category_type: 'need',
    is_system: true,
    is_active: true,
    children: [
      { name: 'Self-care', icon: 'Sparkles', color: '#EC4899', category_type: 'want', is_system: true, is_active: true },
    ],
  },
  // Social
  {
    name: 'Social',
    icon: 'Users',
    color: '#8B5CF6',
    category_type: 'want',
    is_system: true,
    is_active: true,
    children: [
      { name: 'Entertainment', icon: 'Clapperboard', color: '#8B5CF6', category_type: 'want', is_system: true, is_active: true },
      { name: 'Gifts', icon: 'Gift', color: '#F59E0B', category_type: 'want', is_system: true, is_active: true },
    ],
  },
  // Other
  {
    name: 'Other',
    icon: 'MoreHorizontal',
    color: '#6B7280',
    category_type: 'want',
    is_system: true,
    is_active: true,
  },
  // Income (Budgetable)
  {
    name: 'Salary',
    icon: 'Wallet',
    color: '#10B981',
    category_type: 'income',
    is_system: true,
    is_active: true,
    is_budgetable: true,
  },
  // Income (Windfall)
  {
    name: 'Bonus',
    icon: 'Gift',
    color: '#F59E0B',
    category_type: 'income',
    is_system: true,
    is_active: true,
    is_budgetable: false,
  },
  {
    name: 'RSU Vest',
    icon: 'TrendingUp',
    color: '#8B5CF6',
    category_type: 'income',
    is_system: true,
    is_active: true,
    is_budgetable: false,
  },
  {
    name: 'Reimbursements',
    icon: 'Receipt',
    color: '#14B8A6',
    category_type: 'income',
    is_system: true,
    is_active: true,
    is_budgetable: false,
  },
  {
    name: 'Interest',
    icon: 'Percent',
    color: '#10B981',
    category_type: 'income',
    is_system: true,
    is_active: true,
    is_budgetable: false,
  },
  {
    name: 'ESPP',
    icon: 'Building2',
    color: '#6366F1',
    category_type: 'income',
    is_system: true,
    is_active: true,
    is_budgetable: false,
  },
  // Transfers
  {
    name: 'Credit Card Payment',
    icon: 'CreditCard',
    color: '#8B5CF6',
    category_type: 'transfer',
    is_system: true,
    is_active: true,
  },
  {
    name: 'Account Transfer',
    icon: 'ArrowLeftRight',
    color: '#6366F1',
    category_type: 'transfer',
    is_system: true,
    is_active: true,
  },
]

/**
 * Flatten hierarchical categories into a flat array for database insertion.
 * Returns [parents, children] where children have a _parentName field for linking.
 */
export type FlatCategory = Omit<CategoryInsert, 'user_id'> & { _parentName?: string }

export function flattenCategories(categories: DefaultCategoryDef[]): FlatCategory[] {
  const result: FlatCategory[] = []

  for (const parent of categories) {
    const { children, ...parentData } = parent
    result.push(parentData)

    if (children) {
      for (const child of children) {
        result.push({ ...child, _parentName: parent.name })
      }
    }
  }

  return result
}
