import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ItemsListPage } from '@/features/items/items-list';

const apiMock = vi.hoisted(() => ({
  useItemsQuery: vi.fn(),
  createItem: { isPending: false, mutateAsync: vi.fn() },
  updateItem: { isPending: false, mutateAsync: vi.fn() },
  deleteItem: { mutateAsync: vi.fn() },
}));

vi.mock('@/hooks/use-item-events', () => ({
  useItemEvents: () => undefined,
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn() },
}));

vi.mock('@/features/items/api', () => ({
  useItemsQuery: apiMock.useItemsQuery,
  useCreateItem: () => apiMock.createItem,
  useUpdateItem: () => apiMock.updateItem,
  useDeleteItem: () => apiMock.deleteItem,
}));

describe('ItemsListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMock.createItem.mutateAsync.mockReset();
    apiMock.updateItem.mutateAsync.mockReset();
    apiMock.deleteItem.mutateAsync.mockReset();
    apiMock.useItemsQuery.mockReturnValue({
      data: {
        total: 1,
        limit: 10,
        offset: 0,
        items: [
          {
            id: 1,
            title: 'Test item',
            createdAt: '2026-04-27 00:00:00',
            updatedAt: '2026-04-27 00:00:00',
          },
        ],
      },
      isLoading: false,
      isError: false,
    });
  });

  it('renders items returned by the API hook', () => {
    renderPage();

    expect(screen.getByText('Test item')).toBeInTheDocument();
    expect(screen.getByText('共 1 条')).toBeInTheDocument();
  });

  it('renders loading, error, and empty states', () => {
    apiMock.useItemsQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });
    const { rerender } = renderPage();

    expect(screen.getByText('加载中...')).toBeInTheDocument();
    expect(screen.getByText('暂无结果')).toBeInTheDocument();

    apiMock.useItemsQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Load failed'),
    });
    rerender(wrapPage());
    expect(screen.getByText('Load failed')).toBeInTheDocument();

    apiMock.useItemsQuery.mockReturnValue({
      data: { total: 0, limit: 10, offset: 0, items: [] },
      isLoading: false,
      isError: false,
    });
    rerender(wrapPage());
    expect(screen.getByText('还没有 item。')).toBeInTheDocument();
    expect(screen.getByText('共 0 条')).toBeInTheDocument();
  });

  it('updates search and pagination query state', async () => {
    const user = userEvent.setup();
    apiMock.useItemsQuery.mockReturnValue({
      data: {
        total: 21,
        limit: 10,
        offset: 0,
        items: [
          {
            id: 1,
            title: 'Test item',
            createdAt: '2026-04-27 00:00:00',
            updatedAt: '2026-04-27 00:00:00',
          },
        ],
      },
      isLoading: false,
      isError: false,
    });
    renderPage();

    await user.type(screen.getByPlaceholderText('搜索 item'), 'abc');
    expect(apiMock.useItemsQuery).toHaveBeenLastCalledWith({
      limit: 10,
      offset: 0,
      q: 'abc',
    });

    await user.click(screen.getByRole('button', { name: '下一页' }));
    expect(apiMock.useItemsQuery).toHaveBeenLastCalledWith({
      limit: 10,
      offset: 10,
      q: 'abc',
    });

    await user.click(screen.getByRole('button', { name: '上一页' }));
    expect(apiMock.useItemsQuery).toHaveBeenLastCalledWith({
      limit: 10,
      offset: 0,
      q: 'abc',
    });
  });

  it('creates and edits items through the dialog', async () => {
    const user = userEvent.setup();
    apiMock.createItem.mutateAsync.mockResolvedValue(undefined);
    apiMock.updateItem.mutateAsync.mockResolvedValue(undefined);
    renderPage();

    await user.click(screen.getByRole('button', { name: /新建 item/ }));
    await user.type(screen.getByLabelText('标题'), 'New item');
    await user.click(screen.getByRole('button', { name: '保存' }));
    await waitFor(() => {
      expect(apiMock.createItem.mutateAsync).toHaveBeenCalledWith({ title: 'New item' });
    });

    await user.click(screen.getByRole('button', { name: '编辑' }));
    await user.clear(screen.getByLabelText('标题'));
    await user.type(screen.getByLabelText('标题'), 'Updated item');
    await user.click(screen.getByRole('button', { name: '保存' }));
    await waitFor(() => {
      expect(apiMock.updateItem.mutateAsync).toHaveBeenCalledWith({ title: 'Updated item' });
    });

    await user.click(screen.getByRole('button', { name: '编辑' }));
    await user.click(screen.getByRole('button', { name: '取消' }));
  });

  it('deletes an item from the table', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: '删除' }));
    expect(apiMock.deleteItem.mutateAsync).toHaveBeenCalledWith(1);
  });

  it('handles mutation failures without crashing', async () => {
    const user = userEvent.setup();
    apiMock.createItem.mutateAsync.mockRejectedValue(new Error('Create failed'));
    apiMock.deleteItem.mutateAsync.mockRejectedValue(new Error('Delete failed'));
    renderPage();

    await user.click(screen.getByRole('button', { name: /新建 item/ }));
    await user.type(screen.getByLabelText('标题'), 'Broken item');
    await user.click(screen.getByRole('button', { name: '保存' }));
    await waitFor(() => {
      expect(apiMock.createItem.mutateAsync).toHaveBeenCalledWith({ title: 'Broken item' });
    });
    await user.click(screen.getByRole('button', { name: '取消' }));

    await user.click(screen.getByRole('button', { name: '删除' }));
    await waitFor(() => {
      expect(apiMock.deleteItem.mutateAsync).toHaveBeenCalledWith(1);
    });
  });
});

function renderPage() {
  return render(wrapPage());
}

function wrapPage() {
  return (
    <QueryClientProvider client={new QueryClient()}>
      <TooltipProvider>
        <ItemsListPage />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
