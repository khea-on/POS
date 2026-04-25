import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import useI18n from "../../i18n/useI18n";
import gateway from "../../services/gateway";
import AppIcon from "../common/AppIcon";
import { convertKhrToUsd, formatUsdAsKhr } from "../../utils/currency";
import { getProductImageUrl } from "../../utils/mediaUrl";

const getItemImageUrl = (item) => getProductImageUrl(item, "160x160");

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
  const { language, t } = useI18n();
  const [products, setProducts] = useState([]);
  const [selectedSizes, setSelectedSizes] = useState({});
  const [detailProduct, setDetailProduct] = useState(null);
  const [detailSize, setDetailSize] = useState("Medium");
  const [detailQuantity, setDetailQuantity] = useState(1);
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
    const min = minPrice !== "" ? convertKhrToUsd(minPrice) : null;
    const max = maxPrice !== "" ? convertKhrToUsd(maxPrice) : null;

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
    setDetailSize(selectedSizes[product.id] || "Medium");
    setDetailQuantity(1);
    setDetailProduct(product);
  };

  const closeDetail = () => {
    setDetailProduct(null);
  };

  const getSizeLabel = (size) => {
    if (size === "Small") return t("common.sizeSmall");
    if (size === "Large") return t("common.sizeLarge");
    return t("common.sizeMedium");
  };

  const updateDetailQuantity = (nextValue) => {
    const parsedValue = Number.parseInt(String(nextValue), 10);
    setDetailQuantity(Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 1);
  };

  const handleAddDetailItem = () => {
    if (!detailProduct) {
      return;
    }

    setSelectedSizes((prev) => ({
      ...prev,
      [detailProduct.id]: detailSize,
    }));

    onAddItem({
      ...detailProduct,
      imageUrl: getItemImageUrl(detailProduct),
      selectedSize: detailSize,
      price: getPriceBySize(detailProduct, detailSize),
      quantity: detailQuantity,
    });

    closeDetail();
  };

  const detailPrice = detailProduct ? getPriceBySize(detailProduct, detailSize) : 0;
  const detailTotal = detailPrice * detailQuantity;
  const detailStockQuantity = Number(detailProduct?.stockQuantity || 0);
  const detailStatusLabel = detailProduct?.isActive ? t("common.active") : t("common.inactive");
  const detailUnavailable =
    detailProduct
      ? !detailProduct.isActive || detailStockQuantity <= 0
      : false;

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
          <div className="product-detail-header-copy">
            <span className="product-detail-eyebrow">{t("productGrid.itemDetail")}</span>
            <h4 id="product-detail-title">{detailProduct.name || "-"}</h4>
            <p>
              {t("productGrid.skuLabel")}: {detailProduct.sku || "-"}
            </p>
          </div>
          <button
            className="product-detail-close"
            type="button"
            onClick={closeDetail}
            aria-label={t("common.close")}
          >
            <AppIcon name="close" />
          </button>
        </div>

        <div className="product-detail-hero">
          <img
            className="product-detail-image"
            src={getItemImageUrl(detailProduct)}
            alt={detailProduct.name}
          />

          <div className="product-detail-side">
            <div className="product-detail-badges">
              <span className={`product-detail-badge ${detailProduct.isActive ? "is-active" : "is-inactive"}`}>
                {detailStatusLabel}
              </span>
              <span className={`product-detail-badge ${detailStockQuantity > 0 ? "is-stock" : "is-empty"}`}>
                {t("productGrid.stockLabel")}: {detailStockQuantity}
              </span>
            </div>

            <div className="product-detail-price-grid">
              {SIZE_OPTIONS.map((size) => (
                <div
                  key={`price-${detailProduct.id}-${size}`}
                  className={`product-detail-price-card ${detailSize === size ? "active" : ""}`}
                >
                  <span>{t(SIZE_SHORT_LABELS[size])}</span>
                  <strong>{formatUsdAsKhr(getPriceBySize(detailProduct, size), language)}</strong>
                </div>
              ))}
            </div>

            <div className="product-detail-facts">
              <div className="product-detail-fact-card">
                <span>{t("productGrid.stockLabel")}</span>
                <strong>{detailStockQuantity}</strong>
              </div>
              <div className="product-detail-fact-card">
                <span>{t("productGrid.statusLabel")}</span>
                <strong>{detailStatusLabel}</strong>
              </div>
            </div>

            <div className="product-detail-form">
              <strong className="product-detail-form-title">{t("productGrid.addToCart")}</strong>

              <div className="product-detail-control-group">
                <span className="product-detail-control-label">{t("productGrid.selectedSize")}</span>
                <div className="size-selector product-detail-size-selector">
                  {SIZE_OPTIONS.map((size) => (
                    <button
                      key={`detail-${detailProduct.id}-${size}`}
                      className={`size-btn ${detailSize === size ? "active" : ""}`}
                      type="button"
                      onClick={() => setDetailSize(size)}
                    >
                      {t(SIZE_SHORT_LABELS[size])}
                    </button>
                  ))}
                </div>
              </div>

              <div className="product-detail-qty-row">
                <span className="product-detail-control-label">{t("productGrid.quantityLabel")}</span>
                <div className="product-detail-qty-control">
                  <button
                    className="product-detail-qty-btn"
                    type="button"
                    onClick={() => updateDetailQuantity(detailQuantity - 1)}
                    aria-label={t("productGrid.decreaseQuantity")}
                  >
                    -
                  </button>
                  <input
                    className="product-detail-qty-input"
                    type="number"
                    min="1"
                    step="1"
                    value={detailQuantity}
                    onChange={(event) => updateDetailQuantity(event.target.value)}
                  />
                  <button
                    className="product-detail-qty-btn"
                    type="button"
                    onClick={() => updateDetailQuantity(detailQuantity + 1)}
                    aria-label={t("productGrid.increaseQuantity")}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="product-detail-price-summary">
                <div className="product-detail-price-line">
                  <span>{t("productGrid.selectedSize")}</span>
                  <strong>{getSizeLabel(detailSize)}</strong>
                </div>
                <div className="product-detail-price-line">
                  <span>{t("productGrid.quantityLabel")}</span>
                  <strong>{detailQuantity} x {formatUsdAsKhr(detailPrice, language)}</strong>
                </div>
                <div className="product-detail-price-line product-detail-price-line-total">
                  <span>{t("productGrid.totalLabel")}</span>
                  <strong>{formatUsdAsKhr(detailTotal, language)}</strong>
                </div>
              </div>

              <div className="product-detail-actions">
                <button className="product-detail-trigger" type="button" onClick={closeDetail}>
                  {t("common.close")}
                </button>
                <button
                  className="primary-btn btn-with-icon"
                  type="button"
                  onClick={handleAddDetailItem}
                  disabled={detailUnavailable}
                >
                  <AppIcon name="plus" />
                  {t("productGrid.addToCart")}
                </button>
              </div>
            </div>
          </div>
        </div>
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
          step="1"
          placeholder={t("productGrid.minPrice")}
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
        />
        <input
          className="filter-input filter-mini"
          type="number"
          step="1"
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
          {filteredProducts.map((p) => {
            const imageUrl = getItemImageUrl(p);

            return (
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
                <div
                  className="product-card-media"
                  style={{ backgroundImage: `url(${JSON.stringify(imageUrl)})` }}
                >
                  <img
                    className="product-card-image"
                    src={imageUrl}
                    alt={p.name}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="product-card-body">
                  <h4>{p.name}</h4>
                  <div className="size-price-list">
                    <div>{t("productGrid.sizeS")}: {formatUsdAsKhr(getPriceBySize(p, "Small"), language)}</div>
                    <div>{t("productGrid.sizeM")}: {formatUsdAsKhr(getPriceBySize(p, "Medium"), language)}</div>
                    <div>{t("productGrid.sizeL")}: {formatUsdAsKhr(getPriceBySize(p, "Large"), language)}</div>
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
                        imageUrl,
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
            );
          })}
        </div>
      )}

      {typeof document !== "undefined" && detailModal
        ? createPortal(detailModal, document.body)
        : null}
    </div>
  );
}

export default ProductGrid;
