import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { authenticatedFetch } from '../auth/session'

export function useNotificationStream(userId: number | undefined) {
  const cache = useQueryClient()
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!userId) return
    const controller = new AbortController()

    async function connect() {
      while (!controller.signal.aborted) {
        try {
          const response = await authenticatedFetch('/api/v1/notifications/stream', {
            signal: controller.signal,
            headers: { Accept: 'text/event-stream' },
            cache: 'no-store',
          })
          if (!response.ok || !response.body) throw new Error('notification_stream_unavailable')
          setConnected(true)
          await cache.invalidateQueries({ queryKey: ['notifications'] })
          const reader = response.body.getReader()
          const decoder = new TextDecoder()
          let buffer = ''
          while (!controller.signal.aborted) {
            const { value, done } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })
            let end = buffer.indexOf('\n\n')
            while (end >= 0) {
              const event = buffer.slice(0, end)
              buffer = buffer.slice(end + 2)
              if (event.startsWith('event: notification\n'))
                await cache.invalidateQueries({ queryKey: ['notifications'] })
              end = buffer.indexOf('\n\n')
            }
          }
        } catch {
          // The next attempt uses the current in-memory token and guarded GET refresh flow.
        } finally {
          if (!controller.signal.aborted) setConnected(false)
        }
        if (!controller.signal.aborted) await new Promise((resolve) => setTimeout(resolve, 2000))
      }
    }

    void connect()
    return () => {
      controller.abort()
      setConnected(false)
    }
  }, [cache, userId])

  return connected
}
