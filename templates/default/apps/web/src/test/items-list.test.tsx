import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ItemsListPage } from '@/features/items/items-list';

vi.mock('@/hooks/use-item-events', () => ({
  useItemEvents: () => undefined,
}));

vi.mock('@/features/items/api', () => ({
  useItemsQuery: () => ({
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
  }),
  useCreateItem: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useUpdateItem: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useDeleteItem: () => ({ mutateAsync: vi.fn() }),
}));

describe('ItemsListPage', () => {
  it('renders items returned by the API hook', () => {
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ItemsListPage />
        </TooltipProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByText('Test item')).toBeInTheDocument();
  });
});
