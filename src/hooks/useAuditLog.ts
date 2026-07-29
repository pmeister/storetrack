import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface ChangeEvent {
  op: 'INSERT' | 'UPDATE' | 'DELETE'
  table: 'stores' | 'sections' | 'list_items'
  record: Record<string, unknown> | null
  old_record: Record<string, unknown> | null
  at: string
}

export function useAuditLog() {
  return useQuery({
    queryKey: ['audit-log'],
    staleTime: 15_000,
    queryFn: async (): Promise<ChangeEvent[]> => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) throw new Error('not signed in')
      const res = await fetch('/api/audit-log', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(`audit log unavailable (${res.status}): ${body}`)
      }
      const { events } = (await res.json()) as { events: ChangeEvent[] }
      return events
    },
  })
}
