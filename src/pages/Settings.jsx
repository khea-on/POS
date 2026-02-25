import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

function Settings() {
  const [imageUrl, setImageUrl] = useState(localStorage.getItem("imageUrl") || "");
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadSettingsData = async () => {
    setDataLoading(true);
    setError("");

    try {
      const [meRes, ordersRes, productsRes] = await Promise.all([
        api.get("/auth/me"),
        api.get("/orders"),
        api.get("/products"),
      ]);

      setProfile(meRes.data || null);
      setOrders(ordersRes.data || []);
      setProducts(productsRes.data || []);
    } catch (err) {
      const apiError = err.response?.data;
      if (typeof apiError === "string" && apiError.trim()) {
        setError(apiError);
      } else {
        setError("Failed to load settings data.");
      }
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    loadSettingsData();
  }, []);

  const stats = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const todayOrders = orders.filter((order) => {
      const created = new Date(order.createdAtUtc);
      return created >= startOfToday && created < endOfToday;
    });

    const calcTaxPercent = (orderList) => {
      const subtotal = orderList.reduce((sum, o) => sum + Number(o.subtotal || 0), 0);
      const tax = orderList.reduce((sum, o) => sum + Number(o.taxAmount || 0), 0);
      if (subtotal <= 0) {
        return 0;
      }
      return (tax / subtotal) * 100;
    };

    return {
      totalProducts: products.length,
      activeProducts: products.filter((p) => p.isActive).length,
      lowStockProducts: products.filter((p) => Number(p.stockQuantity || 0) <= 10).length,
      todayTaxRate: calcTaxPercent(todayOrders),
      allTimeTaxRate: calcTaxPercent(orders),
    };
  }, [orders, products]);

  const handleSaveImage = async () => {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await api.put("/auth/profile-image", {
        imageUrl: imageUrl.trim() || null,
      });
      localStorage.setItem("imageUrl", res.data.imageUrl || "");
      window.dispatchEvent(new Event("user-profile-updated"));
      setMessage("User image updated.");
    } catch (err) {
      setError(err.response?.data || "Failed to update user image.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-card">
      <h2>Settings</h2>
      <div className="settings-grid">
        <div className="page-card settings-card">
          <h3>Company Name</h3>
          <p className="dashboard-value">StarDark POS</p>
          <p className="muted-text">System environment: Production-ready local setup</p>
        </div>

        <div className="page-card settings-card">
          <h3>Tax Configuration</h3>
          <p className="dashboard-value">{stats.todayTaxRate.toFixed(2)}%</p>
          <p className="muted-text">
            Today effective tax | All-time: {stats.allTimeTaxRate.toFixed(2)}%
          </p>
        </div>

        <div className="page-card settings-card">
          <h3>User Management</h3>
          {typeof profile?.usersCount === "number" ? (
            <>
              <p className="dashboard-value">{profile.usersCount}</p>
              <p className="muted-text">
                Admins: {profile?.adminsCount ?? 0} | Current: {profile?.username || "-"}
              </p>
            </>
          ) : (
            <>
              <p className="dashboard-value">Restricted</p>
              <p className="muted-text">Only Admin can view user/account totals.</p>
            </>
          )}
        </div>

        <div className="page-card settings-card">
          <h3>Inventory Summary</h3>
          <p className="dashboard-value">{stats.totalProducts}</p>
          <p className="muted-text">
            Active: {stats.activeProducts} | Low stock: {stats.lowStockProducts}
          </p>
        </div>

        <div className="page-card settings-card">
          <h3>Security</h3>
          <p className="dashboard-value">Enabled</p>
          <p className="muted-text">
            JWT auth, role-based access controls, password complexity checks, and masked payment
            references for sensitive data protection.
          </p>
        </div>
      </div>

      <div className="settings-image-section">
        <h3>User Image</h3>
        <input
          placeholder="https://example.com/avatar.jpg"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
        />
        <button
          className="primary-btn"
          type="button"
          onClick={handleSaveImage}
          disabled={loading}
        >
          {loading ? "Saving..." : "Save User Image"}
        </button>
        {message ? <p className="success-text">{message}</p> : null}
        {error ? <p className="form-error">{error}</p> : null}
        {dataLoading ? <p className="muted-text">Loading settings data...</p> : null}
      </div>
    </div>
  );
}

export default Settings;
