export const POS_MODULES = [
  { key: "dashboard", label: "Dashboard", route: "/dashboard" },
  { key: "pos", label: "POS Terminal", route: "/pos" },
  { key: "product-management", label: "Product Management", route: "/product-management" },
  { key: "inventory-management", label: "Inventory Management", route: "/inventory-management" },
  { key: "reports", label: "Reports", route: "/reports" },
  { key: "audit-logs", label: "Audit Logs", route: "/audit-logs" },
  { key: "help", label: "Help", route: "/help" },
  { key: "settings", label: "Settings", route: "/settings" },
  { key: "access-control", label: "Access Control", route: "/access-control" },
];

export const CRM_MODULES = [
  { key: "crm", label: "CRM Workspace", route: "/crm" },
  { key: "crm-customers", label: "Customers", route: "/crm/customers" },
  { key: "crm-leads", label: "Leads", route: "/crm/leads" },
  { key: "crm-activities", label: "Activities", route: "/crm/activities" },
];

export const getDefaultPosModules = (role) => {
  const normalizedRole = String(role || "").toLowerCase();
  if (normalizedRole === "admin") {
    return POS_MODULES.map((item) => item.key);
  }

  return ["dashboard", "pos", "help", "settings"];
};

export const getDefaultCrmModules = (role) => {
  const normalizedRole = String(role || "").toLowerCase();
  if (normalizedRole === "crmadmin") {
    return CRM_MODULES.map((item) => item.key);
  }

  return ["crm", "crm-customers", "crm-activities"];
};

export const normalizeModuleKeys = (requestedModules, allowedModules) => {
  const requested = new Set((requestedModules || []).map((item) => String(item || "").trim()));
  return allowedModules
    .map((item) => item.key)
    .filter((key) => requested.has(key));
};
