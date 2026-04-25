import { apiBaseUrl } from "../services/api";

const LOCAL_API_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

const getWindowOrigin = () => {
  if (typeof window === "undefined") {
    return "http://localhost";
  }

  const origin = window.location?.origin;
  return origin && origin !== "null" ? origin : "http://localhost";
};

const getApiBase = () => {
  try {
    return new URL(apiBaseUrl || "/api", getWindowOrigin());
  } catch {
    return new URL("/api", getWindowOrigin());
  }
};

const isAbsoluteHttpUrl = (value) => /^https?:\/\//i.test(value);

export const resolveMediaUrl = (value) => {
  const rawValue = String(value || "").trim();
  if (!rawValue) {
    return "";
  }

  if (/^(blob|data|file):/i.test(rawValue)) {
    return rawValue;
  }

  const apiBase = getApiBase();
  const apiOrigin = apiBase.origin;

  if (!isAbsoluteHttpUrl(rawValue) && !rawValue.startsWith("//")) {
    const path = rawValue.startsWith("/") ? rawValue : `/${rawValue}`;
    if (path.startsWith("/api/") || path.startsWith("/uploads/")) {
      return `${apiOrigin}${path}`;
    }

    return new URL(path, getWindowOrigin()).href;
  }

  try {
    const parsed = new URL(
      rawValue.startsWith("//") ? `${apiBase.protocol}${rawValue}` : rawValue
    );
    const apiBaseIsAbsolute = isAbsoluteHttpUrl(apiBaseUrl || "");
    const shouldRewriteLocalHost =
      apiBaseIsAbsolute && !LOCAL_API_HOSTS.has(apiBase.hostname);

    if (shouldRewriteLocalHost && LOCAL_API_HOSTS.has(parsed.hostname)) {
      return `${apiOrigin}${parsed.pathname}${parsed.search}${parsed.hash}`;
    }

    return parsed.href;
  } catch {
    return rawValue;
  }
};

export const getPlaceholderImageUrl = (label = "Item", size = "160x160") =>
  `https://placehold.co/${size}?text=${encodeURIComponent(label)}`;

export const getProductImageUrl = (item, size = "160x160") => {
  const resolvedUrl = resolveMediaUrl(item?.imageUrl);
  if (resolvedUrl) {
    return resolvedUrl;
  }

  return getPlaceholderImageUrl(item?.name || "Item", size);
};
