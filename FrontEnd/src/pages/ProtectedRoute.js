// ProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  // If there's no token, redirect to login
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  // Otherwise, render children (the protected route)
  return children;
};

export default ProtectedRoute;
