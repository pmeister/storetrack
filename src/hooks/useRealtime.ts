import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

const TABLE_TO_KEY: Record<string, string> = {
  stores: 'stores',
  sections: 'sections',
  list_items: 'list_items',
  pantry_items: 'pantry',
}

/**
 * One channel per household: any change made by another device invalidates
 * the matching queries. Purely additive — refetch-on-focus still covers
 * the case where the socket is down.
 */
export function useRealtime(householdId: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const channel = supabase.channel(`household-${householdId}`)
    for (const [table, key] of Object.entries(TABLE_TO_KEY)) {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: `household_id=eq.${householdId}`,
        },
        () => queryClient.invalidateQueries({ queryKey: [key] }),
      )
    }
    channel.subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [householdId, queryClient])
}
