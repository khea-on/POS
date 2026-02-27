import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import AppIcon from "../components/common/AppIcon";
import LanguageSwitcher from "../components/common/LanguageSwitcher";
import useI18n from "../i18n/useI18n";

function Login() {
  const { t } = useI18n();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem("token")) {
      navigate("/dashboard");
    }
  }, [navigate]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/auth/login", {
        username: username.trim(),
        password,
      });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("username", res.data.username || username.trim());
      localStorage.setItem("role", res.data.role || "");
      localStorage.setItem("imageUrl", res.data.imageUrl || "");
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data || t("login.loginFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="auth-canvas">
        <form className="login-card auth-card-v2" onSubmit={handleLogin}>
          <div className="auth-top-row">
            <div className="auth-brand-block">
              <span className="auth-brand-icon">
                <AppIcon name="globe" />
              </span>
              <div>
                <h2>{t("common.appName")}</h2>
                <p>Point of Sale</p>
              </div>
            </div>
            <LanguageSwitcher />
          </div>

          <div className="auth-mode-switch" role="tablist" aria-label="Auth mode">
            <span className="auth-mode-link active">{t("login.login")}</span>
            <Link className="auth-mode-link" to="/register">{t("register.register")}</Link>
          </div>

          <div className="auth-headline">
            <h1>{t("login.login")}</h1>
            <p>{t("login.signInToContinue")}</p>
          </div>

          <label className="auth-field">
            <span className="auth-label">{t("login.username")}</span>
            <span className="auth-input-wrap">
              <AppIcon name="user" />
              <input
                placeholder={t("login.username")}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </span>
          </label>

          <label className="auth-field">
            <span className="auth-label">{t("login.password")}</span>
            <span className="auth-input-wrap">
              <AppIcon name="key" />
              <input
                type="password"
                placeholder={t("login.password")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </span>
          </label>

          {error && <p className="form-error">{error}</p>}

          <button className="btn-with-icon auth-submit-btn" type="submit" disabled={loading}>
            <AppIcon name="login" />
            {loading ? t("login.signingIn") : t("login.login")}
          </button>

          <p className="auth-switch">
            {t("login.noAccount")} <Link to="/register">{t("login.register")}</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Login;


