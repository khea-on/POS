import api from "./api";

export const routes = {
  auth: {
    login: "/auth/login",
    register: "/auth/register",
    me: "/auth/me",
    profileImage: "/auth/profile-image",
    users: "/auth/users",
    userById: (userId) => `/auth/users/${userId}`,
  },
  orders: {
    root: "/orders",
    checkout: "/orders/checkout",
    cancel: (orderId) => `/orders/${orderId}/cancel`,
  },
  products: {
    root: "/products",
    inventorySummary: "/products/inventory-summary",
    byId: (productId) => `/products/${productId}`,
    adjustStock: (productId) => `/products/${productId}/adjust-stock`,
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
    getUsers: () => unwrap(api.get(routes.auth.users)),
    updateUser: (userId, payload) =>
      unwrap(api.put(routes.auth.userById(userId), payload)),
    deleteUser: (userId) => unwrap(api.delete(routes.auth.userById(userId))),
  },
  orders: {
    getAll: (params) => unwrap(api.get(routes.orders.root, { params })),
    checkout: (payload) => unwrap(api.post(routes.orders.checkout, payload)),
    cancel: (orderId) => unwrap(api.post(routes.orders.cancel(orderId))),
  },
  products: {
    getAll: (params) => unwrap(api.get(routes.products.root, { params })),
    create: (payload) => unwrap(api.post(routes.products.root, payload)),
    update: (productId, payload) =>
      unwrap(api.put(routes.products.byId(productId), payload)),
    remove: (productId) => unwrap(api.delete(routes.products.byId(productId))),
    inventorySummary: (params) =>
      unwrap(api.get(routes.products.inventorySummary, { params })),
    adjustStock: (productId, payload) =>
      unwrap(api.post(routes.products.adjustStock(productId), payload)),
  },
};

export default gateway;
