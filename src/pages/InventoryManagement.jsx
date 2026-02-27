import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import useI18n from "../i18n/useI18n";
import AppIcon from "../components/common/AppIcon";

const DEFAULT_LOW_STOCK_THRESHOLD = 10;

const getStockStatus = (stockQuantity, threshold) => {
  const stock = Number(stockQuantity || 0);
  if (stock <= 0) {
    return "out";
  }

  if (stock <= threshold) {
    return "low";
  }

  return "in";
};

function InventoryManagement() {
  const { t } = useI18n();
  const [lowStockThreshold, setLowStockThreshold] = useState(DEFAULT_LOW_STOCK_THRESHOLD);
  const [summary, setSummary] = useState(null);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [sort, setSort] = useState("stock_asc");
  const [stockDrafts, setStockDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [adjustingProductId, setAdjustingProductId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadInventory = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [summaryRes, lowStockRes, productsRes] = await Promise.all([
        api.get("/products/inventory-summary", {
          params: { lowStockThreshold },
        }),
        api.get("/products/low-stock", {
          params: { threshold: lowStockThreshold },
        }),
        api.get("/products"),
      ]);

      setSummary(summaryRes.data || null);
      setLowStockProducts(lowStockRes.data || []);
      setProducts(productsRes.data || []);
    } catch (err) {
      const apiError = err.response?.data;
      if (typeof apiError === "string" && apiError.trim()) {
        setError(apiError);
      } else {
        setError(t("inventoryManagement.failedToLoadInventory"));
      }
    } finally {
      setLoading(false);
    }
  }, [lowStockThreshold, t]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    const filtered = products.filter((product) => {
      const name = String(product.name || "").toLowerCase();
      const sku = String(product.sku || "").toLowerCase();
      const stock = Number(product.stockQuantity || 0);
      const status = getStockStatus(stock, lowStockThreshold);

      if (term && !(name.includes(term) || sku.includes(term))) {
        return false;
      }

      if (stockFilter === "inStock" && status !== "in") {
        return false;
      }

      if (stockFilter === "lowStock" && status !== "low") {
        return false;
      }

      if (stockFilter === "outOfStock" && status !== "out") {
        return false;
      }

      return true;
    });

    filtered.sort((a, b) => {
      const aName = String(a.name || "");
      const bName = String(b.name || "");
      const aStock = Number(a.stockQuantity || 0);
      const bStock = Number(b.stockQuantity || 0);

      if (sort === "name_asc") return aName.localeCompare(bName);
      if (sort === "name_desc") return bName.localeCompare(aName);
      if (sort === "stock_desc") return bStock - aStock;
      return aStock - bStock;
    });

    return filtered;
  }, [products, search, stockFilter, sort, lowStockThreshold]);

  const updateDraft = (productId, field, value) => {
    setStockDrafts((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: value,
      },
    }));
  };

  const handleAdjustStock = async (productId) => {
    const draft = stockDrafts[productId] || {};
    const quantityChange = Number.parseInt(String(draft.quantityChange || ""), 10);
    const reason = String(draft.reason || "").trim();

    if (!Number.isInteger(quantityChange) || quantityChange === 0) {
      setError(t("inventoryManagement.invalidQuantityChange"));
      return;
    }

    setAdjustingProductId(productId);
    setError("");
    setMessage("");

    try {
      await api.post(`/products/${productId}/adjust-stock`, {
        quantityChange,
        reason: reason || null,
      });

      const signedQty = quantityChange > 0 ? `+${quantityChange}` : String(quantityChange);
      setMessage(t("inventoryManagement.stockUpdated", { qty: signedQty }));
      setStockDrafts((prev) => ({
        ...prev,
        [productId]: { quantityChange: "", reason: "" },
      }));
      await loadInventory();
    } catch (err) {
      const apiError = err.response?.data;
      if (typeof apiError === "string" && apiError.trim()) {
        setError(apiError);
      } else {
        setError(t("inventoryManagement.failedToAdjustStock"));
      }
    } finally {
      setAdjustingProductId(null);
    }
  };

  return (
    <div className="page-card">
      <h2>{t("inventoryManagement.title")}</h2>

      <div className="filter-toolbar">
        <input
          className="filter-input"
          placeholder={t("inventoryManagement.searchByNameOrSku")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value)}>
          <option value="all">{t("inventoryManagement.allStock")}</option>
          <option value="inStock">{t("inventoryManagement.inStockOnly")}</option>
          <option value="lowStock">{t("inventoryManagement.lowStockOnly")}</option>
          <option value="outOfStock">{t("inventoryManagement.outOfStockOnly")}</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="stock_asc">{t("inventoryManagement.stockLowHigh")}</option>
          <option value="stock_desc">{t("inventoryManagement.stockHighLow")}</option>
          <option value="name_asc">{t("inventoryManagement.nameAz")}</option>
          <option value="name_desc">{t("inventoryManagement.nameZa")}</option>
        </select>
        <input
          className="filter-input filter-mini"
          type="number"
          min="0"
          value={lowStockThreshold}
          onChange={(e) => {
            const parsed = Number.parseInt(e.target.value, 10);
            setLowStockThreshold(Number.isInteger(parsed) && parsed >= 0 ? parsed : 0);
          }}
          aria-label={t("inventoryManagement.lowStockThreshold")}
        />
        <button className="screen-btn btn-with-icon" type="button" onClick={loadInventory}>
          <AppIcon name="stock" />
          {t("inventoryManagement.refresh")}
        </button>
      </div>

      <div className="inventory-summary-grid">
        <div className="page-card inventory-summary-card">
          <h3>{t("inventoryManagement.totalProducts")}</h3>
          <p className="dashboard-value">{summary?.totalProducts ?? 0}</p>
        </div>
        <div className="page-card inventory-summary-card">
          <h3>{t("inventoryManagement.activeProducts")}</h3>
          <p className="dashboard-value">{summary?.activeProducts ?? 0}</p>
        </div>
        <div className="page-card inventory-summary-card">
          <h3>{t("inventoryManagement.inStockProducts")}</h3>
          <p className="dashboard-value">{summary?.inStockProducts ?? 0}</p>
        </div>
        <div className="page-card inventory-summary-card">
          <h3>{t("inventoryManagement.lowStockProducts")}</h3>
          <p className="dashboard-value">{summary?.lowStockProducts ?? 0}</p>
        </div>
        <div className="page-card inventory-summary-card">
          <h3>{t("inventoryManagement.outOfStockProducts")}</h3>
          <p className="dashboard-value">{summary?.outOfStockProducts ?? 0}</p>
        </div>
      </div>

      {message ? <p className="success-text">{message}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
      {loading ? <p className="muted-text">{t("inventoryManagement.loadingInventory")}</p> : null}

      <div className="inventory-sections">
        <div className="page-card">
          <h3>
            {t("inventoryManagement.lowStockListTitle", {
              threshold: lowStockThreshold,
            })}
          </h3>
          {lowStockProducts.length === 0 ? (
            <p className="muted-text">{t("inventoryManagement.noLowStockProducts")}</p>
          ) : (
            <div className="inventory-low-stock-list">
              {lowStockProducts.map((product) => (
                <div className="list-row inventory-low-stock-item" key={`low-${product.id}`}>
                  <span>
                    {product.name} ({product.sku})
                  </span>
                  <strong>{Number(product.stockQuantity || 0)}</strong>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="page-card">
          <h3>{t("inventoryManagement.stockAdjustments")}</h3>
          {filteredProducts.length === 0 ? (
            <p className="muted-text">{t("inventoryManagement.noProductsMatched")}</p>
          ) : (
            <div className="inventory-list">
              {filteredProducts.map((product) => {
                const stock = Number(product.stockQuantity || 0);
                const status = getStockStatus(stock, lowStockThreshold);
                const badgeClass = status === "in" ? "in-stock" : status === "low" ? "low-stock" : "out-stock";
                const statusText = status === "in"
                  ? t("inventoryManagement.inStock")
                  : status === "low"
                    ? t("inventoryManagement.lowStock")
                    : t("inventoryManagement.outOfStock");
                const draft = stockDrafts[product.id] || {};
                const isBusy = adjustingProductId === product.id;

                return (
                  <div className="list-row inventory-row" key={product.id}>
                    <div className="inventory-row-main">
                      <div>
                        {product.name} ({product.sku})
                      </div>
                      <div className="inventory-row-meta muted-text">
                        <span>{t("inventoryManagement.currentStock", { stock })}</span>
                        <span className={`inventory-badge ${badgeClass}`}>{statusText}</span>
                      </div>
                    </div>

                    <div className="inventory-adjust-form">
                      <input
                        className="filter-input filter-mini"
                        type="number"
                        placeholder={t("inventoryManagement.quantityChange")}
                        value={draft.quantityChange || ""}
                        onChange={(e) => updateDraft(product.id, "quantityChange", e.target.value)}
                      />
                      <input
                        className="filter-input"
                        placeholder={t("inventoryManagement.reasonOptional")}
                        value={draft.reason || ""}
                        onChange={(e) => updateDraft(product.id, "reason", e.target.value)}
                      />
                      <button
                        className="primary-btn btn-with-icon"
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleAdjustStock(product.id)}
                      >
                        <AppIcon name="stock" />
                        {isBusy ? t("inventoryManagement.updating") : t("inventoryManagement.updateStock")}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default InventoryManagement;
