import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
  const [lowStockThreshold, setLowStockThreshold] = useState(DEFAULT_LOW_STOCK_THRESHOLD);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [adjustingProductId, setAdjustingProductId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadInventory = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [summaryRes, productsRes] = await Promise.all([
        api.get("/products/inventory-summary", {
          params: { lowStockThreshold },
        }),
        api.get("/products"),
      ]);

      if (summaryRes.data?.lowStockThreshold >= 0) {
        setLowStockThreshold(Number(summaryRes.data.lowStockThreshold));
      }
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

    return filtered.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
  }, [products, search, stockFilter, lowStockThreshold]);

  const handleQuickAdjustStock = async (productId, quantityChange) => {
    setAdjustingProductId(productId);
    setError("");
    setMessage("");

    try {
      await api.post(`/products/${productId}/adjust-stock`, {
        quantityChange,
        reason: quantityChange > 0 ? "Quick increase from inventory page" : "Quick decrease from inventory page",
      });

      setMessage(t("inventoryManagement.stockUpdated"));
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

  const getCategory = (product) => {
    const sku = String(product.sku || "");
    if (!sku.includes("-")) {
      return t("inventoryManagement.generalCategory");
    }

    return sku.split("-")[0];
  };

  const getStatusLabel = (stockQuantity) => {
    const status = getStockStatus(stockQuantity, lowStockThreshold);
    if (status === "out") {
      return t("inventoryManagement.outOfStock");
    }
    if (status === "low") {
      return t("inventoryManagement.lowStock");
    }
    return t("inventoryManagement.inStock");
  };

  const getStatusClassName = (stockQuantity) => {
    const status = getStockStatus(stockQuantity, lowStockThreshold);
    if (status === "out") {
      return "out-stock";
    }
    if (status === "low") {
      return "low-stock";
    }
    return "in-stock";
  };

  const getItemImageUrl = (product) => {
    if (product?.imageUrl) {
      return product.imageUrl;
    }

    const label = encodeURIComponent(product?.name || "Item");
    return `https://placehold.co/64x64?text=${label}`;
  };

  return (
    <section className="inventory-modern-page">
      <div className="inventory-modern-toolbar">
        <div className="inventory-modern-title">
          <h2>{t("inventoryManagement.title")}</h2>
          <p>{t("inventoryManagement.subtitle")}</p>
        </div>

        <div className="inventory-modern-controls">
          <label className="inventory-search" aria-label={t("inventoryManagement.searchByNameOrSku")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              placeholder={t("inventoryManagement.searchByNameOrSku")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>

          <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value)}>
            <option value="all">{t("inventoryManagement.allStock")}</option>
            <option value="inStock">{t("inventoryManagement.inStockOnly")}</option>
            <option value="lowStock">{t("inventoryManagement.lowStockOnly")}</option>
            <option value="outOfStock">{t("inventoryManagement.outOfStockOnly")}</option>
          </select>

          <button
            className="inventory-add-btn"
            type="button"
            onClick={() => navigate("/product-management")}
          >
            <AppIcon name="plus" />
            {t("inventoryManagement.addProduct")}
          </button>
        </div>
      </div>

      {message ? <p className="success-text">{message}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}

      <div className="inventory-modern-table">
        <div className="inventory-table-head">
          <span>{t("inventoryManagement.columnProduct")}</span>
          <span>{t("inventoryManagement.columnCategory")}</span>
          <span>{t("inventoryManagement.columnPrice")}</span>
          <span>{t("inventoryManagement.columnStock")}</span>
          <span>{t("inventoryManagement.columnStatus")}</span>
          <span>{t("inventoryManagement.columnActions")}</span>
        </div>

        {loading ? <p className="muted-text">{t("inventoryManagement.loadingInventory")}</p> : null}

        {!loading && filteredProducts.length === 0 ? (
          <p className="muted-text">{t("inventoryManagement.noProductsMatched")}</p>
        ) : (
          <div className="inventory-table-body">
            {filteredProducts.map((product) => {
              const stock = Number(product.stockQuantity || 0);
              const isBusy = adjustingProductId === product.id;
              return (
                <div className="inventory-table-row" key={product.id}>
                  <div className="inventory-product-cell">
                    <img src={getItemImageUrl(product)} alt={product.name} />
                    <div>
                      <div className="inventory-product-name">{product.name}</div>
                      <div className="inventory-product-sku">{product.sku}</div>
                    </div>
                  </div>
                  <div className="inventory-row-text">{getCategory(product)}</div>
                  <div className="inventory-row-text">
                    ${Number(product.mediumPrice ?? product.price ?? 0).toFixed(2)}
                  </div>
                  <div className="inventory-row-text">{stock}</div>
                  <div>
                    <span className={`inventory-status-pill ${getStatusClassName(stock)}`}>
                      {getStatusLabel(stock)}
                    </span>
                  </div>
                  <div className="inventory-actions">
                    <button
                      type="button"
                      className="inventory-action-btn"
                      disabled={isBusy || stock <= 0}
                      onClick={() => handleQuickAdjustStock(product.id, -1)}
                      aria-label={t("inventoryManagement.decreaseStock")}
                    >
                      -
                    </button>
                    <button
                      type="button"
                      className="inventory-action-btn"
                      disabled={isBusy}
                      onClick={() => handleQuickAdjustStock(product.id, 1)}
                      aria-label={t("inventoryManagement.increaseStock")}
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export default InventoryManagement;
