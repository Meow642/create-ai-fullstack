export type {
  ApiError as ApiErrorBody,
  CreateItemPayload,
  ItemDto,
  ListItemsQuery,
  Paginated,
  UpdateItemPayload,
} from '@workspace/shared';

export class ApiError extends Error {
  public readonly status: number | undefined;
  public readonly raw: unknown;

  constructor(message: string, status: number | undefined, raw: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.raw = raw;
  }
}
