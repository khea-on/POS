import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { I18nProvider } from "./i18n/I18nProvider";

const storedTheme = localStorage.getItem("theme");
const initialTheme = storedTheme === "dark" ? "dark" : "light";
document.documentElement.setAttribute("data-theme", initialTheme);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
)
