import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import AppIcon from "../components/common/AppIcon";
import LanguageSwitcher from "../components/common/LanguageSwitcher";
import useI18n from "../i18n/useI18n";

function Register() {
  const { t } = useI18n();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem("token")) {
      navigate("/dashboard");
    }
  }, [navigate]);

  const handleRegister = async (event) => {
    event.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError(t("register.passwordsDoNotMatch"));
      return;
    }

    setLoading(true);

    try {
      const cleanUsername = username.trim();
      await api.post("/auth/register", {
        username: cleanUsername,
        password,
        role: "Cashier",
        imageUrl: imageUrl.trim() || null,
      });

      const loginRes = await api.post("/auth/login", {
        username: cleanUsername,
        password,
      });

      localStorage.setItem("token", loginRes.data.token);
      localStorage.setItem("username", loginRes.data.username || cleanUsername);
      localStorage.setItem("role", loginRes.data.role || "Cashier");
      localStorage.setItem("imageUrl", loginRes.data.imageUrl || "");
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data || t("register.registerFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="auth-canvas">
        <form className="login-card auth-card-v2" onSubmit={handleRegister}>
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
            <Link className="auth-mode-link" to="/">{t("login.login")}</Link>
            <span className="auth-mode-link active">{t("register.register")}</span>
          </div>

          <div className="auth-headline">
            <h1>{t("register.createAccount")}</h1>
            <p>{t("register.registerToAccessPos")}</p>
          </div>

          <label className="auth-field">
            <span className="auth-label">{t("register.username")}</span>
            <span className="auth-input-wrap">
              <AppIcon name="user" />
              <input
                placeholder={t("register.username")}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </span>
          </label>

          <label className="auth-field">
            <span className="auth-label">{t("register.password")}</span>
            <span className="auth-input-wrap">
              <AppIcon name="key" />
              <input
                type="password"
                placeholder={t("register.password")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </span>
          </label>

          <label className="auth-field">
            <span className="auth-label">{t("register.confirmPassword")}</span>
            <span className="auth-input-wrap">
              <AppIcon name="key" />
              <input
                type="password"
                placeholder={t("register.confirmPassword")}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </span>
          </label>

          <label className="auth-field">
            <span className="auth-label">{t("register.imageUrlOptional")}</span>
            <span className="auth-input-wrap">
              <AppIcon name="link" />
              <input
                placeholder={t("register.imageUrlOptional")}
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
            </span>
          </label>

          {error && <p className="form-error">{error}</p>}

          <button className="btn-with-icon auth-submit-btn" type="submit" disabled={loading}>
            <AppIcon name="register" />
            {loading ? t("register.creatingAccount") : t("register.register")}
          </button>

          <p className="auth-switch">
            {t("register.alreadyHaveAccount")} <Link to="/">{t("register.login")}</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Register;


