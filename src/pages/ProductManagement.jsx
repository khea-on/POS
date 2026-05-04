import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import gateway from "../services/gateway";
import useI18n from "../i18n/useI18n";
import AppIcon from "../components/common/AppIcon";
import {
  convertKhrToUsd,
  formatUsdAsKhr,
  formatUsdAsKhrInputValue,
} from "../utils/currency";
import { getProductImageUrl } from "../utils/mediaUrl";

const defaultProductForm = {
  name: "",
  sku: "",
  imageUrl: "",
  smallPrice: "",
  mediumPrice: "",
  largePrice: "",
  stockQuantity: "0",
  isActive: true,
};

function ProductManagement() {
  const { language, t } = useI18n();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [sort, setSort] = useState("name_asc");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [productForm, setProductForm] = useState(defaultProductForm);
  const [editingProductId, setEditingProductId] = useState(null);
  const [stockAdjustments, setStockAdjustments] = useState({});
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const imageFileInputRef = useRef(null);

  const loadProducts = useCallback(async () => {
    setDataLoading(true);
    setError("");
    try {
      const data = await gateway.products.getAll();
      setProducts(data || []);
    } catch (err) {
      setError(err.response?.data || t("productManagement.failedToLoadProducts"));
    } finally {
      setDataLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const resetProductForm = useCallback(() => {
    setProductForm(defaultProductForm);
    setEditingProductId(null);
    setSelectedImageFile(null);
  }, []);

  const openCreateProductModal = () => {
    setError("");
    setMessage("");
    resetProductForm();
    setIsProductModalOpen(true);
  };

  const closeProductModal = useCallback(() => {
    if (loading || uploadingImage) {
      return;
    }

    setIsProductModalOpen(false);
    resetProductForm();
  }, [loading, resetProductForm, uploadingImage]);

  useEffect(() => {
    if (!isProductModalOpen) {
      return undefined;
    }

    const handleEscClose = (event) => {
      if (event.key === "Escape") {
        closeProductModal();
      }
    };

    window.addEventListener("keydown", handleEscClose);
    return () => {
      window.removeEventListener("keydown", handleEscClose);
    };
  }, [closeProductModal, isProductModalOpen]);

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
      const aStock = Number(a.stockQuantity || 0);
      const bStock = Number(b.stockQuantity || 0);

      if (sort === "name_desc") return bName.localeCompare(aName);
      if (sort === "price_asc") return aPrice - bPrice;
      if (sort === "price_desc") return bPrice - aPrice;
      if (sort === "stock_asc") return aStock - bStock;
      if (sort === "stock_desc") return bStock - aStock;
      if (sort === "newest") {
        return new Date(b.createdAtUtc || 0).getTime() - new Date(a.createdAtUtc || 0).getTime();
      }
      return aName.localeCompare(bName);
    });

    return result;
  }, [products, search, activeFilter, stockFilter, minPrice, maxPrice, sort]);

  const productStats = useMemo(() => {
    const activeProducts = products.filter((product) => product.isActive).length;
    const outOfStockProducts = products.filter((product) => Number(product.stockQuantity || 0) <= 0).length;

    return {
      total: products.length,
      active: activeProducts,
      outOfStock: outOfStockProducts,
      matched: filteredProducts.length,
    };
  }, [filteredProducts.length, products]);

  const handleSubmitProduct = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const payload = {
      name: productForm.name.trim(),
      sku: productForm.sku.trim(),
      imageUrl: productForm.imageUrl.trim() || null,
      price: convertKhrToUsd(productForm.mediumPrice || 0),
      smallPrice: convertKhrToUsd(productForm.smallPrice || 0),
      mediumPrice: convertKhrToUsd(productForm.mediumPrice || 0),
      largePrice: convertKhrToUsd(productForm.largePrice || 0),
      stockQuantity: Number(productForm.stockQuantity || 0),
      isActive: productForm.isActive,
    };

    try {
      let savedProduct = null;
      let targetProductId = editingProductId;

      if (editingProductId) {
        savedProduct = await gateway.products.update(editingProductId, payload);
        setMessage(t("productManagement.productUpdated"));
      } else {
        savedProduct = await gateway.products.create(payload);
        targetProductId = savedProduct?.id || null;
        setMessage(t("productManagement.productCreated"));
      }

      if (selectedImageFile) {
        if (!targetProductId) {
          throw new Error("Missing product id for image upload.");
        }
        await gateway.products.uploadImage(targetProductId, selectedImageFile);
      }

      setIsProductModalOpen(false);
      resetProductForm();
      await loadProducts();
    } catch (err) {
      setError(
        err.response?.data
          || (editingProductId
            ? t("productManagement.failedToUpdateProduct")
            : t("productManagement.failedToCreateProduct"))
      );
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (product) => {
    setError("");
    setMessage("");
    setSelectedImageFile(null);
    setEditingProductId(product.id);
    setIsProductModalOpen(true);
    setProductForm({
      name: product.name || "",
      sku: product.sku || "",
      imageUrl: product.imageUrl || "",
      smallPrice: formatUsdAsKhrInputValue(product.smallPrice ?? product.price ?? 0),
      mediumPrice: formatUsdAsKhrInputValue(product.mediumPrice ?? product.price ?? 0),
      largePrice: formatUsdAsKhrInputValue(product.largePrice ?? product.price ?? 0),
      stockQuantity: String(Number(product.stockQuantity ?? 0)),
      isActive: Boolean(product.isActive),
    });
  };

  const handleCancelEdit = () => {
    setError("");
    setMessage("");
    setIsProductModalOpen(false);
    resetProductForm();
  };

  const handlePickProductImage = async (event) => {
    const selectedFile = event.target.files?.[0];
    event.target.value = "";

    if (!selectedFile) {
      return;
    }

    setError("");
    setMessage("");
    setUploadingImage(true);
    try {
      setSelectedImageFile(selectedFile);
      setMessage(`${selectedFile.name} selected. Click save to upload.`);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAddStock = async (productId) => {
    const qty = Number.parseInt(stockAdjustments[productId] || "", 10);
    if (!Number.isFinite(qty) || qty <= 0) {
      setError(t("productManagement.invalidStockToAdd"));
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");
    try {
      await gateway.products.adjustStock(productId, {
        quantityChange: qty,
        reason: "Manual stock add from Product Management",
      });
      setMessage(t("productManagement.stockAdded", { qty }));
      setStockAdjustments((prev) => ({ ...prev, [productId]: "" }));
      await loadProducts();
    } catch (err) {
      setError(err.response?.data || t("productManagement.failedToAddStock"));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (id) => {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await gateway.products.remove(id);
      setMessage(t("productManagement.productDeleted"));
      if (editingProductId === id) {
        resetProductForm();
      }
      await loadProducts();
    } catch (err) {
      setError(err.response?.data || t("productManagement.failedToDeleteProduct"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="product-management-page">
      {isProductModalOpen ? (
        <div
          className="inventory-modal-backdrop"
          role="presentation"
          onClick={closeProductModal}
        >
          <div
            className="inventory-modal-card product-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="inventory-modal-header">
              <div>
                <h3 id="product-modal-title">
                  {editingProductId ? t("productManagement.editProduct") : t("productManagement.addProduct")}
                </h3>
                <p className="muted-text">{t("productManagement.subtitle")}</p>
              </div>
              <button
                type="button"
                className="screen-btn btn-with-icon"
                onClick={closeProductModal}
                disabled={loading || uploadingImage}
              >
                <AppIcon name="close" />
                {t("common.close")}
              </button>
            </div>

            <form className="inventory-modal-form product-modal-form" onSubmit={handleSubmitProduct}>
              <label className="inventory-modal-field">
                <span className="inventory-modal-label">{t("productManagement.name")}</span>
                <input
                  className="inventory-modal-input"
                  value={productForm.name}
                  onChange={(e) => setProductForm((prev) => ({ ...prev, name: e.target.value }))}
                  required
                  autoFocus
                />
              </label>

              <label className="inventory-modal-field">
                <span className="inventory-modal-label">{t("productManagement.sku")}</span>
                <input
                  className="inventory-modal-input"
                  value={productForm.sku}
                  onChange={(e) => setProductForm((prev) => ({ ...prev, sku: e.target.value }))}
                  required
                />
              </label>

              <label className="inventory-modal-field inventory-modal-field-wide">
                <span className="inventory-modal-label">{t("productManagement.imageUrl")}</span>
                <div className="inventory-image-url-input-group">
                  <input
                    className="inventory-modal-input"
                    value={productForm.imageUrl}
                    onChange={(e) => setProductForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
                  />
                  <button
                    className="screen-btn btn-with-icon"
                    type="button"
                    onClick={() => imageFileInputRef.current?.click()}
                    disabled={loading || uploadingImage}
                  >
                    <AppIcon name="plus" />
                    {uploadingImage
                      ? t("productManagement.uploadingImage")
                      : t("productManagement.uploadImage")}
                  </button>
                  <button
                    className="cancel-btn btn-with-icon"
                    type="button"
                    onClick={() => {
                      setSelectedImageFile(null);
                      setProductForm((prev) => ({ ...prev, imageUrl: "" }));
                    }}
                    disabled={loading || uploadingImage || (!productForm.imageUrl.trim() && !selectedImageFile)}
                  >
                    <AppIcon name="cancel" />
                    {t("productManagement.clearImage")}
                  </button>
                  <input
                    ref={imageFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePickProductImage}
                    style={{ display: "none" }}
                  />
                </div>
                {selectedImageFile ? (
                  <p className="muted-text">{selectedImageFile.name}</p>
                ) : null}
              </label>

              <label className="inventory-modal-field">
                <span className="inventory-modal-label">{t("productManagement.smallPrice")}</span>
                <input
                  className="inventory-modal-input"
                  type="number"
                  step="1"
                  min="0"
                  value={productForm.smallPrice}
                  onChange={(e) => setProductForm((prev) => ({ ...prev, smallPrice: e.target.value }))}
                  required
                />
              </label>

              <label className="inventory-modal-field">
                <span className="inventory-modal-label">{t("productManagement.mediumPrice")}</span>
                <input
                  className="inventory-modal-input"
                  type="number"
                  step="1"
                  min="0"
                  value={productForm.mediumPrice}
                  onChange={(e) => setProductForm((prev) => ({ ...prev, mediumPrice: e.target.value }))}
                  required
                />
              </label>

              <label className="inventory-modal-field">
                <span className="inventory-modal-label">{t("productManagement.largePrice")}</span>
                <input
                  className="inventory-modal-input"
                  type="number"
                  step="1"
                  min="0"
                  value={productForm.largePrice}
                  onChange={(e) => setProductForm((prev) => ({ ...prev, largePrice: e.target.value }))}
                  required
                />
              </label>

              <label className="inventory-modal-field">
                <span className="inventory-modal-label">{t("productManagement.stock")}</span>
                <input
                  className="inventory-modal-input"
                  type="number"
                  min="0"
                  value={productForm.stockQuantity}
                  onChange={(e) => setProductForm((prev) => ({ ...prev, stockQuantity: e.target.value }))}
                  required
                />
              </label>

              <label className="muted-text inventory-modal-checkbox inventory-modal-field-wide">
                <input
                  type="checkbox"
                  checked={productForm.isActive}
                  onChange={(e) => setProductForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                />
                {t("productManagement.activeLabel")}
              </label>

              <div className="product-form-actions inventory-modal-actions">
                <button className="primary-btn btn-with-icon" type="submit" disabled={loading}>
                  <AppIcon name={editingProductId ? "save" : "plus"} />
                  {loading
                    ? t("productManagement.saving")
                    : editingProductId
                      ? t("productManagement.updateProduct")
                      : t("productManagement.addProduct")}
                </button>
                <button
                  className="screen-btn btn-with-icon"
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={loading}
                >
                  <AppIcon name="cancel" />
                  {editingProductId ? t("productManagement.cancelEdit") : t("common.cancel")}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <div className="inventory-modern-toolbar product-management-toolbar">
        <div className="inventory-modern-title product-management-title">
          <h2>{t("productManagement.title")}</h2>
          <p>{t("productManagement.subtitle")}</p>
        </div>
        <button
          className="inventory-add-btn product-management-add-btn"
          type="button"
          onClick={openCreateProductModal}
        >
          <AppIcon name="plus" />
          {t("productManagement.addProduct")}
        </button>
      </div>

      <div className="product-management-summary-grid">
        <div className="product-management-stat">
          <span>{t("productManagement.totalProducts")}</span>
          <strong>{productStats.total}</strong>
        </div>
        <div className="product-management-stat">
          <span>{t("productManagement.activeProducts")}</span>
          <strong>{productStats.active}</strong>
        </div>
        <div className="product-management-stat">
          <span>{t("productManagement.matchedProducts")}</span>
          <strong>{productStats.matched}</strong>
        </div>
        <div className="product-management-stat">
          <span>{t("productManagement.outOfStockProducts")}</span>
          <strong>{productStats.outOfStock}</strong>
        </div>
      </div>

      <div className="product-management-filter-panel">
        <label className="inventory-search product-management-search" aria-label={t("productManagement.searchProductOrSku")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            placeholder={t("productManagement.searchProductOrSku")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)}>
          <option value="all">{t("productManagement.allStatus")}</option>
          <option value="active">{t("productManagement.active")}</option>
          <option value="inactive">{t("productManagement.inactive")}</option>
        </select>
        <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value)}>
          <option value="all">{t("productManagement.allStock")}</option>
          <option value="inStock">{t("productManagement.inStockOnly")}</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="name_asc">{t("productManagement.nameAz")}</option>
          <option value="name_desc">{t("productManagement.nameZa")}</option>
          <option value="price_asc">{t("productManagement.priceLowHigh")}</option>
          <option value="price_desc">{t("productManagement.priceHighLow")}</option>
          <option value="stock_desc">{t("productManagement.stockHighLow")}</option>
          <option value="stock_asc">{t("productManagement.stockLowHigh")}</option>
          <option value="newest">{t("productManagement.newest")}</option>
        </select>
        <input
          className="product-management-filter-input"
          type="number"
          step="1"
          placeholder={t("productManagement.minPrice")}
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
        />
        <input
          className="product-management-filter-input"
          type="number"
          step="1"
          placeholder={t("productManagement.maxPrice")}
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
        />
      </div>

      {message ? <p className="success-text">{message}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
      {dataLoading ? <p className="muted-text">{t("productManagement.loadingProducts")}</p> : null}

      {!dataLoading && filteredProducts.length === 0 ? (
        <div className="product-management-empty-state">
          <AppIcon name="stock" />
          <strong>{t("productManagement.noProductsMatched")}</strong>
        </div>
      ) : (
        <div className="product-management-list">
          {filteredProducts.map((product) => {
            const stock = Number(product.stockQuantity || 0);
            const isActive = Boolean(product.isActive);
            const statusLabel = isActive ? t("productManagement.active") : t("productManagement.inactive");

            return (
              <article className="product-management-card" key={product.id}>
                <div className="product-management-card-main">
                  <img
                    className="product-management-image"
                    src={getProductImageUrl(product, "96x96")}
                    alt={product.name || product.sku || t("productManagement.title")}
                  />
                  <div className="product-management-copy">
                    <div className="product-management-card-head">
                      <div>
                        <h3>{product.name}</h3>
                        <span>{product.sku}</span>
                      </div>
                      <span className={`product-management-status-pill ${isActive ? "active" : "inactive"}`}>
                        {statusLabel}
                      </span>
                    </div>

                    <div className="product-management-price-grid">
                      <div>
                        <span>S</span>
                        <strong>{formatUsdAsKhr(Number(product.smallPrice ?? product.price ?? 0), language)}</strong>
                      </div>
                      <div>
                        <span>M</span>
                        <strong>{formatUsdAsKhr(Number(product.mediumPrice ?? product.price ?? 0), language)}</strong>
                      </div>
                      <div>
                        <span>L</span>
                        <strong>{formatUsdAsKhr(Number(product.largePrice ?? product.price ?? 0), language)}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="product-management-stock-row">
                  <span>{t("productManagement.stockLabel")}</span>
                  <strong>{stock}</strong>
                </div>

                <div className="product-management-card-actions">
                  <div className="product-management-stock-adjust">
                    <input
                      type="number"
                      min="1"
                      placeholder={t("productManagement.stockQuantityToAdd")}
                      value={stockAdjustments[product.id] || ""}
                      onChange={(e) =>
                        setStockAdjustments((prev) => ({
                          ...prev,
                          [product.id]: e.target.value,
                        }))
                      }
                    />
                    <button
                      className="primary-btn btn-with-icon"
                      type="button"
                      disabled={loading}
                      onClick={() => handleAddStock(product.id)}
                    >
                      <AppIcon name="stock" />
                      {t("productManagement.addStock")}
                    </button>
                  </div>
                  <div className="product-management-action-buttons">
                    <button
                      className="screen-btn product-management-icon-btn"
                      type="button"
                      disabled={loading}
                      onClick={() => handleStartEdit(product)}
                      aria-label={t("productManagement.edit")}
                      title={t("productManagement.edit")}
                    >
                      <AppIcon name="edit" />
                    </button>
                    <button
                      className="cancel-btn product-management-icon-btn"
                      type="button"
                      disabled={loading}
                      onClick={() => handleDeleteProduct(product.id)}
                      aria-label={t("common.delete")}
                      title={t("common.delete")}
                    >
                      <AppIcon name="delete" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default ProductManagement;


