import { createContext, useContext } from 'react'
import type { CurrentUser } from '../lib/auth/session'

export type SessionContextValue = {
  ready: boolean
  user: CurrentUser | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

export const SessionContext = createContext<SessionContextValue | null>(null)

export function useSession() {
  const session = useContext(SessionContext)
  if (!session) throw new Error('SessionProvider is required')
  return session
}
