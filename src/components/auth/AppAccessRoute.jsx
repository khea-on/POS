import { Navigate, useLocation } from "react-router-dom";
import { getAuthSession, getBestAvailablePath, hasAppAccess } from "../../services/authSession";

function AppAccessRoute({ app, children }) {
  const location = useLocation();
  const session = getAuthSession();

  if (!session.token) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  if (!hasAppAccess(app, session)) {
    return <Navigate to={getBestAvailablePath(session)} replace state={{ from: location }} />;
  }

  return children;
}

export default AppAccessRoute;
