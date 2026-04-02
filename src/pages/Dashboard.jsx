import { useEffect, useMemo, useState } from "react";
import gateway from "../services/gateway";
import useI18n from "../i18n/useI18n";
import { formatUsdAsKhr } from "../utils/currency";

const LINE_CHART_WIDTH = 700;
const LINE_CHART_HEIGHT = 220;
const CHART_PADDING = {
  top: 18,
  right: 16,
  bottom: 30,
  left: 48,
};

const toLocalDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toArray = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (value && typeof value === "object") {
    if (Array.isArray(value.items)) {
      return value.items;
    }
    if (Array.isArray(value.data)) {
      return value.data;
    }
    if (Array.isArray(value.results)) {
      return value.results;
    }
    if (Array.isArray(value.$values)) {
      return value.$values;
    }
  }

  return [];
};

function Dashboard() {
  const { language, t } = useI18n();
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

        setOrders(toArray(ordersData));
        setProducts(toArray(productsData));
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

    const activeProducts = products.filter((product) => product.isActive).length;
    const lowStockProducts = products.filter((product) => Number(product.stockQuantity || 0) <= 10).length;

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

  const salesTrend = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayBuckets = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(startOfToday);
      date.setDate(startOfToday.getDate() - (6 - index));
      return {
        key: toLocalDateKey(date),
        label: date.toLocaleDateString(undefined, { weekday: "short" }),
        sales: 0,
        orders: 0,
      };
    });

    const bucketMap = new Map(dayBuckets.map((day) => [day.key, day]));
    orders.forEach((order) => {
      const created = new Date(order.createdAtUtc);
      if (Number.isNaN(created.getTime())) {
        return;
      }
      const key = toLocalDateKey(created);
      const bucket = bucketMap.get(key);
      if (!bucket) {
        return;
      }

      bucket.sales += Number(order.totalAmount || 0);
      bucket.orders += 1;
    });

    return dayBuckets;
  }, [orders]);

  const lineChartData = useMemo(() => {
    const maxSales = Math.max(1, ...salesTrend.map((day) => day.sales));
    const plotWidth = LINE_CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
    const plotHeight = LINE_CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;
    const lastIndex = Math.max(1, salesTrend.length - 1);

    const points = salesTrend.map((day, index) => {
      const x = CHART_PADDING.left + (plotWidth * index) / lastIndex;
      const y = CHART_PADDING.top + (1 - day.sales / maxSales) * plotHeight;
      return {
        ...day,
        x,
        y,
      };
    });

    const linePath = points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");

    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];
    const baselineY = LINE_CHART_HEIGHT - CHART_PADDING.bottom;
    const areaPath = [
      `${firstPoint?.x ?? CHART_PADDING.left},${baselineY}`,
      linePath,
      `${lastPoint?.x ?? CHART_PADDING.left},${baselineY}`,
    ].join(" ");

    return {
      points,
      linePath,
      areaPath,
      maxSales,
      baselineY,
    };
  }, [salesTrend]);

  const statusBreakdown = useMemo(() => {
    const counts = {
      paid: 0,
      pending: 0,
      cancelled: 0,
    };

    orders.forEach((order) => {
      const status = Number(order.status || 0);
      if (status === 2) {
        counts.paid += 1;
        return;
      }
      if (status === 1) {
        counts.pending += 1;
        return;
      }
      if (status === 3) {
        counts.cancelled += 1;
      }
    });

    const total = orders.length;
    const segments = [
      {
        key: "paid",
        label: t("pos.statusPaid"),
        count: counts.paid,
        color: "var(--dashboard-status-paid)",
      },
      {
        key: "pending",
        label: t("pos.statusPending"),
        count: counts.pending,
        color: "var(--dashboard-status-pending)",
      },
      {
        key: "cancelled",
        label: t("pos.statusCancelled"),
        count: counts.cancelled,
        color: "var(--dashboard-status-cancelled)",
      },
    ];

    let runningPercent = 0;
    const gradientStops = segments
      .filter((segment) => segment.count > 0)
      .map((segment) => {
        const start = runningPercent;
        const end = start + (segment.count / (total || 1)) * 100;
        runningPercent = end;
        return `${segment.color} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
      });

    const donutBackground = gradientStops.length > 0
      ? `conic-gradient(${gradientStops.join(", ")})`
      : "conic-gradient(#7f8894 0% 100%)";

    return {
      total,
      segments,
      donutBackground,
    };
  }, [orders, t]);

  return (
    <div className="dashboard-grid">
      <div className="page-card dashboard-card">
        <div className="card-icon" aria-hidden="true">💰</div>
        <h2>{t("dashboard.salesToday")}</h2>
        <p className="dashboard-value">{formatUsdAsKhr(stats.salesToday, language)}</p>
        <p className="muted-text">{t("dashboard.ordersToday", { count: stats.ordersToday })}</p>
      </div>

      <div className="page-card dashboard-card">
        <div className="card-icon" aria-hidden="true">📈</div>
        <h2>{t("dashboard.totalSales")}</h2>
        <p className="dashboard-value">{formatUsdAsKhr(stats.totalSales, language)}</p>
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

      <div className="page-card dashboard-chart-card">
        <div className="dashboard-chart-head">
          <h2>{t("dashboard.salesTrendTitle")}</h2>
          <p className="muted-text">{t("dashboard.salesTrendSubtitle")}</p>
        </div>

        {salesTrend.every((day) => day.sales <= 0) ? (
          <p className="muted-text">{t("dashboard.noChartData")}</p>
        ) : (
          <div className="dashboard-line-chart">
            <svg
              className="dashboard-line-svg"
              viewBox={`0 0 ${LINE_CHART_WIDTH} ${LINE_CHART_HEIGHT}`}
              role="img"
              aria-label={t("dashboard.salesTrendTitle")}
            >
              <defs>
                <linearGradient id="dashboardLineAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--dashboard-line-fill-start)" />
                  <stop offset="100%" stopColor="var(--dashboard-line-fill-end)" />
                </linearGradient>
              </defs>

              <line
                x1={CHART_PADDING.left}
                y1={lineChartData.baselineY}
                x2={LINE_CHART_WIDTH - CHART_PADDING.right}
                y2={lineChartData.baselineY}
                stroke="var(--border)"
                strokeWidth="1"
              />

              <polyline
                fill="url(#dashboardLineAreaGradient)"
                points={lineChartData.areaPath}
              />

              <polyline
                fill="none"
                stroke="var(--accent)"
                strokeWidth="3"
                strokeLinejoin="round"
                strokeLinecap="round"
                points={lineChartData.linePath}
              />

              {lineChartData.points.map((point) => (
                <g key={point.key}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="4.5"
                    fill="var(--accent)"
                    stroke="var(--panel)"
                    strokeWidth="2"
                  />
                  <text
                    x={point.x}
                    y={lineChartData.baselineY + 18}
                    textAnchor="middle"
                    className="dashboard-axis-label"
                  >
                    {point.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        )}
      </div>

      <div className="page-card dashboard-chart-card">
        <div className="dashboard-chart-head">
          <h2>{t("dashboard.orderStatusTitle")}</h2>
          <p className="muted-text">{t("dashboard.orderStatusSubtitle")}</p>
        </div>

        <div className="dashboard-pie-layout">
          <div className="dashboard-donut-wrap">
            <div
              className="dashboard-donut"
              style={{ backgroundImage: statusBreakdown.donutBackground }}
              role="img"
              aria-label={t("dashboard.orderStatusTitle")}
            >
              <div className="dashboard-donut-hole">
                <span>{statusBreakdown.total}</span>
                <small>{t("dashboard.totalOrders")}</small>
              </div>
            </div>
          </div>

          <div className="dashboard-chart-legend">
            {statusBreakdown.segments.map((segment) => {
              const percent = statusBreakdown.total > 0
                ? (segment.count / statusBreakdown.total) * 100
                : 0;
              return (
                <div className="dashboard-legend-row" key={segment.key}>
                  <span className="dashboard-legend-key">
                    <span
                      className="dashboard-legend-dot"
                      style={{ backgroundColor: segment.color }}
                      aria-hidden="true"
                    />
                    {segment.label}
                  </span>
                  <span className="dashboard-legend-value">
                    {segment.count} ({percent.toFixed(1)}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
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
