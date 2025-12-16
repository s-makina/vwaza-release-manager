import React from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '../auth/auth';

function TopNav() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="nav">
      <Link to="/artist">
        <strong>Vwaza</strong>
      </Link>
      <div className="row">
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
