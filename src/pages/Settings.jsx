import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import gateway from "../services/gateway";
import useI18n from "../i18n/useI18n";
import AppIcon from "../components/common/AppIcon";
import {
  POS_APP,
  getAuthSession,
  getBestAvailablePath,
  hasAppAccess,
  hasModuleAccess,
  persistAuthSession,
} from "../services/authSession";

const DEFAULT_USER_FORM = {
  username: "",
  role: "Cashier",
  posRole: "Cashier",
  crmRole: "CrmUser",
  isPosEnabled: true,
  isCrmEnabled: false,
  defaultApp: "POS",
};

const normalizeRole = (role) => {
  return String(role || "").toLowerCase() === "admin" ? "Admin" : "Cashier";
};

const normalizeCrmRole = (role) => {
  return String(role || "").toLowerCase() === "crmadmin" ? "CrmAdmin" : "CrmUser";
};

const describeEnabledApps = (user) => {
  const apps = [];
  if (user?.isPosEnabled) {
    apps.push("POS");
  }
  if (user?.isCrmEnabled) {
    apps.push("CRM");
  }
  return apps.length > 0 ? apps.join(", ") : "No app access";
};

const formatCreatedDate = (value) => {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleDateString();
};

const getUserAvatarUrl = (user) => {
  if (user?.imageUrl) {
    return user.imageUrl;
  }

  const fallback = String(user?.username || "U").slice(0, 1).toUpperCase();
  return `https://placehold.co/64x64?text=${encodeURIComponent(fallback)}`;
};

function Settings() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [imageUrl, setImageUrl] = useState(localStorage.getItem("imageUrl") || "");
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [savingImage, setSavingImage] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");
  const [settingsError, setSettingsError] = useState("");

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersMessage, setUsersMessage] = useState("");
  const [usersError, setUsersError] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [userForm, setUserForm] = useState(DEFAULT_USER_FORM);
  const [savingUser, setSavingUser] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [telegramTestMessage, setTelegramTestMessage] = useState("");
  const [sendingTelegramTest, setSendingTelegramTest] = useState(false);
  const [telegramStatusMessage, setTelegramStatusMessage] = useState("");
  const [telegramStatusError, setTelegramStatusError] = useState("");

  const session = getAuthSession();
  const currentUsername = session.username || "";
  const currentRole = profile?.posRole || profile?.role || session.posRole || session.role || "";
  const isAdmin = currentRole.toLowerCase() === "admin";
  const canManageUsers = isAdmin && hasModuleAccess(POS_APP, "access-control", session);

  const loadSettingsData = useCallback(async () => {
    setDataLoading(true);
    setSettingsError("");

    try {
      const [profileData, ordersData, productsData] = await Promise.all([
        gateway.auth.me(),
        gateway.orders.getAll(),
        gateway.products.getAll(),
      ]);

      setProfile(profileData || null);
      setOrders(ordersData || []);
      setProducts(productsData || []);
    } catch (err) {
      const apiError = err.response?.data;
      if (typeof apiError === "string" && apiError.trim()) {
        setSettingsError(apiError);
      } else {
        setSettingsError(t("settings.failedToLoadSettingsData"));
      }
    } finally {
      setDataLoading(false);
    }
  }, [t]);

  const loadUsers = useCallback(async () => {
    if (!canManageUsers) {
      setUsers([]);
      setUsersError("");
      setUsersLoading(false);
      return;
    }

    setUsersLoading(true);
    setUsersError("");

    try {
      const usersData = await gateway.auth.getUsers();
      setUsers(usersData || []);
    } catch (err) {
      const apiError = err.response?.data;
      if (typeof apiError === "string" && apiError.trim()) {
        setUsersError(apiError);
      } else {
        setUsersError(t("settings.failedToLoadUsers"));
      }
    } finally {
      setUsersLoading(false);
    }
  }, [canManageUsers, t]);

  useEffect(() => {
    loadSettingsData();
  }, [loadSettingsData]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const stats = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const todayOrders = orders.filter((order) => {
      const created = new Date(order.createdAtUtc);
      return created >= startOfToday && created < endOfToday;
    });

    const calcTaxPercent = (orderList) => {
      const subtotal = orderList.reduce((sum, o) => sum + Number(o.subtotal || 0), 0);
      const tax = orderList.reduce((sum, o) => sum + Number(o.taxAmount || 0), 0);
      if (subtotal <= 0) {
        return 0;
      }
      return (tax / subtotal) * 100;
    };

    return {
      totalProducts: products.length,
      activeProducts: products.filter((p) => p.isActive).length,
      lowStockProducts: products.filter((p) => Number(p.stockQuantity || 0) <= 10).length,
      todayTaxRate: calcTaxPercent(todayOrders),
      allTimeTaxRate: calcTaxPercent(orders),
    };
  }, [orders, products]);

  const filteredUsers = useMemo(() => {
    const searchTerm = userSearch.trim().toLowerCase();

    return [...users]
      .filter((user) => {
        const username = String(user.username || "").toLowerCase();
        const role = normalizeRole(user.posRole || user.role).toLowerCase();

        if (searchTerm && !username.includes(searchTerm)) {
          return false;
        }

        if (userRoleFilter !== "all" && role !== userRoleFilter) {
          return false;
        }

        return true;
      })
      .sort((a, b) => String(a.username || "").localeCompare(String(b.username || "")));
  }, [userRoleFilter, userSearch, users]);

  const closeEditUserModal = useCallback(() => {
    if (savingUser) {
      return;
    }

    setShowEditUserModal(false);
    setEditingUserId(null);
    setUserForm(DEFAULT_USER_FORM);
  }, [savingUser]);

  useEffect(() => {
    if (!showEditUserModal) {
      return;
    }

    const handleEscClose = (event) => {
      if (event.key === "Escape") {
        closeEditUserModal();
      }
    };

    window.addEventListener("keydown", handleEscClose);
    return () => {
      window.removeEventListener("keydown", handleEscClose);
    };
  }, [showEditUserModal, closeEditUserModal]);

  const handleOpenEditUserModal = (user) => {
    setUsersMessage("");
    setUsersError("");
    setEditingUserId(user.id);
    setUserForm({
      username: user.username || "",
      role: normalizeRole(user.posRole || user.role),
      posRole: normalizeRole(user.posRole || user.role),
      crmRole: normalizeCrmRole(user.crmRole),
      isPosEnabled: user.isPosEnabled !== false,
      isCrmEnabled: Boolean(user.isCrmEnabled),
      defaultApp: user.defaultApp || (user.isCrmEnabled && !user.isPosEnabled ? "CRM" : "POS"),
    });
    setShowEditUserModal(true);
  };

  const handleSubmitUserUpdate = async (event) => {
    event.preventDefault();
    if (!editingUserId) {
      return;
    }

    const editingUser = users.find((user) => user.id === editingUserId);
    const isEditingCurrentUser =
      String(editingUser?.username || "").toLowerCase() === currentUsername.toLowerCase();

    setSavingUser(true);
    setUsersMessage("");
    setUsersError("");

    if (!userForm.isPosEnabled && !userForm.isCrmEnabled) {
      setUsersError("Enable POS access, CRM access, or both.");
      setSavingUser(false);
      return;
    }

    try {
      const updated = await gateway.auth.updateUser(editingUserId, {
        username: userForm.username.trim(),
        role: userForm.posRole,
        posRole: userForm.posRole,
        crmRole: userForm.isCrmEnabled ? userForm.crmRole : null,
        isPosEnabled: userForm.isPosEnabled,
        isCrmEnabled: userForm.isCrmEnabled,
        defaultApp: userForm.defaultApp,
      });

      let nextSession = null;
      if (isEditingCurrentUser && updated?.currentSession) {
        nextSession = persistAuthSession(updated.currentSession);
      }

      setUsersMessage(
        t("settings.userUpdated", {
          username: updated?.username || userForm.username.trim(),
        })
      );
      setShowEditUserModal(false);
      setEditingUserId(null);
      setUserForm(DEFAULT_USER_FORM);

      if (nextSession) {
        const canStayInAccessControl = hasAppAccess(POS_APP, nextSession)
          && hasModuleAccess(POS_APP, "access-control", nextSession);
        if (!canStayInAccessControl) {
          navigate(getBestAvailablePath(nextSession), { replace: true });
          return;
        }
      }

      await Promise.all([loadUsers(), loadSettingsData()]);
    } catch (err) {
      const apiError = err.response?.data;
      if (typeof apiError === "string" && apiError.trim()) {
        setUsersError(apiError);
      } else {
        setUsersError(t("settings.failedToUpdateUser"));
      }
    } finally {
      setSavingUser(false);
    }
  };

  const handleDeleteUser = async (user) => {
    const shouldDelete = window.confirm(
      t("settings.confirmDeleteUser", {
        username: user.username || "-",
      })
    );
    if (!shouldDelete) {
      return;
    }

    setDeletingUserId(user.id);
    setUsersMessage("");
    setUsersError("");

    try {
      await gateway.auth.deleteUser(user.id);
      setUsersMessage(
        t("settings.userDeleted", {
          username: user.username || "-",
        })
      );
      await Promise.all([loadUsers(), loadSettingsData()]);
    } catch (err) {
      const apiError = err.response?.data;
      if (typeof apiError === "string" && apiError.trim()) {
        setUsersError(apiError);
      } else {
        setUsersError(t("settings.failedToDeleteUser"));
      }
    } finally {
      setDeletingUserId(null);
    }
  };

  const handleSaveImage = async () => {
    setSavingImage(true);
    setSettingsError("");
    setSettingsMessage("");

    try {
      const data = await gateway.auth.updateProfileImage({
        imageUrl: imageUrl.trim() || null,
      });
      localStorage.setItem("imageUrl", data.imageUrl || "");
      window.dispatchEvent(new Event("user-profile-updated"));
      setSettingsMessage(t("settings.userImageUpdated"));
    } catch (err) {
      setSettingsError(err.response?.data || t("settings.failedToUpdateUserImage"));
    } finally {
      setSavingImage(false);
    }
  };

  const handleSendTelegramTest = async () => {
    if (!isAdmin) {
      return;
    }

    setSendingTelegramTest(true);
    setTelegramStatusMessage("");
    setTelegramStatusError("");

    try {
      const data = await gateway.integrations.sendTelegramTest({
        message: telegramTestMessage.trim() || null,
      });
      setTelegramStatusMessage(data?.message || t("settings.telegramTestSuccess"));
    } catch (err) {
      const apiError = err.response?.data;
      if (typeof apiError === "string" && apiError.trim()) {
        setTelegramStatusError(apiError);
      } else {
        setTelegramStatusError(t("settings.telegramTestFailed"));
      }
    } finally {
      setSendingTelegramTest(false);
    }
  };

  return (
    <div className="page-card">
      {showEditUserModal ? (
        <div
          className="inventory-modal-backdrop"
          role="presentation"
          onClick={closeEditUserModal}
        >
          <div
            className="inventory-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-user-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="inventory-modal-header">
              <div>
                <h3 id="edit-user-modal-title">{t("settings.editUser")}</h3>
                <p className="muted-text">{t("settings.userManagement")}</p>
              </div>
              <button
                type="button"
                className="screen-btn btn-with-icon"
                onClick={closeEditUserModal}
                disabled={savingUser}
              >
                <AppIcon name="close" />
                {t("common.close")}
              </button>
            </div>

            <form className="inventory-modal-form" onSubmit={handleSubmitUserUpdate}>
              <label className="inventory-modal-field">
                <span className="inventory-modal-label">{t("settings.username")}</span>
                <input
                  className="inventory-modal-input"
                  value={userForm.username}
                  onChange={(event) =>
                    setUserForm((prev) => ({ ...prev, username: event.target.value }))
                  }
                  required
                  autoFocus
                />
              </label>

              <label className="inventory-modal-field">
                <span className="inventory-modal-label">{t("settings.role")}</span>
                <select
                  className="inventory-modal-input"
                  value={userForm.posRole}
                  onChange={(event) =>
                    setUserForm((prev) => ({
                      ...prev,
                      role: event.target.value,
                      posRole: event.target.value,
                    }))
                  }
                  disabled={!userForm.isPosEnabled}
                >
                  <option value="Cashier">{t("settings.roleCashier")}</option>
                  <option value="Admin">{t("settings.roleAdmin")}</option>
                </select>
              </label>

              <label className="inventory-modal-field">
                <span className="inventory-modal-label">Enable Applications</span>
                <div className="settings-access-toggle-group">
                  <label className="settings-access-toggle">
                    <input
                      type="checkbox"
                      checked={userForm.isPosEnabled}
                      onChange={(event) =>
                        setUserForm((prev) => {
                          const isPosEnabled = event.target.checked;
                          const defaultApp = !isPosEnabled && prev.defaultApp === "POS"
                            ? (prev.isCrmEnabled ? "CRM" : "POS")
                            : prev.defaultApp;
                          return {
                            ...prev,
                            isPosEnabled,
                            defaultApp,
                          };
                        })
                      }
                    />
                    <span>POS</span>
                  </label>

                  <label className="settings-access-toggle">
                    <input
                      type="checkbox"
                      checked={userForm.isCrmEnabled}
                      onChange={(event) =>
                        setUserForm((prev) => {
                          const isCrmEnabled = event.target.checked;
                          const defaultApp = !isCrmEnabled && prev.defaultApp === "CRM"
                            ? (prev.isPosEnabled ? "POS" : "CRM")
                            : prev.defaultApp;
                          return {
                            ...prev,
                            isCrmEnabled,
                            defaultApp,
                          };
                        })
                      }
                    />
                    <span>CRM</span>
                  </label>
                </div>
              </label>

              <label className="inventory-modal-field">
                <span className="inventory-modal-label">CRM Role</span>
                <select
                  className="inventory-modal-input"
                  value={userForm.crmRole}
                  onChange={(event) =>
                    setUserForm((prev) => ({ ...prev, crmRole: event.target.value }))
                  }
                  disabled={!userForm.isCrmEnabled}
                >
                  <option value="CrmUser">CrmUser</option>
                  <option value="CrmAdmin">CrmAdmin</option>
                </select>
              </label>

              <label className="inventory-modal-field">
                <span className="inventory-modal-label">Default App</span>
                <select
                  className="inventory-modal-input"
                  value={userForm.defaultApp}
                  onChange={(event) =>
                    setUserForm((prev) => ({ ...prev, defaultApp: event.target.value }))
                  }
                >
                  {userForm.isPosEnabled ? <option value="POS">POS</option> : null}
                  {userForm.isCrmEnabled ? <option value="CRM">CRM</option> : null}
                </select>
              </label>

              <div className="product-form-actions inventory-modal-actions">
                <button className="primary-btn btn-with-icon" type="submit" disabled={savingUser}>
                  <AppIcon name="save" />
                  {savingUser ? t("settings.updatingUser") : t("settings.updateUser")}
                </button>
                <button
                  className="screen-btn btn-with-icon"
                  type="button"
                  onClick={closeEditUserModal}
                  disabled={savingUser}
                >
                  <AppIcon name="cancel" />
                  {t("common.cancel")}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <h2>{t("settings.title")}</h2>

      <div className="settings-grid">
        <div className="page-card settings-card">
          <h3>{t("settings.companyName")}</h3>
          <p className="dashboard-value">StarDark POS</p>
          <p className="muted-text">{t("settings.systemEnvironment")}</p>
        </div>

        <div className="page-card settings-card">
          <h3>{t("settings.taxConfiguration")}</h3>
          <p className="dashboard-value">{stats.todayTaxRate.toFixed(2)}%</p>
          <p className="muted-text">
            {t("settings.todayEffectiveTax", { allTime: stats.allTimeTaxRate.toFixed(2) })}
          </p>
        </div>

        <div className="page-card settings-card">
          <h3>{t("settings.userManagement")}</h3>
          {typeof profile?.usersCount === "number" ? (
            <>
              <p className="dashboard-value">{profile.usersCount}</p>
              <p className="muted-text">
                {t("settings.adminsCurrent", {
                  admins: profile?.adminsCount ?? 0,
                  username: profile?.username || "-",
                })}
              </p>
            </>
          ) : (
            <>
              <p className="dashboard-value">{t("settings.restricted")}</p>
              <p className="muted-text">{t("settings.adminOnlyTotals")}</p>
            </>
          )}
        </div>

        <div className="page-card settings-card">
          <h3>{t("settings.inventorySummary")}</h3>
          <p className="dashboard-value">{stats.totalProducts}</p>
          <p className="muted-text">
            {t("settings.activeLowStock", {
              active: stats.activeProducts,
              lowStock: stats.lowStockProducts,
            })}
          </p>
        </div>

        <div className="page-card settings-card">
          <h3>{t("settings.security")}</h3>
          <p className="dashboard-value">{t("settings.enabled")}</p>
          <p className="muted-text">{t("settings.securityDescription")}</p>
        </div>
      </div>

      <div className="settings-user-management">
        <div className="inventory-modern-toolbar">
          <div className="inventory-modern-title">
            <h2>{t("settings.userListTitle")}</h2>
            <p>{t("settings.userListSubtitle")}</p>
          </div>
          <div className="inventory-modern-controls">
            <label className="inventory-search" aria-label={t("settings.searchUsers")}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                placeholder={t("settings.searchUsers")}
                value={userSearch}
                onChange={(event) => setUserSearch(event.target.value)}
                disabled={!canManageUsers}
              />
            </label>

            <select
              value={userRoleFilter}
              onChange={(event) => setUserRoleFilter(event.target.value)}
              disabled={!canManageUsers}
            >
              <option value="all">{t("settings.allRoles")}</option>
              <option value="admin">{t("settings.roleAdmin")}</option>
              <option value="cashier">{t("settings.roleCashier")}</option>
            </select>

            <button
              className="inventory-add-btn"
              type="button"
              onClick={loadUsers}
              disabled={!canManageUsers || usersLoading}
            >
              <AppIcon name="save" />
              {t("settings.refreshUsers")}
            </button>
          </div>
        </div>

        {usersMessage ? <p className="success-text">{usersMessage}</p> : null}
        {usersError ? <p className="form-error">{usersError}</p> : null}

        {!isAdmin ? (
          <div className="page-card settings-user-restricted">
            <p className="muted-text">{t("settings.userManagementAdminOnly")}</p>
          </div>
        ) : !canManageUsers ? (
          <div className="page-card settings-user-restricted">
            <p className="muted-text">
              Access Control module is disabled for your account. Enable the `access-control` POS module to manage users.
            </p>
          </div>
        ) : (
          <div className="inventory-modern-table">
            <div className="inventory-table-head settings-users-table-head">
              <span>{t("settings.columnUser")}</span>
              <span>{t("settings.columnRole")}</span>
              <span>{t("settings.columnCreated")}</span>
              <span>{t("settings.columnActions")}</span>
            </div>

            {usersLoading ? <p className="muted-text">{t("settings.loadingUsers")}</p> : null}

            {!usersLoading && filteredUsers.length === 0 ? (
              <p className="muted-text">{t("settings.noUsersMatched")}</p>
            ) : (
              <div className="inventory-table-body">
                {filteredUsers.map((user) => {
                  const normalizedRole = normalizeRole(user.posRole || user.role);
                  const roleClassName = normalizedRole.toLowerCase();
                  const isCurrentUser =
                    String(user.username || "").toLowerCase() === currentUsername.toLowerCase();
                  const isDeleting = deletingUserId === user.id;
                  const isBusy = savingUser || isDeleting;
                  const disabledReason = isCurrentUser
                    ? t("settings.currentUserCannotBeChanged")
                    : "";

                  return (
                    <div
                      className="inventory-table-row settings-users-table-row"
                      key={user.id}
                    >
                      <div className="settings-user-cell">
                        <img src={getUserAvatarUrl(user)} alt={user.username} />
                        <div>
                          <div className="inventory-product-name">{user.username}</div>
                          <div className="inventory-product-sku">
                            {t("settings.userCreatedAt", {
                              date: formatCreatedDate(user.createdAt),
                            })}
                          </div>
                          <div className="inventory-product-sku">Apps: {describeEnabledApps(user)}</div>
                        </div>
                      </div>
                      <div>
                        <span className={`settings-role-pill ${roleClassName}`}>
                          {normalizedRole === "Admin"
                            ? t("settings.roleAdmin")
                            : t("settings.roleCashier")}
                        </span>
                        <div className="inventory-product-sku">
                          CRM: {user.isCrmEnabled ? normalizeCrmRole(user.crmRole) : "-"}
                        </div>
                      </div>
                      <div className="inventory-row-text">{formatCreatedDate(user.createdAt)}</div>
                      <div className="inventory-actions">
                        <button
                          type="button"
                          className="inventory-action-btn inventory-edit-action-btn"
                          disabled={isBusy}
                          onClick={() => handleOpenEditUserModal(user)}
                          aria-label={t("settings.editUser")}
                          title={t("settings.editUser")}
                        >
                          <AppIcon name="edit" />
                        </button>
                        <button
                          type="button"
                          className="inventory-action-btn settings-user-delete-btn"
                          disabled={isBusy || isCurrentUser}
                          onClick={() => handleDeleteUser(user)}
                          aria-label={t("common.delete")}
                          title={disabledReason || t("common.delete")}
                        >
                          <AppIcon name="delete" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {isAdmin ? (
        <div className="settings-image-section">
          <h3>{t("settings.telegramTitle")}</h3>
          <p className="muted-text">{t("settings.telegramDescription")}</p>
          <input
            placeholder={t("settings.telegramPlaceholder")}
            value={telegramTestMessage}
            onChange={(event) => setTelegramTestMessage(event.target.value)}
          />
          <button
            className="primary-btn btn-with-icon"
            type="button"
            onClick={handleSendTelegramTest}
            disabled={sendingTelegramTest}
          >
            <AppIcon name="send" />
            {sendingTelegramTest ? t("settings.telegramSending") : t("settings.telegramSendTest")}
          </button>
          {telegramStatusMessage ? <p className="success-text">{telegramStatusMessage}</p> : null}
          {telegramStatusError ? <p className="form-error">{telegramStatusError}</p> : null}
          <p className="muted-text">{t("settings.telegramConfigHint")}</p>
        </div>
      ) : null}

      <div className="settings-image-section">
        <h3>{t("settings.userImage")}</h3>
        <input
          placeholder="https://example.com/avatar.jpg"
          value={imageUrl}
          onChange={(event) => setImageUrl(event.target.value)}
        />
        <button
          className="primary-btn btn-with-icon"
          type="button"
          onClick={handleSaveImage}
          disabled={savingImage}
        >
          <AppIcon name="save" />
          {savingImage ? t("common.saving") : t("settings.saveUserImage")}
        </button>
        {settingsMessage ? <p className="success-text">{settingsMessage}</p> : null}
        {settingsError ? <p className="form-error">{settingsError}</p> : null}
        {dataLoading ? <p className="muted-text">{t("settings.loadingSettingsData")}</p> : null}
      </div>
    </div>
  );
}

export default Settings;
