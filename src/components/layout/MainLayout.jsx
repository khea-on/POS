import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

const menuItems = [
  { label: "Dashboard", to: "/dashboard", roles: ["Admin", "Cashier"] },
  { label: "Item", to: "/pos", roles: ["Admin", "Cashier"] },
  { label: "Product Management", to: "/product-management", roles: ["Admin"] },
  { label: "Reports", to: "/reports", roles: ["Admin"] },
  { label: "Settings", to: "/settings", roles: ["Admin", "Cashier"] },
];

function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [profileImage, setProfileImage] = useState(localStorage.getItem("imageUrl") || "");
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

  const pageTitle = useMemo(() => {
    const current = visibleMenuItems.find((item) => item.to === location.pathname);
    return current ? current.label : "POS";
  }, [location.pathname, visibleMenuItems]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("role");
    localStorage.removeItem("imageUrl");
    navigate("/");
  };

  return (
    <div className="stardark-shell">
      <aside className={`stardark-sidebar ${isMenuOpen ? "open" : "collapsed"}`}>
        <div className="sidebar-top">
          <div className="brand">POS</div>
          <button
            className="sidebar-close"
            type="button"
            onClick={() => setIsMenuOpen(false)}
            aria-label="Close sidebar"
          >
            x
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
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      {isMenuOpen && <button className="sidebar-backdrop" type="button" onClick={() => setIsMenuOpen(false)} aria-label="Close menu" />}

      <section className="stardark-main">
        <header className="stardark-navbar">
          <button
            className="menu-toggle"
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            title={isMenuOpen ? "Close menu" : "Open menu"}
          >
            {isMenuOpen ? (
              <span className="menu-icon" aria-hidden="true">
                x
              </span>
            ) : (
              <span className="menu-icon" aria-hidden="true">
                |||
              </span>
            )}
          </button>
          <h1>{pageTitle}</h1>
          <div className="nav-actions">
            {profileImage ? (
              <img className="user-avatar" src={profileImage} alt="User avatar" />
            ) : (
              <div className="user-avatar user-avatar-fallback">
                {(localStorage.getItem("username") || "U").slice(0, 1).toUpperCase()}
              </div>
            )}
            <button className="logout-btn" type="button" onClick={handleLogout}>
              Logout
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
