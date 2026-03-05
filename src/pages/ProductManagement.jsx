import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import gateway from "../services/gateway";
import useI18n from "../i18n/useI18n";
import AppIcon from "../components/common/AppIcon";
import { readImageFileAsDataUrl } from "../utils/imageFile";

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
  const { t } = useI18n();
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

  const resetProductForm = () => {
    setProductForm(defaultProductForm);
    setEditingProductId(null);
  };

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

  const handleSubmitProduct = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const payload = {
      name: productForm.name.trim(),
      sku: productForm.sku.trim(),
      imageUrl: productForm.imageUrl.trim() || null,
      price: Number(productForm.mediumPrice || 0),
      smallPrice: Number(productForm.smallPrice || 0),
      mediumPrice: Number(productForm.mediumPrice || 0),
      largePrice: Number(productForm.largePrice || 0),
      stockQuantity: Number(productForm.stockQuantity || 0),
      isActive: productForm.isActive,
    };

    try {
      if (editingProductId) {
        await gateway.products.update(editingProductId, payload);
        setMessage(t("productManagement.productUpdated"));
      } else {
        await gateway.products.create(payload);
        setMessage(t("productManagement.productCreated"));
      }

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
    setEditingProductId(product.id);
    setProductForm({
      name: product.name || "",
      sku: product.sku || "",
      imageUrl: product.imageUrl || "",
      smallPrice: String(Number(product.smallPrice ?? product.price ?? 0)),
      mediumPrice: String(Number(product.mediumPrice ?? product.price ?? 0)),
      largePrice: String(Number(product.largePrice ?? product.price ?? 0)),
      stockQuantity: String(Number(product.stockQuantity ?? 0)),
      isActive: Boolean(product.isActive),
    });
  };

  const handleCancelEdit = () => {
    setError("");
    setMessage("");
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
      const imageDataUrl = await readImageFileAsDataUrl(selectedFile);
      setProductForm((prev) => ({ ...prev, imageUrl: imageDataUrl }));
    } catch {
      setError(t("productManagement.failedToReadImage"));
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
    <div className="page-card">
      <h2>{t("productManagement.title")}</h2>
      <div className="settings-image-section">
        <div className="filter-toolbar">
          <input
            className="filter-input"
            placeholder={t("productManagement.searchProductOrSku")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
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
            className="filter-input filter-mini"
            type="number"
            step="0.01"
            placeholder={t("productManagement.minPrice")}
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
          />
          <input
            className="filter-input filter-mini"
            type="number"
            step="0.01"
            placeholder={t("productManagement.maxPrice")}
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          />
        </div>

        <h3>{editingProductId ? t("productManagement.editProduct") : t("productManagement.addProduct")}</h3>
        <form className="product-form" onSubmit={handleSubmitProduct}>
          <input
            placeholder={t("productManagement.name")}
            value={productForm.name}
            onChange={(e) => setProductForm((prev) => ({ ...prev, name: e.target.value }))}
            required
          />
          <input
            placeholder={t("productManagement.sku")}
            value={productForm.sku}
            onChange={(e) => setProductForm((prev) => ({ ...prev, sku: e.target.value }))}
            required
          />
          <div className="image-url-input-group">
            <input
              placeholder={t("productManagement.imageUrl")}
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
              onClick={() => setProductForm((prev) => ({ ...prev, imageUrl: "" }))}
              disabled={loading || uploadingImage || !productForm.imageUrl.trim()}
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
          <input
            type="number"
            step="0.01"
            placeholder={t("productManagement.smallPrice")}
            value={productForm.smallPrice}
            onChange={(e) => setProductForm((prev) => ({ ...prev, smallPrice: e.target.value }))}
            required
          />
          <input
            type="number"
            step="0.01"
            placeholder={t("productManagement.mediumPrice")}
            value={productForm.mediumPrice}
            onChange={(e) => setProductForm((prev) => ({ ...prev, mediumPrice: e.target.value }))}
            required
          />
          <input
            type="number"
            step="0.01"
            placeholder={t("productManagement.largePrice")}
            value={productForm.largePrice}
            onChange={(e) => setProductForm((prev) => ({ ...prev, largePrice: e.target.value }))}
            required
          />
          <input
            type="number"
            placeholder={t("productManagement.stock")}
            value={productForm.stockQuantity}
            onChange={(e) => setProductForm((prev) => ({ ...prev, stockQuantity: e.target.value }))}
            required
          />
          <label className="muted-text">
            <input
              type="checkbox"
              checked={productForm.isActive}
              onChange={(e) => setProductForm((prev) => ({ ...prev, isActive: e.target.checked }))}
            />{" "}
            {t("productManagement.activeLabel")}
          </label>
          <div className="product-form-actions">
            <button className="primary-btn btn-with-icon" type="submit" disabled={loading}>
              <AppIcon name={editingProductId ? "save" : "plus"} />
              {loading
                ? t("productManagement.saving")
                : editingProductId
                  ? t("productManagement.updateProduct")
                  : t("productManagement.addProduct")}
            </button>
            {editingProductId ? (
              <button
                className="screen-btn btn-with-icon"
                type="button"
                onClick={handleCancelEdit}
                disabled={loading}
              >
                <AppIcon name="cancel" />
                {t("productManagement.cancelEdit")}
              </button>
            ) : null}
          </div>
        </form>

        {message ? <p className="success-text">{message}</p> : null}
        {error ? <p className="form-error">{error}</p> : null}
        {dataLoading ? <p className="muted-text">{t("productManagement.loadingProducts")}</p> : null}

        <div className="product-admin-list">
          {filteredProducts.map((product) => (
            <div className="list-row product-admin-row" key={product.id}>
              <div>
                <div>
                  {product.name} ({product.sku})
                </div>
                <div className="muted-text">
                  S ${Number(product.smallPrice ?? product.price).toFixed(2)} | M $
                  {Number(product.mediumPrice ?? product.price).toFixed(2)} | L $
                  {Number(product.largePrice ?? product.price).toFixed(2)} | {t("productManagement.stockLabel")}{" "}
                  {Number(product.stockQuantity || 0)}
                </div>
              </div>
              <div className="product-admin-actions">
                <input
                  className="filter-input filter-mini stock-adjust-input"
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
                <button
                  className="screen-btn btn-with-icon"
                  type="button"
                  disabled={loading}
                  onClick={() => handleStartEdit(product)}
                >
                  <AppIcon name="edit" />
                  {t("productManagement.edit")}
                </button>
                <button
                  className="cancel-btn btn-with-icon"
                  type="button"
                  disabled={loading}
                  onClick={() => handleDeleteProduct(product.id)}
                >
                  <AppIcon name="delete" />
                  {t("common.delete")}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ProductManagement;


