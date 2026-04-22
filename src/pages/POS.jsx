import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import ProductGrid from "../components/pos/ProductGrid";
import Cart from "../components/pos/Cart";
import gateway from "../services/gateway";
import useI18n from "../i18n/useI18n";
import AppIcon from "../components/common/AppIcon";
import { convertUsdToKhr, formatUsdAsKhr } from "../utils/currency";

const POS_CART_STORAGE_KEY = "pos.cart.items.v1";

const loadStoredCartItems = () => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawCartItems = window.localStorage.getItem(POS_CART_STORAGE_KEY);
    if (!rawCartItems) {
      return [];
    }

    const parsedCartItems = JSON.parse(rawCartItems);
    if (!Array.isArray(parsedCartItems)) {
      return [];
    }

    return parsedCartItems
      .map((item) => {
        const selectedSize = item.selectedSize || "Medium";
        return {
          ...item,
          selectedSize,
          cartKey: item.cartKey || `${item.id}-${selectedSize}`,
          quantity: Number.isFinite(item.quantity) && item.quantity > 0
            ? item.quantity
            : 1,
        };
      })
      .filter((item) => item.id !== undefined && item.id !== null);
  } catch {
    return [];
  }
};

const createOrderRangeBoundary = (dateValue, mode) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue);
  if (!match) {
    return null;
  }

  const [, year, month, day] = match;
  return mode === "end"
    ? new Date(Number(year), Number(month) - 1, Number(day) + 1, 0, 0, 0, 0)
    : new Date(Number(year), Number(month) - 1, Number(day), 0, 0, 0, 0);
};

const buildOrderRangeParams = (fromDateValue, toDateValue) => {
  const params = {};
  const fromBoundary = createOrderRangeBoundary(fromDateValue, "start");
  const toBoundary = createOrderRangeBoundary(toDateValue, "end");

  if (fromBoundary) {
    params.fromUtc = fromBoundary.toISOString();
  }

  if (toBoundary) {
    params.toUtc = toBoundary.toISOString();
  }

  return params;
};

const escapeCsvValue = (value) => {
  const stringValue = String(value ?? "");
  if (!/[",\r\n]/.test(stringValue)) {
    return stringValue;
  }

  return `"${stringValue.replaceAll('"', '""')}"`;
};

const buildOrdersCsvFileName = (fromDateValue, toDateValue) => {
  const suffix = [fromDateValue || "all", toDateValue || "all"].join("_to_");
  return `orders-invoice-list-${suffix}.csv`;
};

function POS() {
  const { language, t } = useI18n();
  const location = useLocation();
  const isAdmin = (localStorage.getItem("role") || "") === "Admin";
  const [activeScreen, setActiveScreen] = useState("items");
  const [cartItems, setCartItems] = useState(() => loadStoredCartItems());
  const [orders, setOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [selectedOrderSnapshot, setSelectedOrderSnapshot] = useState(null);
  const [selectedOrderLoading, setSelectedOrderLoading] = useState(false);
  const [lastCheckoutOrder, setLastCheckoutOrder] = useState(null);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [checkoutAlert, setCheckoutAlert] = useState({ open: false, message: "" });
  const checkoutAlertTimeoutRef = useRef(null);
  const cartHighlightTimeoutRef = useRef(null);
  const selectedOrderDetailRef = useRef(null);
  const handledNotificationEventKeyRef = useRef("");
  const [recentAddToken, setRecentAddToken] = useState(0);
  const [recentAddQuantity, setRecentAddQuantity] = useState(1);
  const [highlightedCartKey, setHighlightedCartKey] = useState("");
  const [invoiceFromDate, setInvoiceFromDate] = useState("");
  const [invoiceToDate, setInvoiceToDate] = useState("");

  const getDisplaySize = useCallback((size) => {
    if (size === "Small") return t("common.sizeSmall");
    if (size === "Large") return t("common.sizeLarge");
    return t("common.sizeMedium");
  }, [t]);

  const fetchOrders = useCallback(async (params) => {
    setLoadingOrders(true);
    try {
      const data = await gateway.orders.getAll(params);
      setOrders(data || []);
    } catch {
      setError(t("pos.couldNotLoadOrderList"));
    } finally {
      setLoadingOrders(false);
    }
  }, [t]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      if (cartItems.length === 0) {
        window.localStorage.removeItem(POS_CART_STORAGE_KEY);
      } else {
        window.localStorage.setItem(POS_CART_STORAGE_KEY, JSON.stringify(cartItems));
      }
    } catch {
      // Ignore localStorage write failures; cart still works in memory.
    }
  }, [cartItems]);

  useEffect(() => {
    return () => {
      if (checkoutAlertTimeoutRef.current) {
        clearTimeout(checkoutAlertTimeoutRef.current);
      }
      if (cartHighlightTimeoutRef.current) {
        clearTimeout(cartHighlightTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleRealtimeOrderNotification = () => {
      fetchOrders(buildOrderRangeParams(invoiceFromDate, invoiceToDate));
    };

    window.addEventListener("pos-order-notification", handleRealtimeOrderNotification);
    return () => {
      window.removeEventListener("pos-order-notification", handleRealtimeOrderNotification);
    };
  }, [fetchOrders, invoiceFromDate, invoiceToDate]);

  useEffect(() => {
    if (!selectedOrderId) {
      return;
    }

    const matchingOrder = orders.find((order) => order.id === selectedOrderId);
    if (matchingOrder) {
      setSelectedOrderSnapshot(matchingOrder);
    }
  }, [orders, selectedOrderId]);

  const openOrderDetails = useCallback(async (orderId) => {
    const normalizedOrderId = Number(orderId);
    if (!Number.isInteger(normalizedOrderId) || normalizedOrderId <= 0) {
      return;
    }

    setActiveScreen("invoices");
    setSelectedOrderId(normalizedOrderId);
    setError("");

    const existingOrder = orders.find((order) => order.id === normalizedOrderId);
    if (existingOrder) {
      setSelectedOrderSnapshot(existingOrder);
      setSelectedOrderLoading(false);
      return;
    }

    setSelectedOrderLoading(true);
    try {
      const order = await gateway.orders.getById(normalizedOrderId);
      setSelectedOrderSnapshot(order || null);
    } catch {
      setError(t("pos.couldNotLoadSelectedOrder"));
    } finally {
      setSelectedOrderLoading(false);
    }
  }, [orders, t]);

  useEffect(() => {
    const incomingOrderId = Number(location.state?.selectedOrderId);
    const incomingEventKey = String(location.state?.selectedOrderEventKey || "");

    if (!Number.isInteger(incomingOrderId) || incomingOrderId <= 0 || !incomingEventKey) {
      return;
    }

    if (handledNotificationEventKeyRef.current === incomingEventKey) {
      return;
    }

    handledNotificationEventKeyRef.current = incomingEventKey;
    void openOrderDetails(incomingOrderId);
  }, [location.state, openOrderDetails]);

  useEffect(() => {
    if (activeScreen !== "invoices" || !selectedOrderId) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      selectedOrderDetailRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 120);

    return () => window.clearTimeout(timeoutId);
  }, [activeScreen, selectedOrderId, selectedOrderLoading]);

  const handleAddItem = (item) => {
    const selectedSize = item.selectedSize || "Medium";
    const cartKey = `${item.id}-${selectedSize}`;
    const parsedQuantity = Number.parseInt(String(item.quantity ?? 1), 10);
    const addQuantity = Number.isFinite(parsedQuantity) && parsedQuantity > 0
      ? parsedQuantity
      : 1;

    setError("");
    setSuccess("");
    setCartItems((prevItems) => {
      const existing = prevItems.find((cartItem) => cartItem.cartKey === cartKey);
      if (existing) {
        return prevItems.map((cartItem) =>
          cartItem.cartKey === cartKey
            ? { ...cartItem, quantity: cartItem.quantity + addQuantity }
            : cartItem
        );
      }

      return [...prevItems, { ...item, selectedSize, cartKey, quantity: addQuantity }];
    });

    setHighlightedCartKey(cartKey);
    setRecentAddQuantity(addQuantity);
    setRecentAddToken((prev) => prev + 1);
    if (cartHighlightTimeoutRef.current) {
      clearTimeout(cartHighlightTimeoutRef.current);
    }
    cartHighlightTimeoutRef.current = window.setTimeout(() => {
      setHighlightedCartKey("");
    }, 900);
  };

  const handleRemoveItem = (cartKey) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.cartKey !== cartKey));
  };

  const totalAmount = useMemo(
    () =>
      cartItems.reduce(
        (sum, item) => sum + Number(item.price || 0) * item.quantity,
        0
      ),
    [cartItems]
  );

  const orderItems = useMemo(
    () =>
      orders.flatMap((order) =>
        (order.items || []).map((item) => ({
          orderId: order.id,
          productName: item.product?.name || `Product #${item.productId}`,
          size: item.size || "Medium",
          imageUrl:
            item.product?.imageUrl ||
            `https://placehold.co/80x80?text=${encodeURIComponent(
              item.product?.name || "Item"
            )}`,
          quantity: item.quantity,
          lineTotal: Number(item.lineTotal || 0),
        }))
      ),
    [orders]
  );

  const selectedOrder = useMemo(() => {
    if (!selectedOrderId) {
      return null;
    }

    return orders.find((order) => order.id === selectedOrderId)
      || (selectedOrderSnapshot?.id === selectedOrderId ? selectedOrderSnapshot : null);
  }, [orders, selectedOrderId, selectedOrderSnapshot]);

  const hasInvalidInvoiceRange =
    invoiceFromDate && invoiceToDate && invoiceToDate < invoiceFromDate;

  const getPaymentMethodLabel = useCallback((method) => {
    if (method === 1) return "Cash";
    if (method === 2) return "Card";
    if (method === 3) return "Transfer";
    if (method === 4) return "Other";
    return "Unknown";
  }, []);

  const notifyCheckoutSuccess = async (message) => {
    if (typeof window === "undefined") {
      return;
    }

    setCheckoutAlert({ open: true, message });
    if (checkoutAlertTimeoutRef.current) {
      clearTimeout(checkoutAlertTimeoutRef.current);
    }
    checkoutAlertTimeoutRef.current = window.setTimeout(() => {
      setCheckoutAlert({ open: false, message: "" });
    }, 2500);

    if (!("Notification" in window)) {
      return;
    }

    try {
      if (window.Notification.permission === "granted") {
        new window.Notification(t("pos.checkoutSuccessTitle"), { body: message });
        return;
      }

      if (window.Notification.permission !== "denied") {
        const permission = await window.Notification.requestPermission();
        if (permission === "granted") {
          new window.Notification(t("pos.checkoutSuccessTitle"), { body: message });
        }
      }
    } catch {
      // Ignore notification errors; alert already informs the user.
    }
  };

  const handleCheckout = async () => {
    setError("");
    setSuccess("");

    if (cartItems.length === 0) {
      setError(t("pos.cartIsEmpty"));
      return;
    }

    setCheckingOut(true);
    try {
      const createdOrder = await gateway.orders.checkout({
        taxPercent: 10,
        items: cartItems.map((item) => ({
          productId: item.id,
          size: item.selectedSize || "Medium",
          quantity: item.quantity,
        })),
        payments: [
          {
            method: 2,
            amount: Number(totalAmount.toFixed(2)) + Number((totalAmount * 0.1).toFixed(2)),
            reference: `POS-${Date.now()}`,
          },
        ],
      });

      setLastCheckoutOrder(createdOrder || null);
      setCartItems([]);
      const successMessage = createdOrder?.id
        ? t("pos.checkoutCompleteWithOrder", { id: createdOrder.id })
        : t("pos.checkoutComplete");
      setSuccess(successMessage);
      await notifyCheckoutSuccess(successMessage);
      await fetchOrders(buildOrderRangeParams(invoiceFromDate, invoiceToDate));
    } catch (err) {
      const apiError = err.response?.data;
      if (typeof apiError === "string" && apiError.trim()) {
        setError(apiError);
      } else if (apiError?.message) {
        setError(apiError.message);
      } else if (apiError?.title) {
        setError(apiError.title);
      } else {
        setError(t("pos.checkoutFailed"));
      }
    } finally {
      setCheckingOut(false);
    }
  };

  const handlePrintInvoice = (order) => {
    if (!order) {
      return;
    }

    const invoiceWindow = window.open("", "_blank", "width=420,height=760");
    if (!invoiceWindow) {
      setError(t("pos.popupBlocked"));
      return;
    }

    const escapeHtml = (value) =>
      String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");

    const itemsHtml = (order.items || [])
      .map((item) => {
        const productName = item.product?.name || `Product #${item.productId}`;
        const size = getDisplaySize(item.size || "Medium");
        const unitPrice = formatUsdAsKhr(Number(item.unitPrice || 0), language);
        const lineTotal = formatUsdAsKhr(Number(item.lineTotal || 0), language);
        return `
          <div class="receipt-item">
            <div class="item-name">${escapeHtml(productName)} (${escapeHtml(size)})</div>
            <div class="item-meta">
              <span>${item.quantity} x ${escapeHtml(unitPrice)}</span>
              <span>${escapeHtml(lineTotal)}</span>
            </div>
          </div>
        `;
      })
      .join("");

    const paymentTotal = (order.payments || []).reduce(
      (sum, payment) => sum + Number(payment.amount || 0),
      0
    );
    const orderDateText = new Date(order.createdAtUtc).toLocaleString();
    const statusLabel = getStatusLabel(order.status);
    const invoiceTitle = t("pos.invoiceTitle", { id: order.id });

    const html = `
      <html>
        <head>
          <title>${escapeHtml(invoiceTitle)}</title>
          <style>
            @page { size: 80mm auto; margin: 3mm; }
            * { box-sizing: border-box; }
            html, body {
              width: 74mm;
              margin: 0 auto;
              padding: 0;
              color: #111;
              background: #fff;
              font-family: "Courier New", Courier, monospace;
              font-size: 12px;
              line-height: 1.35;
            }
            .receipt {
              width: 100%;
              padding: 4px 2px;
            }
            .center { text-align: center; }
            .title {
              font-size: 16px;
              font-weight: 700;
              margin: 0;
            }
            .muted { color: #333; margin: 0; }
            .divider {
              border-top: 1px dashed #000;
              margin: 8px 0;
            }
            .line {
              display: flex;
              justify-content: space-between;
              gap: 8px;
            }
            .line span:last-child {
              text-align: right;
              white-space: nowrap;
            }
            .receipt-item {
              margin-bottom: 6px;
            }
            .item-name {
              word-break: break-word;
            }
            .item-meta {
              display: flex;
              justify-content: space-between;
              gap: 8px;
            }
            .total {
              font-size: 13px;
              font-weight: 700;
            }
            .footer {
              text-align: center;
              margin-top: 8px;
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <p class="title center">${escapeHtml(t("common.appName"))}</p>
            <p class="muted center">${escapeHtml(t("pos.invoiceReceipt"))}</p>
            <div class="divider"></div>

            <div class="line"><span>${escapeHtml(t("pos.orderLabel"))}</span><span>#${order.id}</span></div>
            <div class="line"><span>${escapeHtml(t("pos.dateLabel"))}</span><span>${escapeHtml(orderDateText)}</span></div>
            <div class="line"><span>${escapeHtml(t("pos.statusLabel"))}</span><span>${escapeHtml(statusLabel)}</span></div>

            <div class="divider"></div>
            ${itemsHtml || `<div class="center">${escapeHtml(t("pos.noItems"))}</div>`}
            <div class="divider"></div>

            <div class="line"><span>${escapeHtml(t("pos.subtotal"))}</span><span>${escapeHtml(formatUsdAsKhr(Number(order.subtotal || 0), language))}</span></div>
            <div class="line"><span>${escapeHtml(t("pos.tax"))}</span><span>${escapeHtml(formatUsdAsKhr(Number(order.taxAmount || 0), language))}</span></div>
            <div class="line total"><span>${escapeHtml(t("pos.total"))}</span><span>${escapeHtml(formatUsdAsKhr(Number(order.totalAmount || 0), language))}</span></div>
            <div class="line"><span>${escapeHtml(t("pos.paid"))}</span><span>${escapeHtml(formatUsdAsKhr(paymentTotal, language))}</span></div>

            <div class="divider"></div>
            <p class="footer">${escapeHtml(t("pos.thankYou"))}</p>
          </div>
        </body>
      </html>
    `;

    invoiceWindow.document.open();
    invoiceWindow.document.write(html);
    invoiceWindow.document.close();
    invoiceWindow.focus();
    invoiceWindow.onafterprint = () => {
      invoiceWindow.close();
    };
    setTimeout(() => {
      invoiceWindow.print();
    }, 250);
  };

  const getStatusLabel = (status) => {
    if (status === 3) {
      return t("pos.statusCancelled");
    }
    if (status === 2) {
      return t("pos.statusPaid");
    }
    if (status === 1) {
      return t("pos.statusPending");
    }
    return t("pos.statusUnknown");
  };

  const handleCancelOrder = async (orderId) => {
    setError("");
    setSuccess("");
    try {
      await gateway.orders.cancel(orderId);
      setSuccess(t("pos.orderCancelled", { id: orderId }));
      await fetchOrders(buildOrderRangeParams(invoiceFromDate, invoiceToDate));
    } catch (err) {
      const apiError = err.response?.data;
      if (typeof apiError === "string" && apiError.trim()) {
        setError(apiError);
      } else if (apiError?.message) {
        setError(apiError.message);
      } else {
        setError(t("pos.failedToCancelOrder"));
      }
    }
  };

  const handleSearchOrders = async () => {
    setError("");
    setSuccess("");

    if (hasInvalidInvoiceRange) {
      setError(t("pos.invalidInvoiceDateRange"));
      return;
    }

    await fetchOrders(buildOrderRangeParams(invoiceFromDate, invoiceToDate));
  };

  const handleClearOrderFilters = async () => {
    setError("");
    setSuccess("");
    setInvoiceFromDate("");
    setInvoiceToDate("");
    await fetchOrders();
  };

  const handleExportOrdersCsv = () => {
    setError("");
    setSuccess("");

    if (hasInvalidInvoiceRange) {
      setError(t("pos.invalidInvoiceDateRange"));
      return;
    }

    if (orders.length === 0) {
      setError(t("pos.noOrdersToExport"));
      return;
    }

    const headers = [
      "Order ID",
      "Created At",
      "Status",
      "Items",
      "Quantity",
      "Subtotal (KHR)",
      "Tax (KHR)",
      "Total (KHR)",
      "Paid (KHR)",
      "Payment Methods",
      "Order Lines",
    ];

    const rows = orders.map((order) => {
      const quantity = (order.items || []).reduce(
        (sum, item) => sum + Number(item.quantity || 0),
        0
      );
      const paidAmount = (order.payments || []).reduce(
        (sum, payment) => sum + Number(payment.amount || 0),
        0
      );
      const paymentMethods = (order.payments || [])
        .map((payment) => getPaymentMethodLabel(payment.method))
        .join("; ");
      const orderLines = (order.items || [])
        .map((item) => {
          const productName = item.product?.name || `Product #${item.productId}`;
          const size = item.size || "Medium";
          return `${productName} (${size}) x${item.quantity}`;
        })
        .join("; ");

      return [
        order.id,
        new Date(order.createdAtUtc).toLocaleString(),
        getStatusLabel(order.status),
        (order.items || []).length,
        quantity,
        convertUsdToKhr(order.subtotal || 0),
        convertUsdToKhr(order.taxAmount || 0),
        convertUsdToKhr(order.totalAmount || 0),
        convertUsdToKhr(paidAmount),
        paymentMethods,
        orderLines,
      ];
    });

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => escapeCsvValue(cell)).join(","))
      .join("\r\n");

    const blob = new Blob([`\uFEFF${csvContent}`], { type: "text/csv;charset=utf-8;" });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = buildOrdersCsvFileName(invoiceFromDate, invoiceToDate);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);

    setSuccess(t("pos.ordersCsvExported", { count: orders.length }));
  };

  return (
    <div className="pos-layout">
      {checkoutAlert.open ? (
        <div className="checkout-alert-backdrop" role="status" aria-live="polite">
          <div className="checkout-alert-dialog">
            <p>{checkoutAlert.message}</p>
          </div>
        </div>
      ) : null}

      <div className="pos-screen-switch">
        <button
          type="button"
          className={`screen-btn btn-with-icon ${activeScreen === "items" ? "active" : ""}`}
          onClick={() => setActiveScreen("items")}
        >
          <AppIcon name="items-screen" />
          {t("pos.itemsScreen")}
        </button>
        <button
          type="button"
          className={`screen-btn btn-with-icon ${activeScreen === "invoices" ? "active" : ""}`}
          onClick={() => setActiveScreen("invoices")}
        >
          <AppIcon name="invoice-screen" />
          {t("pos.invoiceScreen")}
        </button>
      </div>

      {(error || success) && (
        <div className="page-card status-card">
          {error && <p className="form-error">{error}</p>}
          {success && <p className="success-text">{success}</p>}
          {lastCheckoutOrder ? (
            <button
              className="primary-btn print-btn btn-with-icon"
              type="button"
              onClick={() => handlePrintInvoice(lastCheckoutOrder)}
            >
              <AppIcon name="printer" />
              {t("pos.printLastInvoice")}
            </button>
          ) : null}
        </div>
      )}

      {activeScreen === "items" ? (
        <div className={`pos-grid ${cartItems.length === 0 ? "pos-grid-products-only" : ""}`}>
          <ProductGrid onAddItem={handleAddItem} />
          {cartItems.length > 0 ? (
            <Cart
              items={cartItems}
              totalAmount={totalAmount}
              onCheckout={handleCheckout}
              onRemoveItem={handleRemoveItem}
              checkoutLoading={checkingOut}
              recentAddToken={recentAddToken}
              recentAddQuantity={recentAddQuantity}
              highlightedCartKey={highlightedCartKey}
            />
          ) : null}
        </div>
      ) : (
        <>
          <div className="page-card">
            <h2>{t("pos.allItemsForOrders")}</h2>
            {loadingOrders ? <p>{t("pos.loadingOrderItems")}</p> : null}
            {!loadingOrders && orderItems.length === 0 ? (
              <p>{t("pos.noOrderItemsYet")}</p>
            ) : (
              <div className="order-item-list">
                {orderItems.map((item, index) => (
                  <div className="list-row order-item-row" key={`${item.orderId}-${index}`}>
                    <img
                      className="cart-item-image"
                      src={item.imageUrl}
                      alt={item.productName}
                    />
                    <div>
                      <div>{t("pos.orderWithId", { id: item.orderId })}</div>
                      <div>
                        {t("pos.orderItemLine", {
                          name: item.productName,
                          size: getDisplaySize(item.size),
                          quantity: item.quantity,
                          total: formatUsdAsKhr(item.lineTotal, language),
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="page-card">
            <h2>{t("pos.ordersInvoiceList")}</h2>
            <div className="audit-filters">
              <label className="audit-field">
                <span className="field-label">{t("pos.invoiceFromDate")}</span>
                <input
                  className="audit-input"
                  type="date"
                  value={invoiceFromDate}
                  onChange={(e) => setInvoiceFromDate(e.target.value)}
                />
              </label>
              <label className="audit-field">
                <span className="field-label">{t("pos.invoiceToDate")}</span>
                <input
                  className="audit-input"
                  type="date"
                  value={invoiceToDate}
                  onChange={(e) => setInvoiceToDate(e.target.value)}
                />
              </label>
              <div className="audit-filter-actions">
                <button
                  className="primary-btn"
                  type="button"
                  disabled={loadingOrders}
                  onClick={handleSearchOrders}
                >
                  {loadingOrders ? t("common.loading") : t("pos.filterOrders")}
                </button>
                <button
                  className="audit-btn"
                  type="button"
                  disabled={loadingOrders}
                  onClick={handleClearOrderFilters}
                >
                  {t("pos.clearOrderFilters")}
                </button>
                <button
                  className="audit-btn"
                  type="button"
                  disabled={loadingOrders || orders.length === 0}
                  onClick={handleExportOrdersCsv}
                >
                  {t("pos.exportOrdersCsv")}
                </button>
              </div>
            </div>

            {loadingOrders ? <p>{t("pos.loadingOrders")}</p> : null}
            {!loadingOrders && orders.length === 0 ? (
              <p>{t("pos.noOrdersYet")}</p>
            ) : (
              <div className="invoice-list">
                {orders.map((order) => (
                  <div
                    className={`list-row invoice-row ${selectedOrderId === order.id ? "selected" : ""}`.trim()}
                    key={order.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => void openOrderDetails(order.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        void openOrderDetails(order.id);
                      }
                    }}
                  >
                    <div>
                      <div>{t("pos.orderWithId", { id: order.id })}</div>
                      <div className="muted-text">
                        {t("pos.invoiceMetaLine", {
                          date: new Date(order.createdAtUtc).toLocaleString(),
                          total: formatUsdAsKhr(Number(order.totalAmount || 0), language),
                          status: getStatusLabel(order.status),
                        })}
                      </div>
                    </div>
                    <div className="invoice-actions">
                      <button
                        className="audit-btn btn-with-icon"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void openOrderDetails(order.id);
                        }}
                      >
                        <AppIcon name="link" />
                        {t("pos.viewOrderDetails")}
                      </button>
                      <button
                        className="primary-btn btn-with-icon"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handlePrintInvoice(order);
                        }}
                      >
                        <AppIcon name="printer" />
                        {t("pos.printInvoice")}
                      </button>
                      {isAdmin && order.status !== 3 ? (
                        <button
                          className="cancel-btn btn-with-icon"
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleCancelOrder(order.id);
                          }}
                        >
                          <AppIcon name="cancel" />
                          {t("common.cancel")}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {(selectedOrderId || selectedOrderLoading) ? (
            <div ref={selectedOrderDetailRef} className="page-card order-detail-card">
              <div className="order-detail-header">
                <div>
                  <h2>{t("pos.orderDetails")}</h2>
                  <p className="muted-text">
                    {selectedOrder
                      ? t("pos.orderDetailsHint", {
                        id: selectedOrder.id,
                        date: new Date(selectedOrder.createdAtUtc).toLocaleString(),
                      })
                      : t("pos.loadingSelectedOrder")}
                  </p>
                </div>
                <button
                  className="audit-btn"
                  type="button"
                  onClick={() => {
                    setSelectedOrderId(null);
                    setSelectedOrderSnapshot(null);
                    setSelectedOrderLoading(false);
                  }}
                >
                  {t("common.close")}
                </button>
              </div>

              {selectedOrderLoading ? (
                <p>{t("pos.loadingSelectedOrder")}</p>
              ) : !selectedOrder ? (
                <p>{t("pos.selectedOrderNotFound")}</p>
              ) : (
                <div className="order-detail-grid">
                  <section className="order-detail-section">
                    <h3>{t("pos.orderSummary")}</h3>
                    <div className="order-detail-summary">
                      <div className="order-detail-summary-item">
                        <span>{t("pos.statusLabel")}</span>
                        <strong>{getStatusLabel(selectedOrder.status)}</strong>
                      </div>
                      <div className="order-detail-summary-item">
                        <span>{t("pos.subtotal")}</span>
                        <strong>{formatUsdAsKhr(Number(selectedOrder.subtotal || 0), language)}</strong>
                      </div>
                      <div className="order-detail-summary-item">
                        <span>{t("pos.tax")}</span>
                        <strong>{formatUsdAsKhr(Number(selectedOrder.taxAmount || 0), language)}</strong>
                      </div>
                      <div className="order-detail-summary-item">
                        <span>{t("pos.total")}</span>
                        <strong>{formatUsdAsKhr(Number(selectedOrder.totalAmount || 0), language)}</strong>
                      </div>
                    </div>
                  </section>

                  <section className="order-detail-section">
                    <h3>{t("pos.orderItemsTitle")}</h3>
                    <div className="order-detail-list">
                      {(selectedOrder.items || []).map((item, index) => (
                        <div className="order-detail-list-item" key={`${selectedOrder.id}-${item.id || index}`}>
                          <div>
                            <strong>{item.product?.name || `Product #${item.productId}`}</strong>
                            <span>
                              {t("pos.orderItemLine", {
                                name: item.product?.name || `Product #${item.productId}`,
                                size: getDisplaySize(item.size || "Medium"),
                                quantity: item.quantity,
                                total: formatUsdAsKhr(Number(item.lineTotal || 0), language),
                              })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="order-detail-section">
                    <h3>{t("pos.orderPaymentsTitle")}</h3>
                    {(selectedOrder.payments || []).length === 0 ? (
                      <p className="muted-text">{t("pos.noPaymentsRecorded")}</p>
                    ) : (
                      <div className="order-detail-list">
                        {(selectedOrder.payments || []).map((payment, index) => (
                          <div className="order-detail-list-item" key={`${selectedOrder.id}-payment-${payment.id || index}`}>
                            <div>
                              <strong>{getPaymentMethodLabel(payment.method)}</strong>
                              <span>
                                {t("pos.paymentLine", {
                                  amount: formatUsdAsKhr(Number(payment.amount || 0), language),
                                  date: new Date(payment.paidAtUtc).toLocaleString(),
                                })}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              )}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

export default POS;


