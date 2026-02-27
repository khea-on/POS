import useI18n from "../../i18n/useI18n";
import AppIcon from "../common/AppIcon";

function Cart({ items, totalAmount, onCheckout, onRemoveItem, checkoutLoading }) {
  const { t } = useI18n();
  const getSizeLabel = (size) => {
    if (size === "Small") return t("common.sizeSmall");
    if (size === "Large") return t("common.sizeLarge");
    return t("common.sizeMedium");
  };

  const getItemImageUrl = (item) => {
    if (item?.imageUrl) {
      return item.imageUrl;
    }

    const label = encodeURIComponent(item?.name || "Item");
    return `https://placehold.co/80x80?text=${label}`;
  };

  return (
    <div className="panel">
      <h3>{t("cart.title")}</h3>
      {items.length === 0 ? (
        <p>{t("cart.noItemsYet")}</p>
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
                {item.name} ({getSizeLabel(item.selectedSize || "Medium")})
              </div>
              <div>
                {t("cart.itemLine", {
                  quantity: item.quantity,
                  amount: (Number(item.price || 0) * item.quantity).toFixed(2),
                })}
              </div>
            </div>
            <button
              className="cancel-btn btn-with-icon"
              type="button"
              onClick={() => onRemoveItem(item.cartKey || item.id)}
            >
              <AppIcon name="cancel" />
              {t("common.cancel")}
            </button>
          </div>
        ))
      )}
      <p className="cart-total">{t("cart.total", { amount: totalAmount.toFixed(2) })}</p>
      <button
        className="primary-btn btn-with-icon"
        type="button"
        onClick={onCheckout}
        disabled={checkoutLoading}
      >
        <AppIcon name="checkout" />
        {checkoutLoading ? t("cart.checkingOut") : t("cart.checkout")}
      </button>
    </div>
  );
}

export default Cart;


