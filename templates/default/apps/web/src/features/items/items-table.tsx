import { Edit, Trash2 } from 'lucide-react';
import type { ItemDto } from '@workspace/shared';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { parseServerTime } from '@/lib/api';

type Props = {
  items: ItemDto[];
  onEdit: (item: ItemDto) => void;
  onDelete: (id: number) => void;
};

export function ItemsTable({ items, onEdit, onDelete }: Props) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="w-28 text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="font-medium">{item.title}</TableCell>
            <TableCell className="text-muted-foreground">
              {parseServerTime(item.createdAt).toLocaleString()}
            </TableCell>
            <TableCell>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => onEdit(item)}>
                  <Edit className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Delete"
                  onClick={() => onDelete(item.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
