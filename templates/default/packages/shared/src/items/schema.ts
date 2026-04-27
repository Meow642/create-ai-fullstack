import { z } from '../zod';
import { Paginated } from '../common/schema';

export const ItemDto = z
  .object({
    id: z.number().int().positive(),
    title: z.string().min(1).max(200),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .meta({ id: 'Item', description: 'Demo item returned by the API.' });
export type ItemDto = z.infer<typeof ItemDto>;

export const CreateItemPayload = z.object({
  title: z.string().trim().min(1).max(200),
});
export type CreateItemPayload = z.infer<typeof CreateItemPayload>;

export const UpdateItemPayload = z.object({
  title: z.string().trim().min(1).max(200).optional(),
});
export type UpdateItemPayload = z.infer<typeof UpdateItemPayload>;

export const ListItemsQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  q: z.string().trim().optional(),
});
export type ListItemsQuery = z.infer<typeof ListItemsQuery>;

export const PaginatedItems = Paginated(ItemDto);
export type PaginatedItems = z.infer<typeof PaginatedItems>;
