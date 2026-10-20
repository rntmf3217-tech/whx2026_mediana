import React from "react";
import { Navigate, Outlet, useParams } from "react-router-dom";

export function ProtectedRoute() {
  const { event } = useParams();
  const isAuthenticated = localStorage.getItem("adminAuth") === "true";

  if (!isAuthenticated) {
    const loginPath = event ? `/${event}/admin/login` : "/";
    return <Navigate to={loginPath} replace />;
  }

  return <Outlet />;
}
