export type GoalCategory = {
  id: string
  goal_id: string
  category_id: string
  user_id: string
  auto_tag: boolean
  created_at: string
}

export type GoalCategoryInsert = Omit<GoalCategory, 'id' | 'created_at'> & {
  id?: string
  created_at?: string
}
