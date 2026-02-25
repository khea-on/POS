import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

function Dashboard() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setError("");
      try {
        const [ordersRes, productsRes] = await Promise.all([
          api.get("/orders"),
          api.get("/products"),
        ]);

        setOrders(ordersRes.data || []);
        setProducts(productsRes.data || []);
      } catch (err) {
        const apiError = err.response?.data;
        if (typeof apiError === "string" && apiError.trim()) {
          setError(apiError);
        } else {
          setError("Failed to load dashboard data.");
        }
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

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
        <h2>Sales Today</h2>
        <p className="dashboard-value">${stats.salesToday.toFixed(2)}</p>
        <p className="muted-text">{stats.ordersToday} orders today</p>
      </div>

      <div className="page-card dashboard-card">
        <div className="card-icon" aria-hidden="true">📈</div>
        <h2>Total Sales</h2>
        <p className="dashboard-value">${stats.totalSales.toFixed(2)}</p>
        <p className="muted-text">All-time completed sales</p>
      </div>

      <div className="page-card dashboard-card">
        <div className="card-icon" aria-hidden="true">🧾</div>
        <h2>Total Orders</h2>
        <p className="dashboard-value">{stats.totalOrders}</p>
        <p className="muted-text">All orders from API</p>
      </div>

      <div className="page-card dashboard-card">
        <div className="card-icon" aria-hidden="true">📦</div>
        <h2>Products</h2>
        <p className="dashboard-value">{stats.totalProducts}</p>
        <p className="muted-text">
          {stats.activeProducts} active, {stats.lowStockProducts} low stock
        </p>
      </div>

      {(loading || error) && (
        <div className="page-card dashboard-card dashboard-status">
          {loading ? <p>Loading dashboard data...</p> : null}
          {error ? <p className="form-error">{error}</p> : null}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
