import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Save } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { CreateItemPayload, ItemDto } from '@workspace/shared';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: ItemDto;
  isPending: boolean;
  onSubmit: (payload: CreateItemPayload) => void;
};

export function ItemsFormDialog({ open, onOpenChange, item, isPending, onSubmit }: Props) {
  const form = useForm<CreateItemPayload>({
    resolver: zodResolver(CreateItemPayload),
    defaultValues: { title: item?.title ?? '' },
  });

  useEffect(() => {
    form.reset({ title: item?.title ?? '' });
  }, [form, item, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {!item ? (
        <DialogTrigger asChild>
          <Button>
            <Plus className="size-4" />
            新建 item
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? '编辑 item' : '新建 item'}</DialogTitle>
          <DialogDescription>标题建议简短、明确。</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((payload) => onSubmit(payload))}
        >
          <div className="space-y-2">
            <Label htmlFor="title">标题</Label>
            <Input id="title" {...form.register('title')} autoFocus />
            {form.formState.errors.title ? (
              <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={isPending}>
              <Save className="size-4" />
              保存
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
