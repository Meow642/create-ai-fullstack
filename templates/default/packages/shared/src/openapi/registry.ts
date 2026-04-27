import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { ApiError, ItemIdParams } from '../common/schema';
import {
  CreateItemPayload,
  ItemDto,
  ListItemsQuery,
  PaginatedItems,
  UpdateItemPayload,
} from '../items/schema';

export const registry = new OpenAPIRegistry();

registry.register('ApiError', ApiError);
registry.register('Item', ItemDto);
registry.register('CreateItemPayload', CreateItemPayload);
registry.register('UpdateItemPayload', UpdateItemPayload);
registry.register('ListItemsQuery', ListItemsQuery);
registry.register('ItemIdParams', ItemIdParams);
registry.register('PaginatedItems', PaginatedItems);
