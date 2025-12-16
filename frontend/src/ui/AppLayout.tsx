import React from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '../auth/auth';

function TopNav() {
  const { token, role, logout } = useAuth();
  const navigate = useNavigate();

  const homePath = role === 'ADMIN' ? '/admin' : '/artist';

  return (
    <div className="nav">
      <Link to={homePath}>
        <strong>Vwaza</strong>
      </Link>
      <div className="row">
        {token && role === 'ADMIN' ? (
          <Link className="button" to="/admin">
            Admin
          </Link>
        ) : null}
        {token && role === 'ARTIST' ? (
          <Link className="button" to="/artist">
            Artist
          </Link>
        ) : null}
        {token ? (
          <button
            className="button"
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            Logout
          </button>
        ) : (
          <Link className="button" to="/login">
            Login
          </Link>
        )}
      </div>
    </div>
  );
}

export function AppLayout() {
  return (
    <AuthProvider>
      <TopNav />
      <Outlet />
    </AuthProvider>
  );
}
