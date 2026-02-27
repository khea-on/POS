import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import useI18n from "../i18n/useI18n";
import AppIcon from "../components/common/AppIcon";

function Settings() {
  const { t } = useI18n();
  const [imageUrl, setImageUrl] = useState(localStorage.getItem("imageUrl") || "");
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadSettingsData = useCallback(async () => {
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
        setError(t("settings.failedToLoadSettingsData"));
      }
    } finally {
      setDataLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadSettingsData();
  }, [loadSettingsData]);

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
      setMessage(t("settings.userImageUpdated"));
    } catch (err) {
      setError(err.response?.data || t("settings.failedToUpdateUserImage"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-card">
      <h2>{t("settings.title")}</h2>
      <div className="settings-grid">
        <div className="page-card settings-card">
          <h3>{t("settings.companyName")}</h3>
          <p className="dashboard-value">StarDark POS</p>
          <p className="muted-text">{t("settings.systemEnvironment")}</p>
        </div>

        <div className="page-card settings-card">
          <h3>{t("settings.taxConfiguration")}</h3>
          <p className="dashboard-value">{stats.todayTaxRate.toFixed(2)}%</p>
          <p className="muted-text">
            {t("settings.todayEffectiveTax", { allTime: stats.allTimeTaxRate.toFixed(2) })}
          </p>
        </div>

        <div className="page-card settings-card">
          <h3>{t("settings.userManagement")}</h3>
          {typeof profile?.usersCount === "number" ? (
            <>
              <p className="dashboard-value">{profile.usersCount}</p>
              <p className="muted-text">
                {t("settings.adminsCurrent", {
                  admins: profile?.adminsCount ?? 0,
                  username: profile?.username || "-",
                })}
              </p>
            </>
          ) : (
            <>
              <p className="dashboard-value">{t("settings.restricted")}</p>
              <p className="muted-text">{t("settings.adminOnlyTotals")}</p>
            </>
          )}
        </div>

        <div className="page-card settings-card">
          <h3>{t("settings.inventorySummary")}</h3>
          <p className="dashboard-value">{stats.totalProducts}</p>
          <p className="muted-text">
            {t("settings.activeLowStock", {
              active: stats.activeProducts,
              lowStock: stats.lowStockProducts,
            })}
          </p>
        </div>

        <div className="page-card settings-card">
          <h3>{t("settings.security")}</h3>
          <p className="dashboard-value">{t("settings.enabled")}</p>
          <p className="muted-text">
            {t("settings.securityDescription")}
          </p>
        </div>
      </div>

      <div className="settings-image-section">
        <h3>{t("settings.userImage")}</h3>
        <input
          placeholder="https://example.com/avatar.jpg"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
        />
        <button
          className="primary-btn btn-with-icon"
          type="button"
          onClick={handleSaveImage}
          disabled={loading}
        >
          <AppIcon name="save" />
          {loading ? t("common.saving") : t("settings.saveUserImage")}
        </button>
        {message ? <p className="success-text">{message}</p> : null}
        {error ? <p className="form-error">{error}</p> : null}
        {dataLoading ? <p className="muted-text">{t("settings.loadingSettingsData")}</p> : null}
      </div>
    </div>
  );
}

export default Settings;


