import type { Category as DBCategory } from '../types/category'
import type { UICategory } from '../types/category'
import { getIcon } from './iconMap'

/**
 * Convert database category to UI category
 */
export function dbCategoryToUI(category: DBCategory): UICategory {
  return {
    id: category.id,
    icon: getIcon(category.icon),
    name: category.name,
    color: category.color,
    category_type: category.category_type,
    parent_id: category.parent_id,
  }
}
