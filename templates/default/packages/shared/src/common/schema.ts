import { z } from '../zod';

export const ApiError = z.object({
  error: z.string().meta({
    description: '面向用户或调用方展示的错误信息。',
    example: 'Item 不存在',
  }),
});
export type ApiError = z.infer<typeof ApiError>;

export const ItemIdParams = z.object({
  id: z.coerce.number().int().positive().meta({
    description: 'Item 的唯一 ID。',
    example: 1,
  }),
});
export type ItemIdParams = z.infer<typeof ItemIdParams>;

export function Paginated<T extends z.ZodType>(itemSchema: T) {
  return z.object({
    total: z.number().int().min(0),
    limit: z.number().int().min(1),
    offset: z.number().int().min(0),
    items: z.array(itemSchema),
  });
}

export type Paginated<T> = {
  total: number;
  limit: number;
  offset: number;
  items: T[];
};
