import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { keyAfterLast } from '../lib/ordering'
import type { ListItem, Store } from '../lib/types'
import { useHouseholdId } from './useAuth'

export function useStores() {
  const householdId = useHouseholdId()
  return useQuery({
    queryKey: ['stores', householdId],
    queryFn: async () => {
      const { data, error } = await supabase.from('stores').select('*').order('position')
      if (error) throw error
      return data as Store[]
    },
  })
}

/** Map of store_id -> number of unchecked items, for badges on store cards. */
export function useUncheckedCounts() {
  const householdId = useHouseholdId()
  return useQuery({
    queryKey: ['list_items', 'counts', householdId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('list_items')
        .select('store_id')
        .eq('checked', false)
      if (error) throw error
      const counts: Record<string, number> = {}
      for (const row of data as Pick<ListItem, 'store_id'>[]) {
        counts[row.store_id] = (counts[row.store_id] ?? 0) + 1
      }
      return counts
    },
  })
}

export function useAddStore() {
  const householdId = useHouseholdId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => {
      const existing =
        queryClient.getQueryData<Store[]>(['stores', householdId]) ?? []
      const { error } = await supabase.from('stores').insert({
        household_id: householdId,
        name,
        position: keyAfterLast(existing),
      })
      if (error) throw error
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['stores'] }),
  })
}

export function useRenameStore() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from('stores').update({ name }).eq('id', id)
      if (error) throw error
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['stores'] }),
  })
}

export function useDeleteStore() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('stores').delete().eq('id', id)
      if (error) throw error
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['stores'] }),
  })
}
