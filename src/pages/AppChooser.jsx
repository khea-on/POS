import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppIcon from "../components/common/AppIcon";
import useI18n from "../i18n/useI18n";
import {
  CRM_APP,
  POS_APP,
  getAppHomePath,
  getAuthSession,
  setActiveApp,
} from "../services/authSession";

function AppChooser() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const session = getAuthSession();

  useEffect(() => {
    if (!session.token) {
      navigate("/");
      return;
    }

    if (session.allowedApps.length === 1) {
      const nextApp = session.allowedApps[0];
      setActiveApp(nextApp);
      navigate(getAppHomePath(nextApp, session), { replace: true });
    }
  }, [navigate, session.allowedApps, session.token]);

  const handleOpenApp = (app) => {
    setActiveApp(app);
    navigate(getAppHomePath(app, session));
  };

  return (
    <div className="login-page">
      <div className="auth-canvas">
        <div className="login-card auth-card-v2 app-chooser-card">
          <div className="auth-headline">
            <h1>{t("appChooser.title")}</h1>
            <p>{t("appChooser.subtitle")}</p>
          </div>

          <div className="app-chooser-grid">
            {session.allowedApps.includes(POS_APP) ? (
              <button
                className="app-chooser-option"
                type="button"
                onClick={() => handleOpenApp(POS_APP)}
              >
                <span className="app-chooser-icon">
                  <AppIcon name="dashboard" />
                </span>
                <strong>{t("appChooser.openPos")}</strong>
                <span>{t("appChooser.posDescription")}</span>
              </button>
            ) : null}

            {session.allowedApps.includes(CRM_APP) ? (
              <button
                className="app-chooser-option"
                type="button"
                onClick={() => handleOpenApp(CRM_APP)}
              >
                <span className="app-chooser-icon">
                  <AppIcon name="crm" />
                </span>
                <strong>{t("appChooser.openCrm")}</strong>
                <span>{t("appChooser.crmDescription")}</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AppChooser;
