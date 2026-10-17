import { useEffect, useRef, useState, type PropsWithChildren } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  getSession,
  login as signIn,
  logout as signOut,
  refreshSession,
  subscribe,
} from '../lib/auth/session'
import { SessionContext } from './SessionContext'

export function SessionProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient()
  const [ready, setReady] = useState(false)
  const [user, setUser] = useState(getSession().currentUser)
  const previousIdentity = useRef(user ? `${user.id}:${user.role}` : null)

  useEffect(() => {
    const unsubscribe = subscribe(() => {
      const nextUser = getSession().currentUser
      const nextIdentity = nextUser ? `${nextUser.id}:${nextUser.role}` : null
      if (previousIdentity.current !== nextIdentity) queryClient.clear()
      previousIdentity.current = nextIdentity
      setUser(nextUser)
    })
    void refreshSession().finally(() => setReady(true))
    return unsubscribe
  }, [queryClient])

  return (
    <SessionContext.Provider
      value={{
        ready,
        user,
        login: signIn,
        logout: signOut,
      }}
    >
      {children}
    </SessionContext.Provider>
  )
}
