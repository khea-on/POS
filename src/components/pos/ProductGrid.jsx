import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import useI18n from "../../i18n/useI18n";
import gateway from "../../services/gateway";
import AppIcon from "../common/AppIcon";

const getItemImageUrl = (item) => {
  if (item?.imageUrl) {
    return item.imageUrl;
  }

  const label = encodeURIComponent(item?.name || "Item");
  return `https://placehold.co/160x160?text=${label}`;
};

const SIZE_OPTIONS = ["Small", "Medium", "Large"];
const SIZE_SHORT_LABELS = {
  Small: "productGrid.sizeS",
  Medium: "productGrid.sizeM",
  Large: "productGrid.sizeL",
};

const getPriceBySize = (item, size) => {
  if (size === "Small") {
    return Number(item.smallPrice ?? item.mediumPrice ?? item.price ?? 0);
  }

  if (size === "Large") {
    return Number(item.largePrice ?? item.mediumPrice ?? item.price ?? 0);
  }

  return Number(item.mediumPrice ?? item.price ?? 0);
};

function ProductGrid({ onAddItem }) {
  const { t } = useI18n();
  const [products, setProducts] = useState([]);
  const [selectedSizes, setSelectedSizes] = useState({});
  const [detailProduct, setDetailProduct] = useState(null);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("active");
  const [stockFilter, setStockFilter] = useState("inStock");
  const [sort, setSort] = useState("name_asc");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    gateway.products
      .getAll()
      .then((data) => setProducts(data || []))
      .catch(() => {
        setError(t("productGrid.couldNotLoadProducts"));
      });
  }, [t]);

  useEffect(() => {
    if (!detailProduct) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setDetailProduct(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [detailProduct]);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    const min = minPrice !== "" ? Number(minPrice) : null;
    const max = maxPrice !== "" ? Number(maxPrice) : null;

    let result = [...products].filter((p) => {
      const name = String(p.name || "").toLowerCase();
      const sku = String(p.sku || "").toLowerCase();
      const mediumPrice = Number(p.mediumPrice ?? p.price ?? 0);

      if (term && !(name.includes(term) || sku.includes(term))) {
        return false;
      }

      if (activeFilter !== "all" && Boolean(p.isActive) !== (activeFilter === "active")) {
        return false;
      }

      if (stockFilter === "inStock" && Number(p.stockQuantity || 0) <= 0) {
        return false;
      }

      if (min !== null && mediumPrice < min) {
        return false;
      }

      if (max !== null && mediumPrice > max) {
        return false;
      }

      return true;
    });

    result.sort((a, b) => {
      const aName = String(a.name || "");
      const bName = String(b.name || "");
      const aPrice = Number(a.mediumPrice ?? a.price ?? 0);
      const bPrice = Number(b.mediumPrice ?? b.price ?? 0);

      if (sort === "name_desc") return bName.localeCompare(aName);
      if (sort === "price_asc") return aPrice - bPrice;
      if (sort === "price_desc") return bPrice - aPrice;
      return aName.localeCompare(bName);
    });

    return result;
  }, [products, search, activeFilter, stockFilter, minPrice, maxPrice, sort]);

  const openDetail = (product) => {
    setDetailProduct(product);
  };

  const closeDetail = () => {
    setDetailProduct(null);
  };

  const detailModal = detailProduct ? (
    <div className="product-detail-backdrop" onClick={closeDetail}>
      <div
        className="product-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-detail-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="product-detail-header">
          <h4 id="product-detail-title">{t("productGrid.itemDetail")}</h4>
          <button
            className="product-detail-close"
            type="button"
            onClick={closeDetail}
            aria-label={t("common.close")}
          >
            <AppIcon name="close" />
          </button>
        </div>

        <img
          className="product-detail-image"
          src={getItemImageUrl(detailProduct)}
          alt={detailProduct.name}
        />

        <div className="product-detail-info">
          <div className="product-detail-row">
            <span>{t("productManagement.name")}</span>
            <strong>{detailProduct.name || "-"}</strong>
          </div>
          <div className="product-detail-row">
            <span>{t("productGrid.skuLabel")}</span>
            <strong>{detailProduct.sku || "-"}</strong>
          </div>
          <div className="product-detail-row">
            <span>{t("productGrid.stockLabel")}</span>
            <strong>{Number(detailProduct.stockQuantity || 0)}</strong>
          </div>
          <div className="product-detail-row">
            <span>{t("productGrid.statusLabel")}</span>
            <strong>{detailProduct.isActive ? t("common.active") : t("common.inactive")}</strong>
          </div>
          <div className="product-detail-row">
            <span>{t("productGrid.sizeS")}</span>
            <strong>${getPriceBySize(detailProduct, "Small").toFixed(2)}</strong>
          </div>
          <div className="product-detail-row">
            <span>{t("productGrid.sizeM")}</span>
            <strong>${getPriceBySize(detailProduct, "Medium").toFixed(2)}</strong>
          </div>
          <div className="product-detail-row">
            <span>{t("productGrid.sizeL")}</span>
            <strong>${getPriceBySize(detailProduct, "Large").toFixed(2)}</strong>
          </div>
        </div>

        {/* <div className="product-detail-actions">
          <button className="product-detail-trigger" type="button" onClick={closeDetail}>
            {t("common.close")}
          </button>
        </div> */}
      </div>
    </div>
  ) : null;

  return (
    <div className="panel">
      <h3>{t("productGrid.products")}</h3>
      <div className="filter-toolbar">
        <input
          className="filter-input"
          placeholder={t("productGrid.searchItemOrSku")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)}>
          <option value="active">{t("productGrid.active")}</option>
          <option value="inactive">{t("productGrid.inactive")}</option>
          <option value="all">{t("productGrid.all")}</option>
        </select>
        <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value)}>
          <option value="inStock">{t("productGrid.inStock")}</option>
          <option value="all">{t("productGrid.allStock")}</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="name_asc">{t("productGrid.nameAz")}</option>
          <option value="name_desc">{t("productGrid.nameZa")}</option>
          <option value="price_asc">{t("productGrid.priceLowHigh")}</option>
          <option value="price_desc">{t("productGrid.priceHighLow")}</option>
        </select>
        <input
          className="filter-input filter-mini"
          type="number"
          step="0.01"
          placeholder={t("productGrid.minPrice")}
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
        />
        <input
          className="filter-input filter-mini"
          type="number"
          step="0.01"
          placeholder={t("productGrid.maxPrice")}
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
        />
      </div>
      {error && <p className="muted-text">{error}</p>}

      {filteredProducts.length === 0 ? (
        <p>{t("productGrid.noProductsFound")}</p>
      ) : (
        <div className="product-card-grid">
          {filteredProducts.map((p) => (
            <div
              key={p.id}
              className="product-card"
              onDoubleClick={(event) => {
                if (event.target.closest("button")) {
                  return;
                }
                openDetail(p);
              }}
              title={t("productGrid.doubleClickForDetail")}
            >
              <img
                className="product-card-image"
                src={getItemImageUrl(p)}
                alt={p.name}
              />
              <div className="product-card-body">
                <h4>{p.name}</h4>
                <div className="size-price-list">
                  <div>{t("productGrid.sizeS")}: ${getPriceBySize(p, "Small").toFixed(2)}</div>
                  <div>{t("productGrid.sizeM")}: ${getPriceBySize(p, "Medium").toFixed(2)}</div>
                  <div>{t("productGrid.sizeL")}: ${getPriceBySize(p, "Large").toFixed(2)}</div>
                </div>
                <p className="product-card-hint">{t("productGrid.doubleClickForDetail")}</p>
                <div className="size-selector">
                  {SIZE_OPTIONS.map((size) => (
                    <button
                      key={`${p.id}-${size}`}
                      className={`size-btn ${(selectedSizes[p.id] || "Medium") === size ? "active" : ""}`}
                      type="button"
                      onClick={() =>
                        setSelectedSizes((prev) => ({
                          ...prev,
                          [p.id]: size,
                        }))
                      }
                    >
                      {t(SIZE_SHORT_LABELS[size])}
                    </button>
                  ))}
                </div>
                <button
                  className="product-detail-trigger btn-with-icon"
                  type="button"
                  onClick={() => openDetail(p)}
                >
                  {t("productGrid.detail")}
                </button>
                <button
                  className="primary-btn btn-with-icon"
                  type="button"
                  onClick={() => {
                    const size = selectedSizes[p.id] || "Medium";
                    onAddItem({
                      ...p,
                      imageUrl: getItemImageUrl(p),
                      selectedSize: size,
                      price: getPriceBySize(p, size),
                    });
                  }}
                >
                  <AppIcon name="plus" />
                  {t("productGrid.add")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {typeof document !== "undefined" && detailModal
        ? createPortal(detailModal, document.body)
        : null}
    </div>
  );
}

export default ProductGrid;


