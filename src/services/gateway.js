import api from "./api";

export const routes = {
  auth: {
    login: "/auth/login",
    register: "/auth/register",
    me: "/auth/me",
    profileImage: "/auth/profile-image",
    profileImageUpload: "/auth/profile-image/upload",
    users: "/auth/users",
    userById: (userId) => `/auth/users/${userId}`,
  },
  orders: {
    root: "/orders",
    byId: (orderId) => `/orders/${orderId}`,
    checkout: "/orders/checkout",
    cancel: (orderId) => `/orders/${orderId}/cancel`,
  },
  notifications: {
    recent: "/notifications/recent",
    stream: "/notifications/stream",
  },
  products: {
    root: "/products",
    inventorySummary: "/products/inventory-summary",
    byId: (productId) => `/products/${productId}`,
    uploadImage: (productId) => `/products/${productId}/image`,
    adjustStock: (productId) => `/products/${productId}/adjust-stock`,
  },
  auditLogs: {
    root: "/audit-logs",
  },
  crm: {
    summary: "/crm/summary",
    customers: "/crm/customers",
    customerById: (customerId) => `/crm/customers/${customerId}`,
    attendance: {
      today: "/crm/attendance/today",
      scan: "/crm/attendance/scan",
      checkIn: "/crm/attendance/checkin",
      checkOut: "/crm/attendance/checkout",
      staff: "/crm/staff",
      staffByCode: (staffCode) => `/crm/staff/${encodeURIComponent(staffCode)}`,
    },
    ocr: {
      extract: "/crm/ocr/extract",
    },
    leads: "/crm/leads",
    leadById: (leadId) => `/crm/leads/${leadId}`,
    activities: "/crm/activities",
    activityById: (activityId) => `/crm/activities/${activityId}`,
  },
  integrations: {
    telegramTest: "/integrations/telegram/test",
  },
};

const unwrap = (requestPromise) => requestPromise.then((res) => res.data);

const gateway = {
  auth: {
    login: (payload) => unwrap(api.post(routes.auth.login, payload)),
    register: (payload) => unwrap(api.post(routes.auth.register, payload)),
    me: () => unwrap(api.get(routes.auth.me)),
    updateProfileImage: (payload) =>
      unwrap(api.put(routes.auth.profileImage, payload)),
    uploadProfileImage: (file) => {
      const formData = new FormData();
      formData.append("file", file);
      return unwrap(api.post(routes.auth.profileImageUpload, formData));
    },
    getUsers: () => unwrap(api.get(routes.auth.users)),
    updateUser: (userId, payload) =>
      unwrap(api.put(routes.auth.userById(userId), payload)),
    deleteUser: (userId) => unwrap(api.delete(routes.auth.userById(userId))),
  },
  orders: {
    getAll: (params) => unwrap(api.get(routes.orders.root, { params })),
    getById: (orderId) => unwrap(api.get(routes.orders.byId(orderId))),
    checkout: (payload) => unwrap(api.post(routes.orders.checkout, payload)),
    cancel: (orderId) => unwrap(api.post(routes.orders.cancel(orderId))),
  },
  notifications: {
    getRecent: (params) => unwrap(api.get(routes.notifications.recent, { params })),
  },
  products: {
    getAll: (params) => unwrap(api.get(routes.products.root, { params })),
    create: (payload) => unwrap(api.post(routes.products.root, payload)),
    update: (productId, payload) =>
      unwrap(api.put(routes.products.byId(productId), payload)),
    uploadImage: (productId, file) => {
      const formData = new FormData();
      formData.append("file", file);
      return unwrap(api.post(routes.products.uploadImage(productId), formData));
    },
    remove: (productId) => unwrap(api.delete(routes.products.byId(productId))),
    inventorySummary: (params) =>
      unwrap(api.get(routes.products.inventorySummary, { params })),
    adjustStock: (productId, payload) =>
      unwrap(api.post(routes.products.adjustStock(productId), payload)),
  },
  auditLogs: {
    getAll: (params) => unwrap(api.get(routes.auditLogs.root, { params })),
  },
  crm: {
    getSummary: () => unwrap(api.get(routes.crm.summary)),
    attendance: {
      getToday: () => unwrap(api.get(routes.crm.attendance.today)),
      scan: (payload) => unwrap(api.post(routes.crm.attendance.scan, payload)),
      checkIn: (payload) => unwrap(api.post(routes.crm.attendance.checkIn, payload)),
      checkOut: (payload) => unwrap(api.post(routes.crm.attendance.checkOut, payload)),
      getStaff: (staffCode) => unwrap(api.get(routes.crm.attendance.staffByCode(staffCode))),
      getStaffList: () => unwrap(api.get(routes.crm.attendance.staff)),
    },
    ocr: {
      extract: (file, promptHint = "", documentType = "generic") => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("documentType", documentType);
        if (promptHint.trim()) {
          formData.append("promptHint", promptHint.trim());
        }
        return unwrap(api.post(routes.crm.ocr.extract, formData));
      },
    },
    customers: {
      getAll: (params) => unwrap(api.get(routes.crm.customers, { params })),
      getById: (customerId) => unwrap(api.get(routes.crm.customerById(customerId))),
      create: (payload) => unwrap(api.post(routes.crm.customers, payload)),
      update: (customerId, payload) =>
        unwrap(api.put(routes.crm.customerById(customerId), payload)),
      remove: (customerId) => unwrap(api.delete(routes.crm.customerById(customerId))),
    },
    leads: {
      getAll: (params) => unwrap(api.get(routes.crm.leads, { params })),
      getById: (leadId) => unwrap(api.get(routes.crm.leadById(leadId))),
      create: (payload) => unwrap(api.post(routes.crm.leads, payload)),
      update: (leadId, payload) => unwrap(api.put(routes.crm.leadById(leadId), payload)),
      remove: (leadId) => unwrap(api.delete(routes.crm.leadById(leadId))),
    },
    activities: {
      getAll: (params) => unwrap(api.get(routes.crm.activities, { params })),
      getById: (activityId) => unwrap(api.get(routes.crm.activityById(activityId))),
      create: (payload) => unwrap(api.post(routes.crm.activities, payload)),
      update: (activityId, payload) =>
        unwrap(api.put(routes.crm.activityById(activityId), payload)),
      remove: (activityId) => unwrap(api.delete(routes.crm.activityById(activityId))),
    },
  },
  integrations: {
    sendTelegramTest: (payload) =>
      unwrap(api.post(routes.integrations.telegramTest, payload)),
  },
};

export default gateway;
