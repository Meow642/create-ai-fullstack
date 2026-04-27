import { Link, useParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { parseServerTime } from '@/lib/api';
import { useItemQuery } from './api';

export function ItemsDetailPage() {
  const id = Number(useParams().id);
  const itemQuery = useItemQuery(id);

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-3xl flex-col gap-6 px-6 py-8">
      <Button asChild variant="outline" className="w-fit">
        <Link to="/items">返回</Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>{itemQuery.data?.title ?? 'Item 详情'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {itemQuery.isLoading ? <p className="text-sm text-muted-foreground">加载中...</p> : null}
          {itemQuery.isError ? <p className="text-sm text-destructive">未找到 item。</p> : null}
          {itemQuery.data ? (
            <>
              <p className="text-sm text-muted-foreground">ID: {itemQuery.data.id}</p>
              <p className="text-sm text-muted-foreground">
                创建时间：{parseServerTime(itemQuery.data.createdAt).toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">
                更新时间：{parseServerTime(itemQuery.data.updatedAt).toLocaleString()}
              </p>
            </>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
