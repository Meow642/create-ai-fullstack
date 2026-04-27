import { createBrowserRouter, Navigate } from 'react-router';
import { ItemsDetailPage } from '@/features/items/items-detail';
import { ItemsListPage } from '@/features/items/items-list';
import { NotFoundPage } from '@/pages/not-found';

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/items" replace /> },
  { path: '/items', element: <ItemsListPage /> },
  { path: '/items/:id', element: <ItemsDetailPage /> },
  { path: '*', element: <NotFoundPage /> },
]);
