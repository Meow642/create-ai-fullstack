import { Link } from 'react-router';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-svh max-w-3xl flex-col items-start justify-center gap-4 px-6">
      <p className="text-sm text-muted-foreground">404</p>
      <h1 className="text-3xl font-semibold tracking-normal">Page not found</h1>
      <Button asChild>
        <Link to="/items">Go to items</Link>
      </Button>
    </main>
  );
}
