import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import LanguageSwitcher from "../common/LanguageSwitcher";
import AppIcon from "../common/AppIcon";
import useI18n from "../../i18n/useI18n";

const menuItems = [
  { labelKey: "nav.dashboard", to: "/dashboard", icon: "dashboard", roles: ["Admin", "Cashier"] },
  { labelKey: "nav.item", to: "/pos", icon: "item", roles: ["Admin", "Cashier"] },
  { labelKey: "nav.productManagement", to: "/product-management", icon: "product", roles: ["Admin"] },
  { labelKey: "nav.reports", to: "/reports", icon: "reports", roles: ["Admin"] },
  { labelKey: "nav.settings", to: "/settings", icon: "settings", roles: ["Admin", "Cashier"] },
];

function MainLayout() {
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [profileImage, setProfileImage] = useState(localStorage.getItem("imageUrl") || "");
  const [theme, setTheme] = useState(
    localStorage.getItem("theme") === "light" ? "light" : "dark"
  );
  const userRole = localStorage.getItem("role") || "Cashier";

  const visibleMenuItems = useMemo(
    () => menuItems.filter((item) => item.roles.includes(userRole)),
    [userRole]
  );

  useEffect(() => {
    const syncProfile = () => setProfileImage(localStorage.getItem("imageUrl") || "");
    window.addEventListener("storage", syncProfile);
    window.addEventListener("user-profile-updated", syncProfile);
    return () => {
      window.removeEventListener("storage", syncProfile);
      window.removeEventListener("user-profile-updated", syncProfile);
    };
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const pageTitle = useMemo(() => {
    const current = visibleMenuItems.find((item) => item.to === location.pathname);
    return current ? t(current.labelKey) : t("nav.pos");
  }, [location.pathname, t, visibleMenuItems]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("role");
    localStorage.removeItem("imageUrl");
    navigate("/");
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const renderMenuIcon = (iconName) => {
    if (iconName === "dashboard") {
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3" y="3" width="8" height="8" rx="1.5" />
          <rect x="13" y="3" width="8" height="5" rx="1.5" />
          <rect x="13" y="10" width="8" height="11" rx="1.5" />
          <rect x="3" y="13" width="8" height="8" rx="1.5" />
        </svg>
      );
    }

    if (iconName === "item") {
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 8.5 12 4l8 4.5-8 4.5L4 8.5Z" />
          <path d="M4 8.5V16l8 4.5 8-4.5V8.5" />
          <path d="M12 13v7.5" />
        </svg>
      );
    }

    if (iconName === "product") {
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3.5 8.5 12 3l8.5 5.5v7L12 21l-8.5-5.5v-7Z" />
          <path d="M12 3v18" />
          <path d="M3.5 8.5 12 14l8.5-5.5" />
        </svg>
      );
    }

    if (iconName === "reports") {
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M5 20V10" />
          <path d="M12 20V5" />
          <path d="M19 20v-7" />
          <path d="M3 20h18" />
        </svg>
      );
    }

    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="3.2" />
        <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a1.5 1.5 0 0 1-1.1 2.5h-.1a1 1 0 0 0-.9.6l-.1.2a1.5 1.5 0 0 1-2.7 0l-.1-.2a1 1 0 0 0-.9-.6h-.1a1.5 1.5 0 0 1-1.4-1 .9.9 0 0 0-.8-.6h-.3a.9.9 0 0 0-.8.6 1.5 1.5 0 0 1-1.4 1h-.1a1 1 0 0 0-.9.6l-.1.2a1.5 1.5 0 0 1-2.7 0l-.1-.2a1 1 0 0 0-.9-.6h-.1a1.5 1.5 0 0 1-1.1-2.5l.1-.1A1 1 0 0 0 4.6 15a.9.9 0 0 0-.9-.6h-.2a1.5 1.5 0 0 1 0-3h.2a.9.9 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1A1.5 1.5 0 0 1 5.4 7h.1a1 1 0 0 0 .9-.6l.1-.2a1.5 1.5 0 0 1 2.7 0l.1.2a1 1 0 0 0 .9.6h.1a1.5 1.5 0 0 1 1.4 1 .9.9 0 0 0 .8.6h.3a.9.9 0 0 0 .8-.6 1.5 1.5 0 0 1 1.4-1h.1a1 1 0 0 0 .9-.6l.1-.2a1.5 1.5 0 0 1 2.7 0l.1.2a1 1 0 0 0 .9.6h.1a1.5 1.5 0 0 1 1.1 2.5l-.1.1a1 1 0 0 0-.2 1.1.9.9 0 0 0 .9.6h.2a1.5 1.5 0 0 1 0 3h-.2a.9.9 0 0 0-.9.6Z" />
      </svg>
    );
  };

  return (
    <div className="stardark-shell">
      <aside className={`stardark-sidebar ${isMenuOpen ? "open" : "collapsed"}`}>
        <div className="sidebar-top">
          <div className="brand">{t("common.appName")}</div>
          <button
            className="sidebar-close"
            type="button"
            onClick={() => setIsMenuOpen(false)}
            aria-label={t("common.closeSidebar")}
          >
            <AppIcon name="close" />
          </button>
        </div>
        <nav className="stardark-nav">
          {visibleMenuItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `menu-link ${isActive ? "active" : ""}`}
              onClick={() => window.innerWidth <= 760 && setIsMenuOpen(false)}
            >
              <span className="menu-link-content">
                <span className="menu-link-icon" aria-hidden="true">
                  {renderMenuIcon(item.icon)}
                </span>
                <span>{t(item.labelKey)}</span>
              </span>
            </NavLink>
          ))}
        </nav>
      </aside>
      {isMenuOpen && (
        <button
          className="sidebar-backdrop"
          type="button"
          onClick={() => setIsMenuOpen(false)}
          aria-label={t("common.closeMenu")}
        />
      )}

      <section className="stardark-main">
        <header className="stardark-navbar">
          <button
            className="menu-toggle"
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-label={isMenuOpen ? t("common.closeMenu") : t("common.openMenu")}
            title={isMenuOpen ? t("common.closeMenu") : t("common.openMenu")}
          >
            <AppIcon name={isMenuOpen ? "close" : "menu"} className="menu-icon" />
          </button>
          <h1>{pageTitle}</h1>
          <div className="nav-actions">
            <LanguageSwitcher />
            <button
              className="theme-toggle"
              type="button"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? t("common.light") : t("common.dark")}
              title={theme === "dark" ? t("common.light") : t("common.dark")}
            >
              <AppIcon name={theme === "dark" ? "sun" : "moon"} />
              {theme === "dark" ? t("common.light") : t("common.dark")}
            </button>
            {profileImage ? (
              <img className="user-avatar" src={profileImage} alt="User avatar" />
            ) : (
              <div className="user-avatar user-avatar-fallback">
                {(localStorage.getItem("username") || "U").slice(0, 1).toUpperCase()}
              </div>
            )}
            <button className="logout-btn btn-with-icon" type="button" onClick={handleLogout}>
              <AppIcon name="logout" />
              {t("common.logout")}
            </button>
          </div>
        </header>

        <main className="page-content">
          <Outlet />
        </main>
      </section>
    </div>
  );
}

export default MainLayout;


