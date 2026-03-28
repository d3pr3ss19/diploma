import type { ReactElement } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { readAuth } from '../app/auth-storage';

export function RequireAuth({ children }: { children: ReactElement }) {
  const location = useLocation();
  const auth = readAuth();

  if (!auth?.accessToken) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
