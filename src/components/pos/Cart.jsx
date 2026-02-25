function Cart({ items, totalAmount, onCheckout, onRemoveItem, checkoutLoading }) {
  const getItemImageUrl = (item) => {
    if (item?.imageUrl) {
      return item.imageUrl;
    }

    const label = encodeURIComponent(item?.name || "Item");
    return `https://placehold.co/80x80?text=${label}`;
  };

  return (
    <div className="panel">
      <h3>Cart</h3>
      {items.length === 0 ? (
        <p>No items yet</p>
      ) : (
        items.map((item) => (
          <div key={item.cartKey || item.id} className="list-row cart-row">
            <img
              className="cart-item-image"
              src={getItemImageUrl(item)}
              alt={item.name}
            />
            <div>
              <div>
                {item.name} ({item.selectedSize || "Medium"})
              </div>
              <div>
                x {item.quantity} - ${(Number(item.price || 0) * item.quantity).toFixed(2)}
              </div>
            </div>
            <button
              className="cancel-btn"
              type="button"
              onClick={() => onRemoveItem(item.cartKey || item.id)}
            >
              Cancel
            </button>
          </div>
        ))
      )}
      <p className="cart-total">Total: ${totalAmount.toFixed(2)}</p>
      <button
        className="primary-btn"
        type="button"
        onClick={onCheckout}
        disabled={checkoutLoading}
      >
        {checkoutLoading ? "Checking out..." : "Checkout"}
      </button>
    </div>
  );
}

export default Cart;
