import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { byPosition, generateKeyBetween, generateNKeysBetween, keyAfterLast } from '../lib/ordering'
import type { Section } from '../lib/types'
import { useHouseholdId } from './useAuth'

export function useSections(storeId: string) {
  return useQuery({
    queryKey: ['sections', storeId],
    enabled: storeId !== '',
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sections')
        .select('*')
        .eq('store_id', storeId)
      if (error) throw error
      return (data as Section[]).sort(byPosition)
    },
  })
}

export function useAddSection(storeId: string) {
  const householdId = useHouseholdId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => {
      // Read current positions from the server, not the cache — rapid adds
      // against a stale cache used to mint duplicate keys.
      const { data: rows, error: posError } = await supabase
        .from('sections')
        .select('position')
        .eq('store_id', storeId)
      if (posError) throw posError
      const { error } = await supabase.from('sections').insert({
        household_id: householdId,
        store_id: storeId,
        name,
        position: keyAfterLast(rows),
      })
      if (error) throw error
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['sections', storeId] }),
  })
}

export function useRenameSection(storeId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from('sections').update({ name }).eq('id', id)
      if (error) throw error
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['sections', storeId] }),
  })
}

export function useDeleteSection(storeId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sections').delete().eq('id', id)
      if (error) throw error
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['sections', storeId] })
      // items in the deleted section fall back to Unsorted (FK set null)
      queryClient.invalidateQueries({ queryKey: ['list_items'] })
    },
  })
}

export interface MoveSectionArgs {
  movedId: string
  /** The full section list in its new walking order. */
  newOrder: Section[]
}

/** Persist a drag-reorder; optimistic. Self-repairs bad position keys. */
export function useMoveSection(storeId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ movedId, newOrder }: MoveSectionArgs) => {
      const index = newOrder.findIndex((s) => s.id === movedId)
      const before = index > 0 ? newOrder[index - 1].position : null
      const after = index < newOrder.length - 1 ? newOrder[index + 1].position : null

      const otherKeys = newOrder.filter((s) => s.id !== movedId).map((s) => s.position)
      const hasDuplicates = new Set(otherKeys).size !== otherKeys.length
      const neighborsOrdered = before === null || after === null || before < after

      if (!hasDuplicates && neighborsOrdered) {
        const { error } = await supabase
          .from('sections')
          .update({ position: generateKeyBetween(before, after) })
          .eq('id', movedId)
        if (error) throw error
        return
      }

      // Keys are duplicated or out of order (possible from older app
      // versions): rewrite every section's key in the new order.
      const keys = generateNKeysBetween(null, null, newOrder.length)
      const results = await Promise.all(
        newOrder.map((section, i) =>
          supabase.from('sections').update({ position: keys[i] }).eq('id', section.id),
        ),
      )
      const failed = results.find((r) => r.error)
      if (failed?.error) throw failed.error
    },
    onMutate: async ({ newOrder }) => {
      await queryClient.cancelQueries({ queryKey: ['sections', storeId] })
      const prev = queryClient.getQueryData<Section[]>(['sections', storeId])
      queryClient.setQueryData(['sections', storeId], newOrder)
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['sections', storeId], ctx.prev)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['sections', storeId] }),
  })
}
