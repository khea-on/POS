import {
  CRM_MODULES,
  POS_MODULES,
  getDefaultCrmModules,
  getDefaultPosModules,
  normalizeModuleKeys,
} from "../access/moduleCatalog";

export const POS_APP = "POS";
export const CRM_APP = "CRM";

const TOKEN_KEY = "token";
const USERNAME_KEY = "username";
const ROLE_KEY = "role";
const IMAGE_URL_KEY = "imageUrl";
const POS_ROLE_KEY = "posRole";
const CRM_ROLE_KEY = "crmRole";
const DEFAULT_APP_KEY = "defaultApp";
const ACTIVE_APP_KEY = "activeApp";
const ALLOWED_APPS_KEY = "allowedApps";
const POS_MODULES_KEY = "posModules";
const CRM_MODULES_KEY = "crmModules";
const CRM_MODULE_SCHEMA_VERSION_KEY = "crmModuleSchemaVersion";
const CRM_MODULE_SCHEMA_VERSION = "crm-ocr-v1";

export const normalizeApp = (value) => {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === CRM_APP) {
    return CRM_APP;
  }
  if (normalized === POS_APP) {
    return POS_APP;
  }
  return "";
};

export const parseAllowedApps = (value) => {
  if (Array.isArray(value)) {
    return [...new Set(value.map(normalizeApp).filter(Boolean))];
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parseAllowedApps(parsed);
      }
    } catch {
      return [...new Set(value.split(",").map(normalizeApp).filter(Boolean))];
    }
  }

  return [];
};

const getModuleCatalog = (app) => normalizeApp(app) === CRM_APP ? CRM_MODULES : POS_MODULES;

export const parseModuleKeys = (value) => {
  if (Array.isArray(value)) {
    return [...new Set(value.map((item) => String(item || "").trim()).filter(Boolean))];
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parseModuleKeys(parsed);
      }
    } catch {
      return [...new Set(value.split(",").map((item) => String(item || "").trim()).filter(Boolean))];
    }
  }

  return [];
};

const migrateLegacyCrmModules = (crmModules) => {
  if (localStorage.getItem(CRM_MODULE_SCHEMA_VERSION_KEY) === CRM_MODULE_SCHEMA_VERSION) {
    return crmModules;
  }

  const nextModules = crmModules.length > 0
    ? normalizeModuleKeys([...crmModules, "crm-attendance", "crm-ocr"], CRM_MODULES)
    : crmModules;

  if (crmModules.length > 0) {
    localStorage.setItem(CRM_MODULES_KEY, JSON.stringify(nextModules));
  }
  localStorage.setItem(CRM_MODULE_SCHEMA_VERSION_KEY, CRM_MODULE_SCHEMA_VERSION);

  return nextModules;
};

export const getAuthSession = () => {
  const token = localStorage.getItem(TOKEN_KEY) || "";
  const role = localStorage.getItem(ROLE_KEY) || "Cashier";
  const posRole = localStorage.getItem(POS_ROLE_KEY) || role || "Cashier";
  const crmRole = localStorage.getItem(CRM_ROLE_KEY) || "";
  const allowedApps = parseAllowedApps(localStorage.getItem(ALLOWED_APPS_KEY));
  const fallbackAllowedApps = allowedApps.length > 0
    ? allowedApps
    : token
      ? [POS_APP]
      : [];
  const defaultApp = normalizeApp(localStorage.getItem(DEFAULT_APP_KEY))
    || fallbackAllowedApps[0]
    || "";
  const activeApp = normalizeApp(localStorage.getItem(ACTIVE_APP_KEY));
  const posModules = normalizeModuleKeys(
    parseModuleKeys(localStorage.getItem(POS_MODULES_KEY)),
    POS_MODULES
  );
  const crmModules = migrateLegacyCrmModules(normalizeModuleKeys(
    parseModuleKeys(localStorage.getItem(CRM_MODULES_KEY)),
    CRM_MODULES
  ));

  return {
    token,
    username: localStorage.getItem(USERNAME_KEY) || "",
    role,
    posRole,
    crmRole,
    imageUrl: localStorage.getItem(IMAGE_URL_KEY) || "",
    allowedApps: fallbackAllowedApps,
    defaultApp,
    activeApp: fallbackAllowedApps.includes(activeApp) ? activeApp : defaultApp,
    posModules: posModules.length > 0 ? posModules : getDefaultPosModules(posRole),
    crmModules: crmModules.length > 0 ? crmModules : getDefaultCrmModules(crmRole || "CrmUser"),
  };
};

export const getAppHomePath = (app, session = getAuthSession()) => {
  const normalizedApp = normalizeApp(app);
  const catalog = getModuleCatalog(normalizedApp);
  const enabledModules = new Set(
    normalizedApp === CRM_APP ? session.crmModules : session.posModules
  );
  const firstAccessibleModule = catalog.find((item) => enabledModules.has(item.key));

  if (firstAccessibleModule?.route) {
    return firstAccessibleModule.route;
  }

  return normalizedApp === CRM_APP ? "/crm" : "/dashboard";
};

export const hasAppAccess = (app, session = getAuthSession()) =>
  session.allowedApps.includes(normalizeApp(app));

export const getBestAvailablePath = (session = getAuthSession()) => {
  if (!session.token) {
    return "/";
  }

  const appPreferenceOrder = [
    session.activeApp,
    session.defaultApp,
    ...session.allowedApps,
  ].filter((value, index, array) => value && array.indexOf(value) === index);

  for (const app of appPreferenceOrder) {
    if (hasAppAccess(app, session)) {
      return getAppHomePath(app, session);
    }
  }

  return "/";
};

export const getPreferredHomePath = (session = getAuthSession()) => {
  if (!session.token) {
    return "/";
  }

  if (session.allowedApps.length > 1) {
    return "/choose-app";
  }

  return getBestAvailablePath(session);
};

export const hasModuleAccess = (app, module, session = getAuthSession()) => {
  const normalizedApp = normalizeApp(app);
  const normalizedModule = String(module || "").trim();
  if (!normalizedModule) {
    return true;
  }

  if (normalizedApp === CRM_APP) {
    return session.crmModules.includes(normalizedModule);
  }

  return session.posModules.includes(normalizedModule);
};

export const setActiveApp = (app) => {
  const normalizedApp = normalizeApp(app);
  if (!normalizedApp) {
    localStorage.removeItem(ACTIVE_APP_KEY);
    return "";
  }

  const session = getAuthSession();
  if (!session.allowedApps.includes(normalizedApp)) {
    return session.activeApp;
  }

  localStorage.setItem(ACTIVE_APP_KEY, normalizedApp);
  return normalizedApp;
};

export const persistAuthSession = (data) => {
  const allowedApps = parseAllowedApps(data?.allowedApps);
  const fallbackAllowedApps = allowedApps.length > 0 ? allowedApps : [POS_APP];
  const defaultApp = normalizeApp(data?.defaultApp) || fallbackAllowedApps[0];
  const role = data?.role || "Cashier";
  const posRole = data?.posRole || role || "Cashier";
  const crmRole = data?.crmRole || "";
  const posModules = normalizeModuleKeys(parseModuleKeys(data?.posModules), POS_MODULES);
  const crmModules = normalizeModuleKeys(parseModuleKeys(data?.crmModules), CRM_MODULES);

  localStorage.setItem(TOKEN_KEY, data?.token || "");
  localStorage.setItem(USERNAME_KEY, data?.username || "");
  localStorage.setItem(ROLE_KEY, role);
  localStorage.setItem(POS_ROLE_KEY, posRole);
  localStorage.setItem(CRM_ROLE_KEY, crmRole);
  localStorage.setItem(IMAGE_URL_KEY, data?.imageUrl || "");
  localStorage.setItem(DEFAULT_APP_KEY, defaultApp);
  localStorage.setItem(ALLOWED_APPS_KEY, JSON.stringify(fallbackAllowedApps));
  localStorage.setItem(
    POS_MODULES_KEY,
    JSON.stringify(posModules.length > 0 ? posModules : getDefaultPosModules(posRole))
  );
  localStorage.setItem(
    CRM_MODULES_KEY,
    JSON.stringify(crmModules.length > 0 ? crmModules : getDefaultCrmModules(crmRole || "CrmUser"))
  );
  localStorage.setItem(CRM_MODULE_SCHEMA_VERSION_KEY, CRM_MODULE_SCHEMA_VERSION);
  setActiveApp(defaultApp);

  return getAuthSession();
};

export const clearAuthSession = () => {
  [
    TOKEN_KEY,
    USERNAME_KEY,
    ROLE_KEY,
    IMAGE_URL_KEY,
    POS_ROLE_KEY,
    CRM_ROLE_KEY,
    DEFAULT_APP_KEY,
    ACTIVE_APP_KEY,
    ALLOWED_APPS_KEY,
    POS_MODULES_KEY,
    CRM_MODULES_KEY,
    CRM_MODULE_SCHEMA_VERSION_KEY,
  ].forEach((key) => localStorage.removeItem(key));
};
