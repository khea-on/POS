import { Navigate, useLocation } from "react-router-dom";
import {
  getAppHomePath,
  getAuthSession,
  getBestAvailablePath,
  hasAppAccess,
  hasModuleAccess,
} from "../../services/authSession";

function ModuleAccessRoute({ app, module, children }) {
  const location = useLocation();
  const session = getAuthSession();

  if (!session.token) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  if (!hasAppAccess(app, session)) {
    return <Navigate to={getBestAvailablePath(session)} replace state={{ from: location }} />;
  }

  if (!hasModuleAccess(app, module, session)) {
    return <Navigate to={getAppHomePath(app, session)} replace state={{ from: location }} />;
  }

  return children;
}

export default ModuleAccessRoute;
