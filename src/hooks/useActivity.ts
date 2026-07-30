import { useQuery } from '@tanstack/react-query'
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
 * Reads the activity log, which a database trigger fills as changes happen.
 * A plain indexed query, so it paints immediately — and useRealtime keeps it
 * current without polling.
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
      return (
        data as { op: string; table_name: string; record: never; old_record: never; at: string }[]
      ).map((row) => ({
        op: row.op as ChangeEvent['op'],
        table: row.table_name as ChangeEvent['table'],
        record: row.record,
        old_record: row.old_record,
        at: row.at,
      }))
    },
  })
}
