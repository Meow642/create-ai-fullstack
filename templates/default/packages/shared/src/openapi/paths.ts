import { ApiError, ItemIdParams } from '../common/schema';
import {
  CreateItemPayload,
  ItemDto,
  ListItemsQuery,
  PaginatedItems,
  UpdateItemPayload,
} from '../items/schema';
import { registry } from './registry';

registry.registerPath({
  method: 'get',
  path: '/items',
  request: {
    query: ListItemsQuery,
  },
  responses: {
    200: {
      description: 'Items list',
      content: { 'application/json': { schema: PaginatedItems } },
    },
    400: {
      description: 'Invalid query',
      content: { 'application/json': { schema: ApiError } },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/items',
  request: {
    body: {
      content: { 'application/json': { schema: CreateItemPayload } },
    },
  },
  responses: {
    201: {
      description: 'Created item',
      content: { 'application/json': { schema: ItemDto } },
    },
    400: {
      description: 'Invalid payload',
      content: { 'application/json': { schema: ApiError } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/items/{id}',
  request: {
    params: ItemIdParams,
  },
  responses: {
    200: {
      description: 'Item',
      content: { 'application/json': { schema: ItemDto } },
    },
    404: {
      description: 'Item not found',
      content: { 'application/json': { schema: ApiError } },
    },
  },
});

registry.registerPath({
  method: 'patch',
  path: '/items/{id}',
  request: {
    params: ItemIdParams,
    body: {
      content: { 'application/json': { schema: UpdateItemPayload } },
    },
  },
  responses: {
    200: {
      description: 'Updated item',
      content: { 'application/json': { schema: ItemDto } },
    },
    400: {
      description: 'Invalid payload',
      content: { 'application/json': { schema: ApiError } },
    },
    404: {
      description: 'Item not found',
      content: { 'application/json': { schema: ApiError } },
    },
  },
});

registry.registerPath({
  method: 'delete',
  path: '/items/{id}',
  request: {
    params: ItemIdParams,
  },
  responses: {
    204: {
      description: 'Deleted item',
    },
    404: {
      description: 'Item not found',
      content: { 'application/json': { schema: ApiError } },
    },
  },
});
