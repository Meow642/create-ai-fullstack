import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { ItemDto } from '@workspace/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useItemEvents } from '@/hooks/use-item-events';
import { ApiError } from '@/lib/api';
import { useCreateItem, useDeleteItem, useItemsQuery, useUpdateItem } from './api';
import { ItemsFormDialog } from './items-form-dialog';
import { ItemsTable } from './items-table';

const pageSize = 10;

export function ItemsListPage() {
  useItemEvents();
  const [q, setQ] = useState('');
  const [offset, setOffset] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemDto | undefined>();
  const query = useMemo(() => ({ limit: pageSize, offset, q: q || undefined }), [offset, q]);
  const itemsQuery = useItemsQuery(query);
  const createItem = useCreateItem();
  const updateItem = useUpdateItem(editingItem?.id ?? 0);
  const deleteItem = useDeleteItem();

  const data = itemsQuery.data;
  const canGoBack = offset > 0;
  const canGoNext = data ? offset + pageSize < data.total : false;

  const submitItem = async (payload: { title: string }) => {
    try {
      if (editingItem) {
        await updateItem.mutateAsync(payload);
      } else {
        await createItem.mutateAsync(payload);
      }
      setDialogOpen(false);
      setEditingItem(undefined);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Failed to save item');
    }
  };

  const removeItem = async (id: number) => {
    try {
      await deleteItem.mutateAsync(id);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Failed to delete item');
    }
  };

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-6xl flex-col gap-6 px-6 py-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Fullstack demo</p>
          <h1 className="text-3xl font-semibold tracking-normal">Items</h1>
        </div>
        <ItemsFormDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setEditingItem(undefined);
          }}
          item={editingItem}
          isPending={createItem.isPending || updateItem.isPending}
          onSubmit={submitItem}
        />
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Inventory</CardTitle>
          <CardDescription>Create, search, edit, and delete items.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search items"
              value={q}
              onChange={(event) => {
                setQ(event.target.value);
                setOffset(0);
              }}
            />
          </div>

          {itemsQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading...</p> : null}
          {itemsQuery.isError ? (
            <p className="text-sm text-destructive">
              {itemsQuery.error instanceof Error ? itemsQuery.error.message : 'Failed to load items'}
            </p>
          ) : null}
          {data && data.items.length === 0 ? (
            <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
              No items yet.
            </p>
          ) : null}
          {data && data.items.length > 0 ? (
            <ItemsTable
              items={data.items}
              onEdit={(item) => {
                setEditingItem(item);
                setDialogOpen(true);
              }}
              onDelete={removeItem}
            />
          ) : null}

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {data ? `${data.total} total` : 'No results loaded'}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={!canGoBack}
                onClick={() => setOffset(Math.max(0, offset - pageSize))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                disabled={!canGoNext}
                onClick={() => setOffset(offset + pageSize)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
