import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { translations } from "./translations";

const I18nContext = createContext(null);
const LANGUAGE_STORAGE_KEY = "language";

const getInitialLanguage = () => {
  const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return savedLanguage === "km" ? "km" : "en";
};

const getMessageByPath = (dictionary, path) => {
  return path.split(".").reduce((current, key) => {
    if (!current || typeof current !== "object") {
      return undefined;
    }
    return current[key];
  }, dictionary);
};

const interpolate = (template, variables = {}) =>
  template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, key) => {
    const value = variables[key];
    return value === undefined || value === null ? "" : String(value);
  });

function I18nProvider({ children }) {
  const [language, setLanguage] = useState(getInitialLanguage);

  useEffect(() => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.documentElement.setAttribute("lang", language === "km" ? "km" : "en");
  }, [language]);

  const t = useCallback(
    (key, variables) => {
      const localized = getMessageByPath(translations[language], key);
      const fallback = getMessageByPath(translations.en, key);
      const message = typeof localized === "string"
        ? localized
        : typeof fallback === "string"
          ? fallback
          : key;
      return interpolate(message, variables);
    },
    [language]
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
    }),
    [language, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export { I18nContext, I18nProvider };
