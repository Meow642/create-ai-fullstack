import { useMutation, useQuery } from '@tanstack/react-query';
import type {
  CreateItemPayload,
  ItemDto,
  ListItemsQuery,
  Paginated,
  UpdateItemPayload,
} from '@workspace/shared';
import { http, queryClient } from '@/lib/api';

export const itemsKeys = {
  all: ['items'] as const,
  list: (query: ListItemsQuery) => [...itemsKeys.all, query] as const,
  detail: (id: number) => [...itemsKeys.all, 'detail', id] as const,
};

export function useItemsQuery(query: ListItemsQuery) {
  return useQuery({
    queryKey: itemsKeys.list(query),
    queryFn: () => http.get<Paginated<ItemDto>>('/items', { params: query }),
  });
}

export function useItemQuery(id: number) {
  return useQuery({
    queryKey: itemsKeys.detail(id),
    queryFn: () => http.get<ItemDto>(`/items/${id}`),
  });
}

export function useCreateItem() {
  return useMutation({
    mutationFn: (payload: CreateItemPayload) => http.post<ItemDto>('/items', payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: itemsKeys.all }),
  });
}

export function useUpdateItem(id: number) {
  return useMutation({
    mutationFn: (payload: UpdateItemPayload) => http.patch<ItemDto>(`/items/${id}`, payload),
    onSuccess: (item) => {
      queryClient.setQueryData(itemsKeys.detail(id), item);
      queryClient.invalidateQueries({ queryKey: itemsKeys.all });
    },
  });
}

export function useDeleteItem() {
  return useMutation({
    mutationFn: (id: number) => http.delete(`/items/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: itemsKeys.all }),
  });
}
