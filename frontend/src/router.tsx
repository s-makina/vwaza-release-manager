import React from 'react';
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  type RouteObject
} from 'react-router-dom';
import { AppLayout } from './ui/AppLayout';
import { RequireAuth, RequireRole, useAuth } from './auth/auth';
import { LoginPage } from './pages/LoginPage';
import { ArtistHomePage } from './pages/ArtistHomePage';
import { AdminReviewQueuePage } from './pages/AdminReviewQueuePage';
import { AdminReleaseReviewPage } from './pages/AdminReleaseReviewPage';
import { ReleaseWizardLayout } from './pages/wizard/ReleaseWizardLayout';
import { ReleaseDetailsStep } from './pages/wizard/ReleaseDetailsStep';
import { CoverArtStep } from './pages/wizard/CoverArtStep';
import { TracksStep } from './pages/wizard/TracksStep';
import { SubmitStep } from './pages/wizard/SubmitStep';
import { StatusStep } from './pages/wizard/StatusStep';

function NotFound() {
  return (
    <div className="container">
      <h2>Not found</h2>
      <p className="muted">The page you requested does not exist.</p>
    </div>
  );
}

function HomeRedirect() {
  const { token, role } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return <Navigate to={role === 'ADMIN' ? '/admin' : '/artist'} replace />;
}

const routes: RouteObject[] = [
  {
    element: <AppLayout />, 
    children: [
      { index: true, element: <HomeRedirect /> },
      { path: '/login', element: <LoginPage /> },
      {
        path: '/artist',
        element: (
          <RequireAuth>
            <Outlet />
          </RequireAuth>
        ),
        children: [
          { index: true, element: <ArtistHomePage /> },
          {
            path: 'releases/:releaseId/wizard',
            element: <ReleaseWizardLayout />, 
            children: [
              { index: true, element: <Navigate to="details" replace /> },
              { path: 'details', element: <ReleaseDetailsStep /> },
              { path: 'cover', element: <CoverArtStep /> },
              { path: 'tracks', element: <TracksStep /> },
              { path: 'submit', element: <SubmitStep /> },
              { path: 'status', element: <StatusStep /> }
            ]
          }
        ]
      },
      {
        path: '/admin',
        element: (
          <RequireRole role="ADMIN">
            <Outlet />
          </RequireRole>
        ),
        children: [
          { index: true, element: <AdminReviewQueuePage /> },
          { path: 'releases/:releaseId', element: <AdminReleaseReviewPage /> }
        ]
      },
      { path: '*', element: <NotFound /> }
    ]
  }
];

export const router = createBrowserRouter(routes);
