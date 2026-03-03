import { useEffect, useMemo, useState } from "react";
import gateway from "../services/gateway";
import useI18n from "../i18n/useI18n";

function Dashboard() {
  const { t } = useI18n();
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setError("");
      try {
        const [ordersData, productsData] = await Promise.all([
          gateway.orders.getAll(),
          gateway.products.getAll(),
        ]);

        setOrders(ordersData || []);
        setProducts(productsData || []);
      } catch (err) {
        const apiError = err.response?.data;
        if (typeof apiError === "string" && apiError.trim()) {
          setError(apiError);
        } else {
          setError(t("dashboard.failedToLoadDashboardData"));
        }
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [t]);

  const stats = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const ordersToday = orders.filter((order) => {
      const created = new Date(order.createdAtUtc);
      return created >= startOfToday && created < endOfToday;
    });

    const totalSalesToday = ordersToday.reduce(
      (sum, order) => sum + Number(order.totalAmount || 0),
      0
    );

    const totalSalesAllTime = orders.reduce(
      (sum, order) => sum + Number(order.totalAmount || 0),
      0
    );

    const activeProducts = products.filter((p) => p.isActive).length;
    const lowStockProducts = products.filter((p) => Number(p.stockQuantity || 0) <= 10).length;

    return {
      salesToday: totalSalesToday,
      ordersToday: ordersToday.length,
      totalSales: totalSalesAllTime,
      totalOrders: orders.length,
      totalProducts: products.length,
      activeProducts,
      lowStockProducts,
    };
  }, [orders, products]);

  return (
    <div className="dashboard-grid">
      <div className="page-card dashboard-card">
        <div className="card-icon" aria-hidden="true">💰</div>
        <h2>{t("dashboard.salesToday")}</h2>
        <p className="dashboard-value">${stats.salesToday.toFixed(2)}</p>
        <p className="muted-text">{t("dashboard.ordersToday", { count: stats.ordersToday })}</p>
      </div>

      <div className="page-card dashboard-card">
        <div className="card-icon" aria-hidden="true">📈</div>
        <h2>{t("dashboard.totalSales")}</h2>
        <p className="dashboard-value">${stats.totalSales.toFixed(2)}</p>
        <p className="muted-text">{t("dashboard.allTimeCompletedSales")}</p>
      </div>

      <div className="page-card dashboard-card">
        <div className="card-icon" aria-hidden="true">🧾</div>
        <h2>{t("dashboard.totalOrders")}</h2>
        <p className="dashboard-value">{stats.totalOrders}</p>
        <p className="muted-text">{t("dashboard.allOrdersFromApi")}</p>
      </div>

      <div className="page-card dashboard-card">
        <div className="card-icon" aria-hidden="true">📦</div>
        <h2>{t("dashboard.products")}</h2>
        <p className="dashboard-value">{stats.totalProducts}</p>
        <p className="muted-text">
          {t("dashboard.activeLowStock", {
            active: stats.activeProducts,
            lowStock: stats.lowStockProducts,
          })}
        </p>
      </div>

      {(loading || error) && (
        <div className="page-card dashboard-card dashboard-status">
          {loading ? <p>{t("dashboard.loadingDashboardData")}</p> : null}
          {error ? <p className="form-error">{error}</p> : null}
        </div>
      )}
    </div>
  );
}

export default Dashboard;


