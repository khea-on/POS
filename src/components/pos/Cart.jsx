import { useEffect, useRef, useState } from "react";
import useI18n from "../../i18n/useI18n";
import AppIcon from "../common/AppIcon";
import { formatUsdAsKhr } from "../../utils/currency";

function Cart({
  items,
  totalAmount,
  onCheckout,
  onRemoveItem,
  checkoutLoading,
  recentAddToken,
  recentAddQuantity,
  highlightedCartKey,
}) {
  const { language, t } = useI18n();
  const [isPanelPopping, setIsPanelPopping] = useState(false);
  const [showAddChip, setShowAddChip] = useState(false);
  const popTimerRef = useRef(null);
  const chipTimerRef = useRef(null);

  useEffect(() => {
    if (!recentAddToken) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsPanelPopping(true);
    setShowAddChip(true);

    if (popTimerRef.current) {
      clearTimeout(popTimerRef.current);
    }
    if (chipTimerRef.current) {
      clearTimeout(chipTimerRef.current);
    }

    popTimerRef.current = window.setTimeout(() => {
      setIsPanelPopping(false);
    }, 460);
    chipTimerRef.current = window.setTimeout(() => {
      setShowAddChip(false);
    }, 960);
  }, [recentAddToken]);

  useEffect(() => {
    return () => {
      if (popTimerRef.current) {
        clearTimeout(popTimerRef.current);
      }
      if (chipTimerRef.current) {
        clearTimeout(chipTimerRef.current);
      }
    };
  }, []);

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
    <div className={`panel cart-panel ${isPanelPopping ? "cart-panel-pop" : ""}`}>
      <div className="cart-title-row">
        <h3>{t("cart.title")}</h3>
        <span className={`cart-add-chip ${showAddChip ? "show" : ""}`} aria-hidden="true">
          +{recentAddQuantity || 1}
        </span>
      </div>
      {items.length === 0 ? (
        <p>{t("cart.noItemsYet")}</p>
      ) : (
        items.map((item) => (
          <div
            key={item.cartKey || item.id}
            className={`list-row cart-row ${highlightedCartKey === (item.cartKey || item.id)
              ? "cart-row-added"
              : ""}`}
          >
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
                  amount: formatUsdAsKhr(Number(item.price || 0) * item.quantity, language),
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
      <p className="cart-total">{t("cart.total", { amount: formatUsdAsKhr(totalAmount, language) })}</p>
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
