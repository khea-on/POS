import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ProductGrid from "../components/pos/ProductGrid";
import Cart from "../components/pos/Cart";
import api from "../services/api";
import useI18n from "../i18n/useI18n";
import AppIcon from "../components/common/AppIcon";

function POS() {
  const { t } = useI18n();
  const isAdmin = (localStorage.getItem("role") || "") === "Admin";
  const [activeScreen, setActiveScreen] = useState("items");
  const [cartItems, setCartItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [lastCheckoutOrder, setLastCheckoutOrder] = useState(null);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [checkoutAlert, setCheckoutAlert] = useState({ open: false, message: "" });
  const checkoutAlertTimeoutRef = useRef(null);

  const getDisplaySize = useCallback((size) => {
    if (size === "Small") return t("common.sizeSmall");
    if (size === "Large") return t("common.sizeLarge");
    return t("common.sizeMedium");
  }, [t]);

  const loadOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const res = await api.get("/orders");
      setOrders(res.data || []);
    } catch {
      setError(t("pos.couldNotLoadOrderList"));
    } finally {
      setLoadingOrders(false);
    }
  }, [t]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    return () => {
      if (checkoutAlertTimeoutRef.current) {
        clearTimeout(checkoutAlertTimeoutRef.current);
      }
    };
  }, []);

  const handleAddItem = (item) => {
    setError("");
    setSuccess("");
    setCartItems((prevItems) => {
      const selectedSize = item.selectedSize || "Medium";
      const cartKey = `${item.id}-${selectedSize}`;
      const existing = prevItems.find((cartItem) => cartItem.cartKey === cartKey);
      if (existing) {
        return prevItems.map((cartItem) =>
          cartItem.cartKey === cartKey
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      }

      return [...prevItems, { ...item, selectedSize, cartKey, quantity: 1 }];
    });
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
      const res = await api.post("/orders/checkout", {
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

      const createdOrder = res.data || null;
      setLastCheckoutOrder(createdOrder);
      setCartItems([]);
      const successMessage = createdOrder?.id
        ? t("pos.checkoutCompleteWithOrder", { id: createdOrder.id })
        : t("pos.checkoutComplete");
      setSuccess(successMessage);
      await notifyCheckoutSuccess(successMessage);
      await loadOrders();
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
        const unitPrice = Number(item.unitPrice || 0).toFixed(2);
        const lineTotal = Number(item.lineTotal || 0).toFixed(2);
        return `
          <div class="receipt-item">
            <div class="item-name">${escapeHtml(productName)} (${escapeHtml(size)})</div>
            <div class="item-meta">
              <span>${item.quantity} x $${unitPrice}</span>
              <span>$${lineTotal}</span>
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

            <div class="line"><span>${escapeHtml(t("pos.subtotal"))}</span><span>$${Number(order.subtotal || 0).toFixed(2)}</span></div>
            <div class="line"><span>${escapeHtml(t("pos.tax"))}</span><span>$${Number(order.taxAmount || 0).toFixed(2)}</span></div>
            <div class="line total"><span>${escapeHtml(t("pos.total"))}</span><span>$${Number(order.totalAmount || 0).toFixed(2)}</span></div>
            <div class="line"><span>${escapeHtml(t("pos.paid"))}</span><span>$${paymentTotal.toFixed(2)}</span></div>

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
      await api.post(`/orders/${orderId}/cancel`);
      setSuccess(t("pos.orderCancelled", { id: orderId }));
      await loadOrders();
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
        <div className="pos-grid">
          <ProductGrid onAddItem={handleAddItem} />
        <Cart
          items={cartItems}
          totalAmount={totalAmount}
          onCheckout={handleCheckout}
          onRemoveItem={handleRemoveItem}
          checkoutLoading={checkingOut}
        />
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
                          total: item.lineTotal.toFixed(2),
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
            {orders.length === 0 ? (
              <p>{t("pos.noOrdersYet")}</p>
            ) : (
              orders.slice(0, 10).map((order) => (
                <div className="list-row invoice-row" key={order.id}>
                  <div>
                    <div>{t("pos.orderWithId", { id: order.id })}</div>
                    <div className="muted-text">
                      {t("pos.invoiceMetaLine", {
                        date: new Date(order.createdAtUtc).toLocaleString(),
                        total: Number(order.totalAmount || 0).toFixed(2),
                        status: getStatusLabel(order.status),
                      })}
                    </div>
                  </div>
                  <div className="invoice-actions">
                    <button
                      className="primary-btn btn-with-icon"
                      type="button"
                      onClick={() => handlePrintInvoice(order)}
                    >
                      <AppIcon name="printer" />
                      {t("pos.printInvoice")}
                    </button>
                    {isAdmin && order.status !== 3 ? (
                      <button
                        className="cancel-btn btn-with-icon"
                        type="button"
                        onClick={() => handleCancelOrder(order.id)}
                      >
                        <AppIcon name="cancel" />
                        {t("common.cancel")}
                      </button>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default POS;


