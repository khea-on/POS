import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { I18nProvider } from "./i18n/I18nProvider";

const storedTheme = localStorage.getItem("theme");
const initialTheme = storedTheme === "light" ? "light" : "dark";
document.documentElement.setAttribute("data-theme", initialTheme);

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    const baseUrl = import.meta.env.BASE_URL || "/";
    const serviceWorkerUrl = `${baseUrl.replace(/\/?$/, "/")}sw.js`;
    navigator.serviceWorker.register(serviceWorkerUrl).catch(() => {
      // Ignore registration failures so the app still boots normally.
    });
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
)
