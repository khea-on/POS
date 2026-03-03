import { useEffect, useMemo, useState } from "react";
import gateway from "../services/gateway";
import useI18n from "../i18n/useI18n";

function Reports() {
  const { t } = useI18n();
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

    return {
      dailySales: totalFromOrders(todayOrders),
      dailyOrders: todayOrders.length,
      monthlySales: totalFromOrders(monthOrders),
      monthlyOrders: monthOrders.length,
      topItems,
    };
  }, [orders]);

  return (
    <div className="reports-grid">
      <div className="page-card report-card">
        <h2>{t("reports.dailyReport")}</h2>
        <p className="dashboard-value">${report.dailySales.toFixed(2)}</p>
        <p className="muted-text">{t("reports.ordersToday", { count: report.dailyOrders })}</p>
      </div>

      <div className="page-card report-card">
        <h2>{t("reports.monthlySalesReport")}</h2>
        <p className="dashboard-value">${report.monthlySales.toFixed(2)}</p>
        <p className="muted-text">{t("reports.ordersThisMonth", { count: report.monthlyOrders })}</p>
      </div>

      <div className="page-card report-card report-full">
        <h2>{t("reports.topSellingItems")}</h2>
        {report.topItems.length === 0 ? (
          <p>{t("reports.noItemsSoldYet")}</p>
        ) : (
          report.topItems.map((item, index) => (
            <div className="list-row report-item-row" key={`${item.name}-${item.size}-${index}`}>
              <span>
                {item.name} ({item.size})
              </span>
              <span>
                {t("reports.qty")} {item.qty} | ${item.total.toFixed(2)}
              </span>
            </div>
          ))
        )}
      </div>

      {(loading || error) && (
        <div className="page-card report-card report-full">
          {loading ? <p>{t("reports.loadingReports")}</p> : null}
          {error ? <p className="form-error">{error}</p> : null}
        </div>
      )}
    </div>
  );
}

export default Reports;


