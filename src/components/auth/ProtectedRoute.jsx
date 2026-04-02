import { Navigate } from "react-router-dom";
import { getAuthSession } from "../../services/authSession";

function ProtectedRoute({ children }) {
  const { token } = getAuthSession();
  if (!token) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;
