import { useEffect, useMemo, useState } from "react";
import ProductGrid from "../components/pos/ProductGrid";
import Cart from "../components/pos/Cart";
import api from "../services/api";

function POS() {
  const isAdmin = (localStorage.getItem("role") || "") === "Admin";
  const [activeScreen, setActiveScreen] = useState("items");
  const [cartItems, setCartItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [lastCheckoutOrder, setLastCheckoutOrder] = useState(null);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadOrders = async () => {
    setLoadingOrders(true);
    try {
      const res = await api.get("/orders");
      setOrders(res.data || []);
    } catch {
      setError("Could not load order list.");
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    loadOrders();
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

  const handleCheckout = async () => {
    setError("");
    setSuccess("");

    if (cartItems.length === 0) {
      setError("Cart is empty.");
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

      setLastCheckoutOrder(res.data || null);
      setCartItems([]);
      setSuccess("Checkout complete.");
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
        setError("Checkout failed.");
      }
    } finally {
      setCheckingOut(false);
    }
  };

  const handlePrintInvoice = (order) => {
    if (!order) {
      return;
    }

    const invoiceWindow = window.open("", "_blank", "width=900,height=700");
    if (!invoiceWindow) {
      setError("Popup blocked. Please allow popups to print invoice.");
      return;
    }

    const itemsHtml = (order.items || [])
      .map((item) => {
        const productName = item.product?.name || `Product #${item.productId}`;
        const size = item.size || "Medium";
        return `
          <tr>
            <td>${productName}</td>
            <td>${size}</td>
            <td>${item.quantity}</td>
            <td>$${Number(item.unitPrice || 0).toFixed(2)}</td>
            <td>$${Number(item.lineTotal || 0).toFixed(2)}</td>
          </tr>
        `;
      })
      .join("");

    const paymentTotal = (order.payments || []).reduce(
      (sum, payment) => sum + Number(payment.amount || 0),
      0
    );

    const html = `
      <html>
        <head>
          <title>Invoice #${order.id}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #222; }
            h1, h2, p { margin: 0 0 8px 0; }
            .meta { margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 14px; }
            th { background: #f4f4f4; }
            .totals { margin-top: 16px; }
            .totals p { margin: 4px 0; }
          </style>
        </head>
        <body>
          <h1>StarDark POS Invoice</h1>
          <div class="meta">
            <p><strong>Invoice #:</strong> ${order.id}</p>
            <p><strong>Date:</strong> ${new Date(order.createdAtUtc).toLocaleString()}</p>
            <p><strong>Status:</strong> ${order.status}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Size</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Line Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          <div class="totals">
            <p><strong>Subtotal:</strong> $${Number(order.subtotal || 0).toFixed(2)}</p>
            <p><strong>Tax:</strong> $${Number(order.taxAmount || 0).toFixed(2)}</p>
            <p><strong>Total:</strong> $${Number(order.totalAmount || 0).toFixed(2)}</p>
            <p><strong>Paid:</strong> $${paymentTotal.toFixed(2)}</p>
          </div>
        </body>
      </html>
    `;

    invoiceWindow.document.open();
    invoiceWindow.document.write(html);
    invoiceWindow.document.close();
    invoiceWindow.focus();
    invoiceWindow.print();
  };

  const getStatusLabel = (status) => {
    if (status === 3) {
      return "Cancelled";
    }
    if (status === 2) {
      return "Paid";
    }
    if (status === 1) {
      return "Pending";
    }
    return "Unknown";
  };

  const handleCancelOrder = async (orderId) => {
    setError("");
    setSuccess("");
    try {
      await api.post(`/orders/${orderId}/cancel`);
      setSuccess(`Order #${orderId} cancelled.`);
      await loadOrders();
    } catch (err) {
      const apiError = err.response?.data;
      if (typeof apiError === "string" && apiError.trim()) {
        setError(apiError);
      } else if (apiError?.message) {
        setError(apiError.message);
      } else {
        setError("Failed to cancel order.");
      }
    }
  };

  return (
    <div className="pos-layout">
      <div className="pos-screen-switch">
        <button
          type="button"
          className={`screen-btn ${activeScreen === "items" ? "active" : ""}`}
          onClick={() => setActiveScreen("items")}
        >
          Items Screen
        </button>
        <button
          type="button"
          className={`screen-btn ${activeScreen === "invoices" ? "active" : ""}`}
          onClick={() => setActiveScreen("invoices")}
        >
          Invoice Screen
        </button>
      </div>

      {(error || success) && (
        <div className="page-card status-card">
          {error && <p className="form-error">{error}</p>}
          {success && <p className="success-text">{success}</p>}
          {lastCheckoutOrder ? (
            <button
              className="primary-btn print-btn"
              type="button"
              onClick={() => handlePrintInvoice(lastCheckoutOrder)}
            >
              Print Last Invoice
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
            <h2>All Items For Orders</h2>
            {loadingOrders ? <p>Loading order items...</p> : null}
            {!loadingOrders && orderItems.length === 0 ? (
              <p>No order items yet.</p>
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
                      <div>Order #{item.orderId}</div>
                      <div>
                        {item.productName} ({item.size}) x {item.quantity} | $
                        {item.lineTotal.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="page-card">
            <h2>Orders Invoice List</h2>
            {orders.length === 0 ? (
              <p>No orders yet.</p>
            ) : (
              orders.slice(0, 10).map((order) => (
                <div className="list-row invoice-row" key={order.id}>
                  <div>
                    <div>Order #{order.id}</div>
                    <div className="muted-text">
                      {new Date(order.createdAtUtc).toLocaleString()} | Total $
                      {Number(order.totalAmount || 0).toFixed(2)} | {getStatusLabel(order.status)}
                    </div>
                  </div>
                  <div className="invoice-actions">
                    <button
                      className="primary-btn"
                      type="button"
                      onClick={() => handlePrintInvoice(order)}
                    >
                      Print Invoice
                    </button>
                    {isAdmin && order.status !== 3 ? (
                      <button
                        className="cancel-btn"
                        type="button"
                        onClick={() => handleCancelOrder(order.id)}
                      >
                        Cancel
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
