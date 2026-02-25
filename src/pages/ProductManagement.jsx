import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

function ProductManagement() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [sort, setSort] = useState("name_asc");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [productForm, setProductForm] = useState({
    name: "",
    sku: "",
    imageUrl: "",
    smallPrice: "",
    mediumPrice: "",
    largePrice: "",
    stockQuantity: "0",
    isActive: true,
  });
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadProducts = async () => {
    setDataLoading(true);
    setError("");
    try {
      const res = await api.get("/products");
      setProducts(res.data || []);
    } catch (err) {
      setError(err.response?.data || "Failed to load products.");
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

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

  const handleCreateProduct = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await api.post("/products", {
        name: productForm.name.trim(),
        sku: productForm.sku.trim(),
        imageUrl: productForm.imageUrl.trim() || null,
        price: Number(productForm.mediumPrice || 0),
        smallPrice: Number(productForm.smallPrice || 0),
        mediumPrice: Number(productForm.mediumPrice || 0),
        largePrice: Number(productForm.largePrice || 0),
        stockQuantity: Number(productForm.stockQuantity || 0),
        isActive: productForm.isActive,
      });

      setProductForm({
        name: "",
        sku: "",
        imageUrl: "",
        smallPrice: "",
        mediumPrice: "",
        largePrice: "",
        stockQuantity: "",
        isActive: true,
      });
      setMessage("Product created.");
      await loadProducts();
    } catch (err) {
      setError(err.response?.data || "Failed to create product.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (id) => {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await api.delete(`/products/${id}`);
      setMessage("Product deleted.");
      await loadProducts();
    } catch (err) {
      setError(err.response?.data || "Failed to delete product.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-card">
      <h2>Product Management</h2>
      <div className="settings-image-section">
        <div className="filter-toolbar">
          <input
            className="filter-input"
            placeholder="Search product or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value)}>
            <option value="all">All Stock</option>
            <option value="inStock">In Stock Only</option>
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="name_asc">Name A-Z</option>
            <option value="name_desc">Name Z-A</option>
            <option value="price_asc">Price Low-High</option>
            <option value="price_desc">Price High-Low</option>
            <option value="stock_desc">Stock High-Low</option>
            <option value="stock_asc">Stock Low-High</option>
            <option value="newest">Newest</option>
          </select>
          <input
            className="filter-input filter-mini"
            type="number"
            step="0.01"
            placeholder="Min $"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
          />
          <input
            className="filter-input filter-mini"
            type="number"
            step="0.01"
            placeholder="Max $"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          />
        </div>

        <form className="product-form" onSubmit={handleCreateProduct}>
          <input
            placeholder="Name"
            value={productForm.name}
            onChange={(e) => setProductForm((prev) => ({ ...prev, name: e.target.value }))}
            required
          />
          <input
            placeholder="SKU"
            value={productForm.sku}
            onChange={(e) => setProductForm((prev) => ({ ...prev, sku: e.target.value }))}
            required
          />
          <input
            placeholder="Image URL"
            value={productForm.imageUrl}
            onChange={(e) => setProductForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
          />
          <input
            type="number"
            step="0.01"
            placeholder="Small Price"
            value={productForm.smallPrice}
            onChange={(e) => setProductForm((prev) => ({ ...prev, smallPrice: e.target.value }))}
            required
          />
          <input
            type="number"
            step="0.01"
            placeholder="Medium Price"
            value={productForm.mediumPrice}
            onChange={(e) => setProductForm((prev) => ({ ...prev, mediumPrice: e.target.value }))}
            required
          />
          <input
            type="number"
            step="0.01"
            placeholder="Large Price"
            value={productForm.largePrice}
            onChange={(e) => setProductForm((prev) => ({ ...prev, largePrice: e.target.value }))}
            required
          />
          <input
            type="number"
            placeholder="Stock"
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
            Active
          </label>
          <button className="primary-btn" type="submit" disabled={loading}>
            {loading ? "Saving..." : "Add Product"}
          </button>
        </form>

        {message ? <p className="success-text">{message}</p> : null}
        {error ? <p className="form-error">{error}</p> : null}
        {dataLoading ? <p className="muted-text">Loading products...</p> : null}

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
                  {Number(product.largePrice ?? product.price).toFixed(2)} | Stock{" "}
                  {Number(product.stockQuantity || 0)}
                </div>
              </div>
              <button
                className="cancel-btn"
                type="button"
                disabled={loading}
                onClick={() => handleDeleteProduct(product.id)}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ProductManagement;
