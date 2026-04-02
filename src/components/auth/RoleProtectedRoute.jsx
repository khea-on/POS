import { Navigate, useLocation } from "react-router-dom";
import { getAuthSession, getBestAvailablePath } from "../../services/authSession";

function RoleProtectedRoute({ allowedRoles, children }) {
  const session = getAuthSession();
  const { token, posRole, role } = session;
  const location = useLocation();
  const effectiveRole = posRole || role || "";

  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (!allowedRoles.includes(effectiveRole)) {
    return <Navigate to={getBestAvailablePath(session)} replace state={{ from: location }} />;
  }

  return children;
}

export default RoleProtectedRoute;
