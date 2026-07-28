import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { keyAfterLast } from '../lib/ordering'
import type { PantryItem } from '../lib/types'
import { useHouseholdId } from './useAuth'

export function usePantry() {
  const householdId = useHouseholdId()
  return useQuery({
    queryKey: ['pantry', householdId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pantry_items')
        .select('*')
        .order('name')
      if (error) throw error
      return data as PantryItem[]
    },
  })
}

export function useAddPantryItem() {
  const householdId = useHouseholdId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from('pantry_items').insert({
        household_id: householdId,
        name,
      })
      if (error) throw error
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['pantry'] }),
  })
}

export function useUpdatePantryItem() {
  const householdId = useHouseholdId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<PantryItem> & { id: string }) => {
      const { error } = await supabase.from('pantry_items').update(patch).eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, ...patch }) => {
      await queryClient.cancelQueries({ queryKey: ['pantry', householdId] })
      const prev = queryClient.getQueryData<PantryItem[]>(['pantry', householdId])
      queryClient.setQueryData<PantryItem[]>(['pantry', householdId], (old) =>
        old?.map((i) => (i.id === id ? { ...i, ...patch } : i)),
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['pantry', householdId], ctx.prev)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['pantry'] }),
  })
}

export function useDeletePantryItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('pantry_items').delete().eq('id', id)
      if (error) throw error
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['pantry'] }),
  })
}

export interface AddToListArgs {
  item: PantryItem
  storeId: string
  sectionId: string | null
}

export interface AddToListResult {
  status: 'already-listed' | 'restored' | 'added'
  storeId: string
}

/**
 * Push a pantry item onto a store's shopping list and remember the
 * store/section as the item's default for next time. If the item already
 * has an unchecked list entry it reports that instead of duplicating; if
 * its only entry is checked (still "in cart"), that entry is restored to
 * the active list rather than inserting a second row.
 */
export function useAddPantryItemToList() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ item, storeId, sectionId }: AddToListArgs): Promise<AddToListResult> => {
      const { data: linked, error: linkedError } = await supabase
        .from('list_items')
        .select('id, checked, store_id')
        .eq('pantry_item_id', item.id)
      if (linkedError) throw linkedError

      const unchecked = linked.find((row) => !row.checked)
      if (unchecked) return { status: 'already-listed', storeId: unchecked.store_id }

      const inCart = linked.find((row) => row.checked)
      if (inCart) {
        const { error } = await supabase
          .from('list_items')
          .update({ checked: false })
          .eq('id', inCart.id)
        if (error) throw error
        return { status: 'restored', storeId: inCart.store_id }
      }

      const { data: rows, error: posError } = await supabase
        .from('list_items')
        .select('position')
        .eq('store_id', storeId)
      if (posError) throw posError

      const { error } = await supabase.from('list_items').insert({
        household_id: item.household_id,
        store_id: storeId,
        section_id: sectionId,
        pantry_item_id: item.id,
        name: item.name,
        position: keyAfterLast(rows),
      })
      if (error) throw error

      if (item.default_store_id !== storeId || item.default_section_id !== sectionId) {
        await supabase
          .from('pantry_items')
          .update({ default_store_id: storeId, default_section_id: sectionId })
          .eq('id', item.id)
      }
      return { status: 'added', storeId }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['list_items'] })
      queryClient.invalidateQueries({ queryKey: ['pantry'] })
    },
  })
}
