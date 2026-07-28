import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { keyAfterLast } from '../lib/ordering'
import type { ListItem } from '../lib/types'

export function useListItems(storeId: string) {
  return useQuery({
    queryKey: ['list_items', storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('list_items')
        .select('*')
        .eq('store_id', storeId)
        .order('position')
      if (error) throw error
      return data as ListItem[]
    },
  })
}

export interface NewListItem {
  name: string
  sectionId: string | null
  quantity?: number
  pantryItemId?: string | null
}

export function useAddListItem(storeId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (item: ListItem) => {
      const { error } = await supabase.from('list_items').insert({
        id: item.id,
        household_id: item.household_id,
        store_id: item.store_id,
        section_id: item.section_id,
        pantry_item_id: item.pantry_item_id,
        name: item.name,
        quantity: item.quantity,
        position: item.position,
      })
      if (error) throw error
    },
    onMutate: async (item) => {
      await queryClient.cancelQueries({ queryKey: ['list_items', storeId] })
      const prev = queryClient.getQueryData<ListItem[]>(['list_items', storeId])
      queryClient.setQueryData<ListItem[]>(['list_items', storeId], (old) => [
        ...(old ?? []),
        item,
      ])
      return { prev }
    },
    onError: (_err, _item, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['list_items', storeId], ctx.prev)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['list_items'] }),
  })
}

/** Builds a full ListItem row (client-generated id + position) for useAddListItem. */
export function buildListItem(
  householdId: string,
  storeId: string,
  existing: ListItem[],
  input: NewListItem,
): ListItem {
  const inSection = existing
    .filter((i) => i.section_id === input.sectionId)
    .sort((a, b) => (a.position < b.position ? -1 : 1))
  return {
    id: crypto.randomUUID(),
    household_id: householdId,
    store_id: storeId,
    section_id: input.sectionId,
    pantry_item_id: input.pantryItemId ?? null,
    name: input.name,
    quantity: input.quantity ?? 1,
    checked: false,
    position: keyAfterLast(inSection),
  }
}

export function useToggleListItem(storeId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, checked }: { id: string; checked: boolean }) => {
      const { error } = await supabase.from('list_items').update({ checked }).eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, checked }) => {
      await queryClient.cancelQueries({ queryKey: ['list_items', storeId] })
      const prev = queryClient.getQueryData<ListItem[]>(['list_items', storeId])
      queryClient.setQueryData<ListItem[]>(['list_items', storeId], (old) =>
        old?.map((i) => (i.id === id ? { ...i, checked } : i)),
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['list_items', storeId], ctx.prev)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['list_items'] }),
  })
}

export function useRenameListItem(storeId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from('list_items').update({ name }).eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, name }) => {
      await queryClient.cancelQueries({ queryKey: ['list_items', storeId] })
      const prev = queryClient.getQueryData<ListItem[]>(['list_items', storeId])
      queryClient.setQueryData<ListItem[]>(['list_items', storeId], (old) =>
        old?.map((i) => (i.id === id ? { ...i, name } : i)),
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['list_items', storeId], ctx.prev)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['list_items'] }),
  })
}

/** Reassign an item to a section (null = Unsorted), appended at that section's end. */
export function useMoveListItem(storeId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, sectionId }: { id: string; sectionId: string | null }) => {
      const items = queryClient.getQueryData<ListItem[]>(['list_items', storeId]) ?? []
      const inTarget = items
        .filter((i) => i.section_id === sectionId && i.id !== id)
        .sort((a, b) => (a.position < b.position ? -1 : 1))
      const { error } = await supabase
        .from('list_items')
        .update({ section_id: sectionId, position: keyAfterLast(inTarget) })
        .eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, sectionId }) => {
      await queryClient.cancelQueries({ queryKey: ['list_items', storeId] })
      const prev = queryClient.getQueryData<ListItem[]>(['list_items', storeId])
      queryClient.setQueryData<ListItem[]>(['list_items', storeId], (old) =>
        old?.map((i) => (i.id === id ? { ...i, section_id: sectionId } : i)),
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['list_items', storeId], ctx.prev)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['list_items'] }),
  })
}

export function useDeleteListItem(storeId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('list_items').delete().eq('id', id)
      if (error) throw error
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['list_items', storeId] })
      const prev = queryClient.getQueryData<ListItem[]>(['list_items', storeId])
      queryClient.setQueryData<ListItem[]>(['list_items', storeId], (old) =>
        old?.filter((i) => i.id !== id),
      )
      return { prev }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['list_items', storeId], ctx.prev)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['list_items'] }),
  })
}

/** Uncheck every checked item for the store, resetting the list for the next trip. */
export function useUncheckAll(storeId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('list_items')
        .update({ checked: false })
        .eq('store_id', storeId)
        .eq('checked', true)
      if (error) throw error
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['list_items', storeId] })
      const prev = queryClient.getQueryData<ListItem[]>(['list_items', storeId])
      queryClient.setQueryData<ListItem[]>(['list_items', storeId], (old) =>
        old?.map((i) => ({ ...i, checked: false })),
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['list_items', storeId], ctx.prev)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['list_items'] }),
  })
}
