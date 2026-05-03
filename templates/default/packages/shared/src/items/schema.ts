import { z } from '../zod';
import { Paginated } from '../common/schema';

export const ItemDto = z
  .object({
    id: z.number().int().positive().meta({
      description: 'Item 的唯一 ID。',
      example: 1,
    }),
    title: z.string().min(1).max(200).meta({
      description: 'Item 标题，长度为 1 到 200 个字符。',
      example: '第一个 item',
    }),
    createdAt: z.string().meta({
      description: '由 SQLite datetime() 生成的 UTC 时间字符串，格式为 YYYY-MM-DD HH:mm:ss。',
      example: '2026-04-27 00:00:00',
    }),
    updatedAt: z.string().meta({
      description: '由 SQLite datetime() 生成的 UTC 时间字符串，格式为 YYYY-MM-DD HH:mm:ss。',
      example: '2026-04-27 00:00:00',
    }),
  })
  .meta({ id: 'Item', description: 'API 返回的演示 item。' });
export type ItemDto = z.infer<typeof ItemDto>;

export const CreateItemPayload = z.object({
  title: z.string().trim().min(1).max(200).meta({
    description: 'Item 标题，长度为 1 到 200 个字符。',
    example: '第一个 item',
  }),
});
export type CreateItemPayload = z.infer<typeof CreateItemPayload>;

export const UpdateItemPayload = z.object({
  title: z.string().trim().min(1).max(200).optional().meta({
    description: '新的 item 标题。省略该字段时保留当前标题。',
    example: '更新后的 item',
  }),
});
export type UpdateItemPayload = z.infer<typeof UpdateItemPayload>;

export const ListItemsQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20).meta({
    description: '本次最多返回的 item 数量。',
    example: 20,
  }),
  offset: z.coerce.number().int().min(0).default(0).meta({
    description: '分页偏移量，从 0 开始。',
    example: 0,
  }),
  q: z.string().trim().optional().meta({
    description: '可选的标题搜索关键词。',
    example: '第一',
  }),
});
export type ListItemsQuery = z.infer<typeof ListItemsQuery>;

export const PaginatedItems = Paginated(ItemDto);
export type PaginatedItems = z.infer<typeof PaginatedItems>;
