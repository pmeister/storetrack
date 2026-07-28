import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { keyAfterLast, keyAtIndex } from '../lib/ordering'
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
        .order('position')
      if (error) throw error
      return data as Section[]
    },
  })
}

export function useAddSection(storeId: string) {
  const householdId = useHouseholdId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => {
      const existing =
        queryClient.getQueryData<Section[]>(['sections', storeId]) ?? []
      const { error } = await supabase.from('sections').insert({
        household_id: householdId,
        store_id: storeId,
        name,
        position: keyAfterLast(existing),
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

/** Move a section to a new index in walking order; optimistic. */
export function useMoveSection(storeId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, toIndex }: { id: string; toIndex: number }) => {
      const sections =
        queryClient.getQueryData<Section[]>(['sections', storeId]) ?? []
      const rest = sections.filter((s) => s.id !== id)
      const position = keyAtIndex(rest, toIndex)
      const { error } = await supabase.from('sections').update({ position }).eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, toIndex }) => {
      await queryClient.cancelQueries({ queryKey: ['sections', storeId] })
      const prev = queryClient.getQueryData<Section[]>(['sections', storeId])
      if (prev) {
        const rest = prev.filter((s) => s.id !== id)
        const moving = prev.find((s) => s.id === id)!
        const position = keyAtIndex(rest, toIndex)
        const next = [...rest]
        next.splice(toIndex, 0, { ...moving, position })
        queryClient.setQueryData(['sections', storeId], next)
      }
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['sections', storeId], ctx.prev)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['sections', storeId] }),
  })
}
