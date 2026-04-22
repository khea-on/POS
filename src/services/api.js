import axios from "axios";

export const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_IIS_URL ||
  "/api";

const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 30000,
});

export const buildApiUrl = (path) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (/^https?:\/\//i.test(apiBaseUrl)) {
    return `${apiBaseUrl.replace(/\/$/, "")}${normalizedPath}`;
  }

  const normalizedBase = apiBaseUrl.startsWith("/")
    ? apiBaseUrl
    : `/${apiBaseUrl}`;

  if (typeof window === "undefined") {
    return `${normalizedBase.replace(/\/$/, "")}${normalizedPath}`;
  }

  return `${window.location.origin}${normalizedBase.replace(/\/$/, "")}${normalizedPath}`;
};

api.interceptors.request.use(config => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
