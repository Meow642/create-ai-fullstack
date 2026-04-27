import { toast } from 'sonner';
import { type ItemDto } from '@workspace/shared';
import { queryClient, useWebSocket } from '@/lib/api';
import { itemsKeys } from '@/features/items/api';

type ItemCreatedMessage = {
  type: 'item.created';
  data: ItemDto;
};

export function useItemEvents() {
  useWebSocket('/ws/notifications', {
    onMessage: (message) => {
      if (isItemCreatedMessage(message)) {
        toast.success('已创建 item', { description: message.data.title });
        queryClient.invalidateQueries({ queryKey: itemsKeys.all });
      }
    },
  });
}

function isItemCreatedMessage(message: unknown): message is ItemCreatedMessage {
  return (
    typeof message === 'object' &&
    message !== null &&
    'type' in message &&
    message.type === 'item.created'
  );
}
