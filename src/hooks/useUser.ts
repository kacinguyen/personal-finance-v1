import { useAuth } from '../contexts/AuthContext'

export function useUser() {
  const { user, loading } = useAuth()

  return {
    userId: user?.id ?? null,
    email: user?.email ?? null,
    isAuthenticated: !!user,
    loading,
  }
}
