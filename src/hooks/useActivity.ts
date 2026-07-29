import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useHouseholdId } from './useAuth'

export interface ChangeEvent {
  op: 'INSERT' | 'UPDATE' | 'DELETE'
  table: 'stores' | 'sections' | 'list_items'
  record: Record<string, unknown> | null
  old_record: Record<string, unknown> | null
  at: string
}

const PAGE_SIZE = 300

/**
 * Reads the materialized activity log. This is a plain indexed query, so it
 * renders immediately — and TanStack's persisted cache means repeat visits
 * paint before the network even answers.
 */
export function useActivity() {
  const householdId = useHouseholdId()
  return useQuery({
    queryKey: ['activity', householdId],
    queryFn: async (): Promise<ChangeEvent[]> => {
      const { data, error } = await supabase
        .from('activity_events')
        .select('op, table_name, record, old_record, at')
        .order('at', { ascending: false })
        .limit(PAGE_SIZE)
      if (error) throw error
      return (data as { op: string; table_name: string; record: never; old_record: never; at: string }[]).map(
        (row) => ({
          op: row.op as ChangeEvent['op'],
          table: row.table_name as ChangeEvent['table'],
          record: row.record,
          old_record: row.old_record,
          at: row.at,
        }),
      )
    },
  })
}

/**
 * Pulls anything new off the Kafka topic into the table. Cheap when there's
 * nothing pending, since the consumer resumes from its committed offset.
 */
export function useDrainActivity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (): Promise<number> => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) throw new Error('not signed in')
      const res = await fetch('/api/audit-log', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`)
      const { drained } = (await res.json()) as { drained: number }
      return drained
    },
    onSuccess: (drained) => {
      if (drained > 0) queryClient.invalidateQueries({ queryKey: ['activity'] })
    },
  })
}
