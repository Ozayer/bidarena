import { create } from 'zustand'
import { api } from '../api/client'

export interface AuthUser {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  role: 'super_admin' | 'tournament_admin' | 'team_owner'
  phone_number: string
}

interface AuthState {
  token: string | null
  user: AuthUser | null
  status: 'idle' | 'loading' | 'ready'
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  loadUser: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem('authToken'),
  user: null,
  status: 'idle',

  login: async (username, password) => {
    const { data } = await api.post('auth/login/', { username, password })
    localStorage.setItem('authToken', data.token)
    set({ token: data.token })
    await get().loadUser()
  },

  logout: () => {
    localStorage.removeItem('authToken')
    set({ token: null, user: null })
  },

  loadUser: async () => {
    const token = get().token
    if (!token) {
      set({ status: 'ready' })
      return
    }
    set({ status: 'loading' })
    try {
      const { data } = await api.get('auth/me/')
      set({ user: data, status: 'ready' })
    } catch {
      localStorage.removeItem('authToken')
      set({ token: null, user: null, status: 'ready' })
    }
  },
}))
