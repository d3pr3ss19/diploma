import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { DashboardPage } from '../pages/DashboardPage';
import { LoginPage } from '../pages/LoginPage';
import { RequestsPage } from '../pages/RequestsPage';
import { SubscribersPage } from '../pages/SubscribersPage';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/subscribers" element={<SubscribersPage />} />
          <Route path="/requests" element={<RequestsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
