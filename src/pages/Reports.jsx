import { useEffect, useMemo, useState } from "react";
import AppIcon from "../components/common/AppIcon";
import gateway from "../services/gateway";
import useI18n from "../i18n/useI18n";
import { formatUsdAsKhr } from "../utils/currency";

const getOrderTimestamp = (createdAtUtc) => {
  const timestamp = new Date(createdAtUtc).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const getOrderQuantity = (order) =>
  (order.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);

function Reports() {
  const { language, t } = useI18n();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadReports = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await gateway.orders.getAll();
        setOrders(data || []);
      } catch (err) {
        const apiError = err.response?.data;
        if (typeof apiError === "string" && apiError.trim()) {
          setError(apiError);
        } else {
          setError(t("reports.failedToLoadReports"));
        }
      } finally {
        setLoading(false);
      }
    };

    loadReports();
  }, [t]);

  const report = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const todayOrders = orders.filter((order) => {
      const created = new Date(order.createdAtUtc);
      return created >= startOfToday && created < endOfToday;
    });

    const monthOrders = orders.filter((order) => {
      const created = new Date(order.createdAtUtc);
      return created >= startOfMonth && created < endOfToday;
    });

    const totalFromOrders = (orderList) =>
      orderList.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);

    const itemsMap = new Map();
    orders.forEach((order) => {
      (order.items || []).forEach((item) => {
        const key = `${item.productId}-${item.size || "Medium"}`;
        const existing = itemsMap.get(key);
        const productName = item.product?.name || `Product #${item.productId}`;
        const size = item.size || "Medium";

        if (!existing) {
          itemsMap.set(key, {
            name: productName,
            size,
            qty: Number(item.quantity || 0),
            total: Number(item.lineTotal || 0),
          });
          return;
        }

        existing.qty += Number(item.quantity || 0);
        existing.total += Number(item.lineTotal || 0);
      });
    });

    const topItems = Array.from(itemsMap.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    const latestOrders = [...orders].sort(
      (a, b) => getOrderTimestamp(b.createdAtUtc) - getOrderTimestamp(a.createdAtUtc)
    );

    return {
      dailySales: totalFromOrders(todayOrders),
      dailyOrders: todayOrders.length,
      monthlySales: totalFromOrders(monthOrders),
      monthlyOrders: monthOrders.length,
      totalOrders: orders.length,
      completedOrders: orders.filter((order) => Number(order.status || 0) === 2).length,
      topItems,
      latestOrders,
    };
  }, [orders]);

  const getStatusLabel = (status) => {
    if (Number(status) === 3) {
      return t("pos.statusCancelled");
    }
    if (Number(status) === 2) {
      return t("pos.statusPaid");
    }
    if (Number(status) === 1) {
      return t("pos.statusPending");
    }
    return t("pos.statusUnknown");
  };

  const getStatusTone = (status) => {
    if (Number(status) === 3) {
      return "cancelled";
    }
    if (Number(status) === 2) {
      return "paid";
    }
    if (Number(status) === 1) {
      return "pending";
    }
    return "unknown";
  };

  const formatOrderDate = (createdAtUtc) => {
    const date = new Date(createdAtUtc);
    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleString(language === "km" ? "km-KH" : undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <section className="reports-grid reports-screen">
      <div className="reports-screen-head report-full">
        <div>
          <h2>{t("reports.title")}</h2>
          <p className="muted-text">{t("reports.subtitle")}</p>
        </div>
      </div>

      <div className="page-card report-card report-stat-card">
        <div className="card-icon report-stat-icon" aria-hidden="true">
          <AppIcon name="checkout" />
        </div>
        <h2>{t("reports.dailyReport")}</h2>
        <p className="dashboard-value">{formatUsdAsKhr(report.dailySales, language)}</p>
        <p className="muted-text">{t("reports.ordersToday", { count: report.dailyOrders })}</p>
      </div>

      <div className="page-card report-card report-stat-card">
        <div className="card-icon report-stat-icon" aria-hidden="true">
          <AppIcon name="reports" />
        </div>
        <h2>{t("reports.monthlySalesReport")}</h2>
        <p className="dashboard-value">{formatUsdAsKhr(report.monthlySales, language)}</p>
        <p className="muted-text">{t("reports.ordersThisMonth", { count: report.monthlyOrders })}</p>
      </div>

      <div className="page-card report-card report-stat-card">
        <div className="card-icon report-stat-icon" aria-hidden="true">
          <AppIcon name="invoice-screen" />
        </div>
        <h2>{t("reports.totalOrders")}</h2>
        <p className="dashboard-value">{report.totalOrders}</p>
        <p className="muted-text">{t("reports.ordersLoaded", { count: report.totalOrders })}</p>
      </div>

      <div className="page-card report-card report-stat-card">
        <div className="card-icon report-stat-icon" aria-hidden="true">
          <AppIcon name="save" />
        </div>
        <h2>{t("reports.completedOrders")}</h2>
        <p className="dashboard-value">{report.completedOrders}</p>
        <p className="muted-text">{t("pos.statusPaid")}</p>
      </div>

      <div className="page-card report-card report-full">
        <div className="report-section-head">
          <div>
            <h2>{t("reports.topSellingItems")}</h2>
            <p className="muted-text">{t("reports.topSellingItemsHint")}</p>
          </div>
        </div>
        {report.topItems.length === 0 ? (
          <p>{t("reports.noItemsSoldYet")}</p>
        ) : (
          report.topItems.map((item, index) => (
            <div className="list-row report-item-row" key={`${item.name}-${item.size}-${index}`}>
              <span className="report-item-main">
                <span className="report-rank">{index + 1}</span>
                <span>{item.name} ({item.size})</span>
              </span>
              <strong>{t("reports.qty")} {item.qty} | {formatUsdAsKhr(item.total, language)}</strong>
            </div>
          ))
        )}
      </div>

      <div className="page-card report-card report-full report-history-card">
        <div className="report-section-head">
          <div>
            <h2>{t("reports.latestOrders")}</h2>
            <p className="muted-text">{t("reports.latestOrdersHint")}</p>
          </div>
          <span className="report-count-pill">{report.totalOrders}</span>
        </div>

        {report.latestOrders.length === 0 ? (
          <p>{t("reports.noOrdersYet")}</p>
        ) : (
          <div className="report-order-list">
            {report.latestOrders.map((order) => {
              const itemCount = (order.items || []).length;
              const quantity = getOrderQuantity(order);

              return (
                <div className="report-order-row" key={order.id}>
                  <div className="report-order-top">
                    <div className="report-order-title">
                      <strong>{t("pos.orderWithId", { id: order.id })}</strong>
                      <span>{formatOrderDate(order.createdAtUtc)}</span>
                    </div>
                    <span className={`report-status-pill report-status-${getStatusTone(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                  </div>
                  <div className="report-order-meta">
                    <span>
                      {t("reports.itemsCount", { count: itemCount, quantity })}
                    </span>
                    <strong>
                      {t("reports.orderTotal", {
                        total: formatUsdAsKhr(Number(order.totalAmount || 0), language),
                      })}
                    </strong>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {(loading || error) && (
        <div className="page-card report-card report-full">
          {loading ? <p>{t("reports.loadingReports")}</p> : null}
          {error ? <p className="form-error">{error}</p> : null}
        </div>
      )}
    </section>
  );
}

export default Reports;


