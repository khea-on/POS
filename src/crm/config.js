export const CUSTOMER_STATUS_OPTIONS = ["Prospect", "Active", "Inactive", "VIP"];
export const LEAD_STATUS_OPTIONS = ["New", "Qualified", "Proposal", "Won", "Lost"];
export const ACTIVITY_TYPE_OPTIONS = ["Task", "Call", "Meeting", "Email", "FollowUp"];
export const ACTIVITY_STATUS_OPTIONS = ["Pending", "Completed", "Cancelled"];
export const ACTIVITY_PRIORITY_OPTIONS = ["Low", "Medium", "High"];

const CRM_ENUM_KEY_MAP = {
  customerStatus: {
    Prospect: "crm.enums.customerStatus.Prospect",
    Active: "crm.enums.customerStatus.Active",
    Inactive: "crm.enums.customerStatus.Inactive",
    VIP: "crm.enums.customerStatus.VIP",
  },
  leadStatus: {
    New: "crm.enums.leadStatus.New",
    Qualified: "crm.enums.leadStatus.Qualified",
    Proposal: "crm.enums.leadStatus.Proposal",
    Won: "crm.enums.leadStatus.Won",
    Lost: "crm.enums.leadStatus.Lost",
  },
  activityType: {
    Task: "crm.enums.activityType.Task",
    Call: "crm.enums.activityType.Call",
    Meeting: "crm.enums.activityType.Meeting",
    Email: "crm.enums.activityType.Email",
    FollowUp: "crm.enums.activityType.FollowUp",
  },
  activityStatus: {
    Pending: "crm.enums.activityStatus.Pending",
    Completed: "crm.enums.activityStatus.Completed",
    Cancelled: "crm.enums.activityStatus.Cancelled",
  },
  activityPriority: {
    Low: "crm.enums.activityPriority.Low",
    Medium: "crm.enums.activityPriority.Medium",
    High: "crm.enums.activityPriority.High",
  },
};

const getLocale = (language) => language === "km" ? "km-KH" : "en-US";

export const getCrmEnumLabel = (t, group, value) => {
  const key = CRM_ENUM_KEY_MAP[group]?.[String(value || "").trim()];
  return key ? t(key) : String(value || "");
};

export const formatDateTime = (value, language = "en") => {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleString(getLocale(language));
};

export const toDateTimeLocalInputValue = (value) => {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const timezoneOffsetMs = parsed.getTimezoneOffset() * 60 * 1000;
  return new Date(parsed.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
};

export const toApiDateTime = (value) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
};

export const formatCurrency = (value, language = "en") =>
  new Intl.NumberFormat(getLocale(language), {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

export const getStatusTone = (value) => {
  const normalized = String(value || "").toLowerCase();

  if (["vip", "won", "completed", "active"].includes(normalized)) {
    return "success";
  }

  if (["proposal", "qualified", "pending", "prospect"].includes(normalized)) {
    return "warning";
  }

  if (["inactive", "lost", "cancelled"].includes(normalized)) {
    return "danger";
  }

  return "neutral";
};
