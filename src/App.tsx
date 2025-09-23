import React from 'react';
import { Navigate, createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AuthProvider } from 'contexts/AuthContext';
import { TaskProvider } from 'contexts/TaskContext';
import { ToastProvider } from 'components/common/Toast';
import ErrorBoundary from 'components/common/ErrorBoundary';
import ProtectedRoute from 'components/auth/ProtectedRoute';
import Login from 'pages/Login';
import Register from 'pages/Register';
import Dashboard from 'pages/Dashboard';
import Settings from 'pages/Settings';
import Profile from 'pages/Profile';
import AdminTeams from 'pages/AdminTeams';
import './index.css';

// Create router with future flags
const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/register", 
    element: <Register />,
  },
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute>
        <TaskProvider>
          <Dashboard />
        </TaskProvider>
      </ProtectedRoute>
    ),
  },
  {
    path: "/settings",
    element: (
      <ProtectedRoute>
        <Settings />
      </ProtectedRoute>
    ),
  },
  {
    path: "/profile",
    element: (
      <ProtectedRoute>
        <TaskProvider>
          <Profile />
        </TaskProvider>
      </ProtectedRoute>
    ),
  },
  {
    path: "/admin",
    element: (
      <ProtectedRoute>
        <AdminTeams />
      </ProtectedRoute>
    ),
  },
  {
    path: "/",
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: "*",
    element: <Navigate to="/dashboard" replace />,
  },
]);

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <div className="App">
            <RouterProvider router={router} />
          </div>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
