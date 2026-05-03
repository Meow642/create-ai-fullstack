import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { ApiError, ItemIdParams } from '../common/schema';
import {
  CreateItemPayload,
  ItemDto,
  ListItemsQuery,
  PaginatedItems,
  UpdateItemPayload,
} from './schema';

const itemsPath = '/items';
const itemPath = '/items/{id}';
type ItemApiOperation = 'list' | 'create' | 'detail' | 'update' | 'delete';
type ItemApiContractMap = Record<ItemApiOperation, RouteConfig>;

export const itemApiPaths = {
  list: itemsPath,
  create: itemsPath,
  detail: (id: number) => itemPath.replace('{id}', String(id)),
  update: (id: number) => itemPath.replace('{id}', String(id)),
  delete: (id: number) => itemPath.replace('{id}', String(id)),
} as const;

export const itemApiExpressPaths = {
  list: toExpressPath(itemsPath),
  create: toExpressPath(itemsPath),
  detail: toExpressPath(itemPath),
  update: toExpressPath(itemPath),
  delete: toExpressPath(itemPath),
} as const;

export const itemApiContracts = {
  list: {
    method: 'get',
    path: itemsPath,
    summary: '查询 item 列表',
    description: '按创建时间倒序返回 item，支持分页和标题关键词搜索。',
    tags: ['Item 管理'],
    request: {
      query: ListItemsQuery,
    },
    responses: {
      200: {
        description: 'item 列表',
        content: { 'application/json': { schema: PaginatedItems } },
      },
      400: {
        description: '查询参数无效',
        content: { 'application/json': { schema: ApiError } },
      },
    },
  },
  create: {
    method: 'post',
    path: itemsPath,
    summary: '创建 item',
    description: '创建一个新的 item，并通过 WebSocket 广播 item.created 通知。',
    tags: ['Item 管理'],
    request: {
      body: {
        content: { 'application/json': { schema: CreateItemPayload } },
      },
    },
    responses: {
      201: {
        description: '创建成功的 item',
        content: { 'application/json': { schema: ItemDto } },
      },
      400: {
        description: '请求体无效',
        content: { 'application/json': { schema: ApiError } },
      },
    },
  },
  detail: {
    method: 'get',
    path: itemPath,
    summary: '查询 item',
    description: '根据 ID 返回单个 item。',
    tags: ['Item 管理'],
    request: {
      params: ItemIdParams,
    },
    responses: {
      200: {
        description: 'item 详情',
        content: { 'application/json': { schema: ItemDto } },
      },
      404: {
        description: 'Item 不存在',
        content: { 'application/json': { schema: ApiError } },
      },
    },
  },
  update: {
    method: 'patch',
    path: itemPath,
    summary: '更新 item',
    description: '更新现有 item 的标题。',
    tags: ['Item 管理'],
    request: {
      params: ItemIdParams,
      body: {
        content: { 'application/json': { schema: UpdateItemPayload } },
      },
    },
    responses: {
      200: {
        description: '更新后的 item',
        content: { 'application/json': { schema: ItemDto } },
      },
      400: {
        description: '请求体无效',
        content: { 'application/json': { schema: ApiError } },
      },
      404: {
        description: 'Item 不存在',
        content: { 'application/json': { schema: ApiError } },
      },
    },
  },
  delete: {
    method: 'delete',
    path: itemPath,
    summary: '删除 item',
    description: '根据 ID 删除现有 item。',
    tags: ['Item 管理'],
    request: {
      params: ItemIdParams,
    },
    responses: {
      204: {
        description: '删除成功',
      },
      404: {
        description: 'Item 不存在',
        content: { 'application/json': { schema: ApiError } },
      },
    },
  },
} satisfies ItemApiContractMap;

function toExpressPath(path: string) {
  return path.replace(/\{([^}]+)\}/g, ':$1');
}
