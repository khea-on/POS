import { Navigate, useLocation } from "react-router-dom";

function RoleProtectedRoute({ allowedRoles, children }) {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role") || "";
  const location = useLocation();

  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (!allowedRoles.includes(role)) {
    return <Navigate to="/dashboard" replace state={{ from: location }} />;
  }

  return children;
}

export default RoleProtectedRoute;
