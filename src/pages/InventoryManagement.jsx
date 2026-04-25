import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import gateway from "../services/gateway";
import useI18n from "../i18n/useI18n";
import AppIcon from "../components/common/AppIcon";
import {
  convertKhrToUsd,
  convertUsdToKhr,
  formatUsdAsKhr,
  formatUsdAsKhrInputValue,
} from "../utils/currency";
import { getProductImageUrl } from "../utils/mediaUrl";

const DEFAULT_LOW_STOCK_THRESHOLD = 10;
const REQUIRED_IMPORT_HEADERS = ["name", "sku"];
const EXPORT_HEADERS = [
  "name",
  "sku",
  "imageUrl",
  "smallPrice",
  "mediumPrice",
  "largePrice",
  "stockQuantity",
  "isActive",
];
const DEFAULT_ADD_PRODUCT_FORM = {
  name: "",
  sku: "",
  imageUrl: "",
  smallPrice: "0",
  mediumPrice: "0",
  largePrice: "0",
  stockQuantity: "0",
  isActive: true,
};

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

const normalizeCsvHeader = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_-\s]/g, "");

const parseCsvRows = (text) => {
  const normalizedText = String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (!normalizedText.trim()) {
    return [];
  }

  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let i = 0; i < normalizedText.length; i += 1) {
    const char = normalizedText[i];
    const nextChar = normalizedText[i + 1];

    if (char === "\"") {
      if (inQuotes && nextChar === "\"") {
        value += "\"";
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(value);
      value = "";
      continue;
    }

    if (char === "\n" && !inQuotes) {
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
      continue;
    }

    value += char;
  }

  row.push(value);
  rows.push(row);

  return rows.filter((cells) => cells.some((cell) => String(cell || "").trim() !== ""));
};

const parseNumberOrNull = (value) => {
  const text = String(value || "").trim();
  if (!text) {
    return null;
  }

  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseIntegerOrNull = (value) => {
  const text = String(value || "").trim();
  if (!text) {
    return null;
  }

  const parsed = Number.parseInt(text, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseBooleanOrNull = (value) => {
  const text = String(value || "").trim().toLowerCase();
  if (!text) {
    return true;
  }

  if (["true", "1", "yes", "y", "active"].includes(text)) {
    return true;
  }

  if (["false", "0", "no", "n", "inactive"].includes(text)) {
    return false;
  }

  return null;
};

const toCsvCell = (value) => {
  const raw = value === null || value === undefined ? "" : String(value);
  const escaped = raw.replace(/"/g, "\"\"");
  return `"${escaped}"`;
};

function InventoryManagement() {
  const { language, t } = useI18n();
  const importFileInputRef = useRef(null);
  const productImageInputRef = useRef(null);
  const [lowStockThreshold, setLowStockThreshold] = useState(DEFAULT_LOW_STOCK_THRESHOLD);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [importingCsv, setImportingCsv] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [addProductForm, setAddProductForm] = useState(DEFAULT_ADD_PRODUCT_FORM);
  const [selectedProductImageFile, setSelectedProductImageFile] = useState(null);
  const [adjustingProductId, setAdjustingProductId] = useState(null);
  const [uploadingProductImage, setUploadingProductImage] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadInventory = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [summaryData, productsData] = await Promise.all([
        gateway.products.inventorySummary({ lowStockThreshold }),
        gateway.products.getAll(),
      ]);

      if (summaryData?.lowStockThreshold >= 0) {
        setLowStockThreshold(Number(summaryData.lowStockThreshold));
      }
      setProducts(productsData || []);
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

  const closeAddProductModal = useCallback(() => {
    if (creatingProduct) {
      return;
    }

    setShowAddProductModal(false);
    setEditingProductId(null);
    setAddProductForm(DEFAULT_ADD_PRODUCT_FORM);
    setSelectedProductImageFile(null);
  }, [creatingProduct]);

  useEffect(() => {
    if (!showAddProductModal) {
      return;
    }

    const handleEscClose = (event) => {
      if (event.key === "Escape") {
        closeAddProductModal();
      }
    };

    window.addEventListener("keydown", handleEscClose);
    return () => {
      window.removeEventListener("keydown", handleEscClose);
    };
  }, [showAddProductModal, closeAddProductModal]);

  const handleOpenAddProductModal = () => {
    setError("");
    setMessage("");
    setEditingProductId(null);
    setAddProductForm(DEFAULT_ADD_PRODUCT_FORM);
    setSelectedProductImageFile(null);
    setShowAddProductModal(true);
  };

  const handleOpenEditProductModal = (product) => {
    setError("");
    setMessage("");
    setEditingProductId(product.id);
    setSelectedProductImageFile(null);
    setAddProductForm({
      name: product.name || "",
      sku: product.sku || "",
      imageUrl: product.imageUrl || "",
      smallPrice: formatUsdAsKhrInputValue(product.smallPrice ?? product.price ?? 0),
      mediumPrice: formatUsdAsKhrInputValue(product.mediumPrice ?? product.price ?? 0),
      largePrice: formatUsdAsKhrInputValue(product.largePrice ?? product.price ?? 0),
      stockQuantity: String(Number(product.stockQuantity ?? 0)),
      isActive: Boolean(product.isActive),
    });
    setShowAddProductModal(true);
  };

  const handleSubmitAddProduct = useCallback(async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setCreatingProduct(true);

    try {
      const payload = {
        name: addProductForm.name.trim(),
        sku: addProductForm.sku.trim(),
        imageUrl: addProductForm.imageUrl.trim() || null,
        price: convertKhrToUsd(addProductForm.mediumPrice || 0),
        smallPrice: convertKhrToUsd(addProductForm.smallPrice || 0),
        mediumPrice: convertKhrToUsd(addProductForm.mediumPrice || 0),
        largePrice: convertKhrToUsd(addProductForm.largePrice || 0),
        stockQuantity: Number(addProductForm.stockQuantity || 0),
        isActive: Boolean(addProductForm.isActive),
      };

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

      if (selectedProductImageFile) {
        if (!targetProductId) {
          throw new Error("Missing product id for image upload.");
        }
        await gateway.products.uploadImage(targetProductId, selectedProductImageFile);
      }
      setShowAddProductModal(false);
      setEditingProductId(null);
      setAddProductForm(DEFAULT_ADD_PRODUCT_FORM);
      setSelectedProductImageFile(null);
      await loadInventory();
    } catch (err) {
      const apiError = err.response?.data;
      if (typeof apiError === "string" && apiError.trim()) {
        setError(apiError);
      } else {
        setError(
          editingProductId
            ? t("productManagement.failedToUpdateProduct")
            : t("productManagement.failedToCreateProduct")
        );
      }
    } finally {
      setCreatingProduct(false);
    }
  }, [addProductForm, editingProductId, loadInventory, selectedProductImageFile, t]);

  const handlePickProductImage = async (event) => {
    const selectedFile = event.target.files?.[0];
    event.target.value = "";

    if (!selectedFile) {
      return;
    }

    setError("");
    setMessage("");
    setUploadingProductImage(true);
    try {
      setSelectedProductImageFile(selectedFile);
      setMessage(`${selectedFile.name} selected. Click save to upload.`);
    } finally {
      setUploadingProductImage(false);
    }
  };

  const handleOpenImportPicker = () => {
    importFileInputRef.current?.click();
  };

  const handleImportCsv = async (event) => {
    const selectedFile = event.target.files?.[0];
    event.target.value = "";

    if (!selectedFile) {
      return;
    }

    setImportingCsv(true);
    setMessage("");
    setError("");

    try {
      const text = await selectedFile.text();
      const rows = parseCsvRows(text);

      if (rows.length < 2) {
        setError(t("inventoryManagement.invalidCsvFile"));
        return;
      }

      const rawHeaders = rows[0].map((header) => normalizeCsvHeader(header));
      const headerIndexes = new Map();
      rawHeaders.forEach((header, index) => {
        if (header && !headerIndexes.has(header)) {
          headerIndexes.set(header, index);
        }
      });

      const missingHeaders = REQUIRED_IMPORT_HEADERS.filter((header) => !headerIndexes.has(header));
      if (missingHeaders.length > 0) {
        setError(
          t("inventoryManagement.missingCsvHeaders", {
            headers: missingHeaders.join(", "),
          })
        );
        return;
      }

      const validRows = [];
      const validationErrors = [];

      const getCellValue = (cells, aliases) => {
        for (const alias of aliases) {
          const index = headerIndexes.get(alias);
          if (index !== undefined) {
            return String(cells[index] || "").trim();
          }
        }
        return "";
      };

      rows.slice(1).forEach((cells, rowIndex) => {
        const lineNumber = rowIndex + 2;
        const isRowEmpty = cells.every((cell) => String(cell || "").trim() === "");
        if (isRowEmpty) {
          return;
        }

        const name = getCellValue(cells, ["name"]);
        const sku = getCellValue(cells, ["sku"]);
        const imageUrl = getCellValue(cells, ["imageurl"]);
        const mediumPriceValue = getCellValue(cells, ["mediumprice", "price"]);
        const smallPriceValue = getCellValue(cells, ["smallprice"]);
        const largePriceValue = getCellValue(cells, ["largeprice"]);
        const stockQuantityValue = getCellValue(cells, ["stockquantity", "stock"]);
        const isActiveValue = getCellValue(cells, ["isactive", "active"]);

        const mediumPrice = parseNumberOrNull(mediumPriceValue);
        const smallPrice = parseNumberOrNull(smallPriceValue);
        const largePrice = parseNumberOrNull(largePriceValue);
        const stockQuantity = parseIntegerOrNull(stockQuantityValue);
        const isActive = parseBooleanOrNull(isActiveValue);

        if (!name || !sku) {
          validationErrors.push(`Line ${lineNumber}: Missing required name/sku.`);
          return;
        }

        if (mediumPrice === null || mediumPrice < 0) {
          validationErrors.push(`Line ${lineNumber}: Invalid mediumPrice/price.`);
          return;
        }

        if ((smallPrice !== null && smallPrice < 0) || (largePrice !== null && largePrice < 0)) {
          validationErrors.push(`Line ${lineNumber}: Size prices must be non-negative.`);
          return;
        }

        if (stockQuantity !== null && stockQuantity < 0) {
          validationErrors.push(`Line ${lineNumber}: Stock quantity must be non-negative.`);
          return;
        }

        if (isActive === null) {
          validationErrors.push(`Line ${lineNumber}: Invalid isActive value.`);
          return;
        }

        validRows.push({
          lineNumber,
          payload: {
            name,
            sku,
            imageUrl: imageUrl || null,
            price: convertKhrToUsd(mediumPrice),
            smallPrice: smallPrice === null ? null : convertKhrToUsd(smallPrice),
            mediumPrice: convertKhrToUsd(mediumPrice),
            largePrice: largePrice === null ? null : convertKhrToUsd(largePrice),
            stockQuantity: stockQuantity ?? 0,
            isActive,
          },
        });
      });

      if (validRows.length === 0) {
        setError(t("inventoryManagement.importNoValidRows"));
        return;
      }

      let successCount = 0;
      let failedCount = 0;
      const importErrors = [];

      for (const row of validRows) {
        try {
          await gateway.products.create(row.payload);
          successCount += 1;
        } catch (err) {
          failedCount += 1;
          const apiError = err.response?.data;
          const detail =
            typeof apiError === "string" && apiError.trim()
              ? apiError
              : t("inventoryManagement.failedToImportRow");
          importErrors.push(`Line ${row.lineNumber}: ${detail}`);
        }
      }

      if (successCount > 0) {
        await loadInventory();
      }

      setMessage(
        t("inventoryManagement.importSummary", {
          success: successCount,
          failed: failedCount + validationErrors.length,
        })
      );

      if (validationErrors.length > 0 || importErrors.length > 0) {
        setError([...validationErrors, ...importErrors].slice(0, 4).join(" | "));
      }
    } catch {
      setError(t("inventoryManagement.failedToImportCsv"));
    } finally {
      setImportingCsv(false);
    }
  };

  const handleExportCsv = () => {
    setExportingCsv(true);
    setMessage("");
    setError("");

    try {
      if (filteredProducts.length === 0) {
        setError(t("inventoryManagement.noProductsToExport"));
        return;
      }

      const csvRows = [
        EXPORT_HEADERS.join(","),
        ...filteredProducts.map((product) =>
          [
            toCsvCell(product.name || ""),
            toCsvCell(product.sku || ""),
            toCsvCell(product.imageUrl || ""),
            toCsvCell(
              product.smallPrice === null || product.smallPrice === undefined
                ? ""
                : convertUsdToKhr(product.smallPrice)
            ),
            toCsvCell(convertUsdToKhr(product.mediumPrice ?? product.price ?? "")),
            toCsvCell(
              product.largePrice === null || product.largePrice === undefined
                ? ""
                : convertUsdToKhr(product.largePrice)
            ),
            toCsvCell(Number(product.stockQuantity || 0)),
            toCsvCell(Boolean(product.isActive)),
          ].join(",")
        ),
      ];

      const csvBlob = new Blob([csvRows.join("\r\n")], {
        type: "text/csv;charset=utf-8;",
      });
      const fileUrl = URL.createObjectURL(csvBlob);
      const downloadLink = document.createElement("a");
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");

      downloadLink.href = fileUrl;
      downloadLink.download = `inventory-${timestamp}.csv`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(fileUrl);

      setMessage(
        t("inventoryManagement.exportSuccess", {
          count: filteredProducts.length,
        })
      );
    } finally {
      setExportingCsv(false);
    }
  };

  const handleQuickAdjustStock = async (productId, quantityChange) => {
    setAdjustingProductId(productId);
    setError("");
    setMessage("");

    try {
      await gateway.products.adjustStock(productId, {
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

  const getItemImageUrl = (product) => getProductImageUrl(product, "64x64");

  return (
    <section className="inventory-modern-page">
      <input
        ref={importFileInputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handleImportCsv}
        style={{ display: "none" }}
      />

      {showAddProductModal ? (
        <div
          className="inventory-modal-backdrop"
          role="presentation"
          onClick={closeAddProductModal}
        >
          <div
            className="inventory-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-product-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="inventory-modal-header">
              <div>
                <h3 id="add-product-modal-title">
                  {editingProductId
                    ? t("productManagement.editProduct")
                    : t("inventoryManagement.addProduct")}
                </h3>
                <p className="muted-text">{t("inventoryManagement.subtitle")}</p>
              </div>
              <button
                type="button"
                className="screen-btn btn-with-icon"
                onClick={closeAddProductModal}
                disabled={creatingProduct}
              >
                <AppIcon name="close" />
                {t("common.close")}
              </button>
            </div>

            <form className="inventory-modal-form" onSubmit={handleSubmitAddProduct}>
              <label className="inventory-modal-field">
                <span className="inventory-modal-label">{t("productManagement.name")}</span>
                <input
                  className="inventory-modal-input"
                  value={addProductForm.name}
                  onChange={(event) =>
                    setAddProductForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  autoFocus
                  required
                />
              </label>

              <label className="inventory-modal-field">
                <span className="inventory-modal-label">{t("productManagement.sku")}</span>
                <input
                  className="inventory-modal-input"
                  value={addProductForm.sku}
                  onChange={(event) =>
                    setAddProductForm((prev) => ({ ...prev, sku: event.target.value }))
                  }
                  required
                />
              </label>

              <label className="inventory-modal-field inventory-modal-field-wide">
                <span className="inventory-modal-label">{t("productManagement.imageUrl")}</span>
                <div className="inventory-image-url-input-group">
                  <input
                    className="inventory-modal-input"
                    value={addProductForm.imageUrl}
                    onChange={(event) =>
                      setAddProductForm((prev) => ({ ...prev, imageUrl: event.target.value }))
                    }
                  />
                  <button
                    className="screen-btn btn-with-icon"
                    type="button"
                    onClick={() => productImageInputRef.current?.click()}
                    disabled={creatingProduct || uploadingProductImage}
                  >
                    <AppIcon name="plus" />
                    {uploadingProductImage
                      ? t("productManagement.uploadingImage")
                      : t("productManagement.uploadImage")}
                  </button>
                  <button
                    className="cancel-btn btn-with-icon"
                    type="button"
                    onClick={() => {
                      setSelectedProductImageFile(null);
                      setAddProductForm((prev) => ({ ...prev, imageUrl: "" }));
                    }}
                    disabled={
                      creatingProduct
                      || uploadingProductImage
                      || (!addProductForm.imageUrl.trim() && !selectedProductImageFile)
                    }
                  >
                    <AppIcon name="cancel" />
                    {t("productManagement.clearImage")}
                  </button>
                </div>
                {selectedProductImageFile ? (
                  <p className="muted-text">{selectedProductImageFile.name}</p>
                ) : null}
                <input
                  ref={productImageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePickProductImage}
                  style={{ display: "none" }}
                />
              </label>

              <label className="inventory-modal-field">
                <span className="inventory-modal-label">{t("productManagement.smallPrice")}</span>
                <input
                  className="inventory-modal-input"
                  type="number"
                  step="1"
                  min="0"
                  value={addProductForm.smallPrice}
                  onChange={(event) =>
                    setAddProductForm((prev) => ({ ...prev, smallPrice: event.target.value }))
                  }
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
                  value={addProductForm.mediumPrice}
                  onChange={(event) =>
                    setAddProductForm((prev) => ({ ...prev, mediumPrice: event.target.value }))
                  }
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
                  value={addProductForm.largePrice}
                  onChange={(event) =>
                    setAddProductForm((prev) => ({ ...prev, largePrice: event.target.value }))
                  }
                  required
                />
              </label>

              <label className="inventory-modal-field">
                <span className="inventory-modal-label">{t("productManagement.stock")}</span>
                <input
                  className="inventory-modal-input"
                  type="number"
                  min="0"
                  value={addProductForm.stockQuantity}
                  onChange={(event) =>
                    setAddProductForm((prev) => ({ ...prev, stockQuantity: event.target.value }))
                  }
                  required
                />
              </label>

              <label className="muted-text inventory-modal-checkbox inventory-modal-field-wide">
                <input
                  type="checkbox"
                  checked={addProductForm.isActive}
                  onChange={(event) =>
                    setAddProductForm((prev) => ({ ...prev, isActive: event.target.checked }))
                  }
                />
                {t("productManagement.activeLabel")}
              </label>

              <div className="product-form-actions inventory-modal-actions">
                <button className="primary-btn btn-with-icon" type="submit" disabled={creatingProduct}>
                  <AppIcon name={editingProductId ? "save" : "plus"} />
                  {creatingProduct
                    ? t("productManagement.saving")
                    : editingProductId
                      ? t("productManagement.updateProduct")
                      : t("productManagement.addProduct")}
                </button>
                <button
                  className="screen-btn btn-with-icon"
                  type="button"
                  onClick={closeAddProductModal}
                  disabled={creatingProduct}
                >
                  <AppIcon name="cancel" />
                  {t("common.cancel")}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

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
            onClick={handleOpenAddProductModal}
          >
            <AppIcon name="plus" />
            {t("inventoryManagement.addProduct")}
          </button>

          <button
            className="inventory-add-btn"
            type="button"
            onClick={handleOpenImportPicker}
            disabled={importingCsv || loading}
          >
            <AppIcon name="plus" />
            {importingCsv
              ? t("inventoryManagement.importingCsv")
              : t("inventoryManagement.importCsv")}
          </button>

          <button
            className="inventory-add-btn"
            type="button"
            onClick={handleExportCsv}
            disabled={exportingCsv || loading}
          >
            <AppIcon name="save" />
            {exportingCsv
              ? t("inventoryManagement.exportingCsv")
              : t("inventoryManagement.exportCsv")}
          </button>
        </div>
      </div>

      <p className="muted-text">{t("inventoryManagement.importColumnsHint")}</p>

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
                    {formatUsdAsKhr(Number(product.mediumPrice ?? product.price ?? 0), language)}
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
                      className="inventory-action-btn inventory-edit-action-btn"
                      disabled={isBusy}
                      onClick={() => handleOpenEditProductModal(product)}
                      aria-label={t("productManagement.edit")}
                      title={t("productManagement.edit")}
                    >
                      <AppIcon name="edit" />
                    </button>
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
