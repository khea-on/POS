import { useContext } from "react";
import { I18nContext } from "./I18nProvider";

const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used inside an I18nProvider.");
  }
  return context;
};

export default useI18n;
