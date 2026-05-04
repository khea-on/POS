import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import gateway from "../services/gateway";
import AppIcon from "../components/common/AppIcon";
import {
  CRM_MODULES,
  POS_MODULES,
  getDefaultCrmModules,
  getDefaultPosModules,
  normalizeModuleKeys,
} from "../access/moduleCatalog";
import {
  POS_APP,
  getAuthSession,
  getBestAvailablePath,
  hasAppAccess,
  hasModuleAccess,
  persistAuthSession,
} from "../services/authSession";

const createDefaultForm = () => ({
  username: "",
  posRole: "Cashier",
  crmRole: "CrmUser",
  isPosEnabled: true,
  isCrmEnabled: false,
  defaultApp: "POS",
  posModules: getDefaultPosModules("Cashier"),
  crmModules: getDefaultCrmModules("CrmUser"),
});

const normalizeRole = (role) =>
  String(role || "").toLowerCase() === "admin" ? "Admin" : "Cashier";

const normalizeCrmRole = (role) =>
  String(role || "").toLowerCase() === "crmadmin" ? "CrmAdmin" : "CrmUser";

const describeApps = (user) => {
  const apps = [];
  if (user?.isPosEnabled) {
    apps.push("POS");
  }
  if (user?.isCrmEnabled) {
    apps.push("CRM");
  }
  return apps.length > 0 ? apps.join(", ") : "No access";
};

const getEnabledApps = (user) => {
  const apps = [];
  if (user?.isPosEnabled) {
    apps.push("POS");
  }
  if (user?.isCrmEnabled) {
    apps.push("CRM");
  }
  return apps;
};

const getUserInitial = (username) =>
  String(username || "U").trim().slice(0, 1).toUpperCase() || "U";

const toggleValue = (values, value) =>
  values.includes(value) ? values.filter((item) => item !== value) : [...values, value];

const POS_HELP_MODULE = "help";
const POS_HELP_PDF_MODULE = "help-pdf-conversions";

const normalizePosModules = (values) => {
  const nextValues = [...new Set(values)];
  if (!nextValues.includes(POS_HELP_MODULE)) {
    return nextValues.filter((item) => item !== POS_HELP_PDF_MODULE);
  }

  if (nextValues.includes(POS_HELP_PDF_MODULE)) {
    return nextValues;
  }

  return nextValues;
};

const togglePosModuleValue = (values, value) => {
  const toggledValues = toggleValue(values, value);
  if (value === POS_HELP_MODULE && !toggledValues.includes(POS_HELP_MODULE)) {
    return normalizePosModules(toggledValues);
  }

  if (value === POS_HELP_PDF_MODULE && toggledValues.includes(POS_HELP_PDF_MODULE)) {
    return normalizePosModules([...toggledValues, POS_HELP_MODULE]);
  }

  return normalizePosModules(toggledValues);
};

function AccessControl() {
  const navigate = useNavigate();
  const currentUsername = String(getAuthSession().username || "").toLowerCase();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [form, setForm] = useState(createDefaultForm);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await gateway.auth.getUsers();
      setUsers(data || []);
    } catch (err) {
      const apiError = err.response?.data;
      setError(typeof apiError === "string" && apiError.trim() ? apiError : "Failed to load user access.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return [...users]
      .filter((user) => {
        if (!term) {
          return true;
        }

        return [
          user.username,
          user.posRole,
          user.crmRole,
          describeApps(user),
        ].some((value) => String(value || "").toLowerCase().includes(term));
      })
      .sort((a, b) => String(a.username || "").localeCompare(String(b.username || "")));
  }, [search, users]);

  const summary = useMemo(() => {
    const posOnly = users.filter((user) => user.isPosEnabled && !user.isCrmEnabled).length;
    const crmOnly = users.filter((user) => !user.isPosEnabled && user.isCrmEnabled).length;
    const both = users.filter((user) => user.isPosEnabled && user.isCrmEnabled).length;

    return {
      total: users.length,
      posOnly,
      crmOnly,
      both,
    };
  }, [users]);

  const closeEditor = () => {
    if (saving) {
      return;
    }

    setSelectedUser(null);
    setForm(createDefaultForm());
  };

  const openEditor = (user) => {
    setMessage("");
    setError("");
    setSelectedUser(user);
    setForm({
      username: user.username || "",
      posRole: normalizeRole(user.posRole || user.role),
      crmRole: normalizeCrmRole(user.crmRole),
      isPosEnabled: user.isPosEnabled !== false,
      isCrmEnabled: Boolean(user.isCrmEnabled),
      defaultApp: user.defaultApp || (user.isCrmEnabled && !user.isPosEnabled ? "CRM" : "POS"),
      posModules: Array.isArray(user.posModules) && user.posModules.length > 0
        ? normalizePosModules(normalizeModuleKeys(user.posModules, POS_MODULES))
        : getDefaultPosModules(user.posRole || user.role),
      crmModules: Array.isArray(user.crmModules) && user.crmModules.length > 0
        ? normalizeModuleKeys(user.crmModules, CRM_MODULES)
        : getDefaultCrmModules(user.crmRole),
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedUser) {
      return;
    }

    const isEditingCurrentUser =
      String(selectedUser.username || "").toLowerCase() === currentUsername;

    setSaving(true);
    setMessage("");
    setError("");

    if (!form.isPosEnabled && !form.isCrmEnabled) {
      setError("Enable POS, CRM, or both before saving.");
      setSaving(false);
      return;
    }

    if (form.isPosEnabled && form.posModules.length === 0) {
      setError("Select at least one POS module.");
      setSaving(false);
      return;
    }

    if (form.isCrmEnabled && form.crmModules.length === 0) {
      setError("Select at least one CRM module.");
      setSaving(false);
      return;
    }

    try {
      const payload = {
        username: form.username.trim(),
        role: form.posRole,
        posRole: form.posRole,
        crmRole: form.isCrmEnabled ? form.crmRole : null,
        isPosEnabled: form.isPosEnabled,
        isCrmEnabled: form.isCrmEnabled,
        defaultApp: form.defaultApp,
        posModules: form.isPosEnabled ? normalizeModuleKeys(form.posModules, POS_MODULES) : [],
        crmModules: form.isCrmEnabled ? normalizeModuleKeys(form.crmModules, CRM_MODULES) : [],
      };

      const updated = await gateway.auth.updateUser(selectedUser.id, payload);
      let nextSession = null;
      if (isEditingCurrentUser && updated?.currentSession) {
        nextSession = persistAuthSession(updated.currentSession);
      }

      setMessage(`Updated access for ${updated?.username || form.username.trim()}.`);
      setSelectedUser(null);
      setForm(createDefaultForm());

      if (nextSession) {
        const canStayInAccessControl = hasAppAccess(POS_APP, nextSession)
          && hasModuleAccess(POS_APP, "access-control", nextSession);
        if (!canStayInAccessControl) {
          navigate(getBestAvailablePath(nextSession), { replace: true });
          return;
        }
      }

      await loadUsers();
    } catch (err) {
      const apiError = err.response?.data;
      setError(typeof apiError === "string" && apiError.trim() ? apiError : "Failed to update user access.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="access-control-page">
      {selectedUser ? (
        <div className="inventory-modal-backdrop" role="presentation" onClick={closeEditor}>
          <div
            className="inventory-modal-card access-control-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="access-control-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="inventory-modal-header">
              <div>
                <h3 id="access-control-title">Manage User Access</h3>
                <p className="muted-text">Control app access, roles, and modules for {selectedUser.username}.</p>
              </div>
              <button
                type="button"
                className="screen-btn btn-with-icon"
                onClick={closeEditor}
                disabled={saving}
              >
                <AppIcon name="close" />
                Close
              </button>
            </div>

            <form className="inventory-modal-form access-control-form" onSubmit={handleSubmit}>
              <label className="inventory-modal-field">
                <span className="inventory-modal-label">Username</span>
                <input
                  className="inventory-modal-input"
                  value={form.username}
                  onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
                  required
                />
              </label>

              <label className="inventory-modal-field">
                <span className="inventory-modal-label">Enable Applications</span>
                <div className="settings-access-toggle-group">
                  <label className="settings-access-toggle">
                    <input
                      type="checkbox"
                      checked={form.isPosEnabled}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          isPosEnabled: event.target.checked,
                          defaultApp: !event.target.checked && prev.defaultApp === "POS"
                            ? (prev.isCrmEnabled ? "CRM" : "POS")
                            : prev.defaultApp,
                          posModules: event.target.checked
                            ? (prev.posModules.length > 0 ? prev.posModules : getDefaultPosModules(prev.posRole))
                            : [],
                        }))
                      }
                    />
                    <span>POS</span>
                  </label>

                  <label className="settings-access-toggle">
                    <input
                      type="checkbox"
                      checked={form.isCrmEnabled}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          isCrmEnabled: event.target.checked,
                          defaultApp: !event.target.checked && prev.defaultApp === "CRM"
                            ? (prev.isPosEnabled ? "POS" : "CRM")
                            : prev.defaultApp,
                          crmModules: event.target.checked
                            ? (prev.crmModules.length > 0 ? prev.crmModules : getDefaultCrmModules(prev.crmRole))
                            : [],
                        }))
                      }
                    />
                    <span>CRM</span>
                  </label>
                </div>
              </label>

              <div className="crm-profile-grid">
                <label className="inventory-modal-field">
                  <span className="inventory-modal-label">POS Role</span>
                  <select
                    className="inventory-modal-input"
                    value={form.posRole}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        posRole: event.target.value,
                        posModules: prev.isPosEnabled ? getDefaultPosModules(event.target.value) : prev.posModules,
                      }))
                    }
                    disabled={!form.isPosEnabled}
                  >
                    <option value="Cashier">Cashier</option>
                    <option value="Admin">Admin</option>
                  </select>
                </label>

                <label className="inventory-modal-field">
                  <span className="inventory-modal-label">CRM Role</span>
                  <select
                    className="inventory-modal-input"
                    value={form.crmRole}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        crmRole: event.target.value,
                        crmModules: prev.isCrmEnabled ? getDefaultCrmModules(event.target.value) : prev.crmModules,
                      }))
                    }
                    disabled={!form.isCrmEnabled}
                  >
                    <option value="CrmUser">CrmUser</option>
                    <option value="CrmAdmin">CrmAdmin</option>
                  </select>
                </label>

                <label className="inventory-modal-field">
                  <span className="inventory-modal-label">Default App</span>
                  <select
                    className="inventory-modal-input"
                    value={form.defaultApp}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, defaultApp: event.target.value }))
                    }
                  >
                    {form.isPosEnabled ? <option value="POS">POS</option> : null}
                    {form.isCrmEnabled ? <option value="CRM">CRM</option> : null}
                  </select>
                </label>
              </div>

              <div className="inventory-modal-field access-module-section">
                <span className="inventory-modal-label">POS Modules</span>
                <div className="module-checkbox-grid">
                  {POS_MODULES.map((module) => (
                    <label className="settings-access-toggle" key={module.key}>
                      <input
                        type="checkbox"
                        checked={form.posModules.includes(module.key)}
                        disabled={!form.isPosEnabled}
                        onChange={() =>
                          setForm((prev) => ({
                            ...prev,
                            posModules: togglePosModuleValue(prev.posModules, module.key),
                          }))
                        }
                      />
                      <span>{module.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="inventory-modal-field access-module-section">
                <span className="inventory-modal-label">CRM Modules</span>
                <div className="module-checkbox-grid">
                  {CRM_MODULES.map((module) => (
                    <label className="settings-access-toggle" key={module.key}>
                      <input
                        type="checkbox"
                        checked={form.crmModules.includes(module.key)}
                        disabled={!form.isCrmEnabled}
                        onChange={() =>
                          setForm((prev) => ({
                            ...prev,
                            crmModules: toggleValue(prev.crmModules, module.key),
                          }))
                        }
                      />
                      <span>{module.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="product-form-actions inventory-modal-actions">
                <button className="primary-btn btn-with-icon" type="submit" disabled={saving}>
                  <AppIcon name="save" />
                  {saving ? "Saving..." : "Save Access"}
                </button>
                <button className="screen-btn btn-with-icon" type="button" onClick={closeEditor} disabled={saving}>
                  <AppIcon name="cancel" />
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <div className="inventory-modern-toolbar">
        <div className="inventory-modern-title">
          <h2>Access Control</h2>
          <p>Manage POS role, CRM role, app access, and module access per user.</p>
        </div>
        <div className="inventory-modern-controls">
          <label className="inventory-search" aria-label="Search users">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              placeholder="Search users, roles, or apps..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <button className="inventory-add-btn" type="button" onClick={loadUsers} disabled={loading}>
            <AppIcon name="save" />
            Refresh
          </button>
        </div>
      </div>

      <div className="settings-grid access-summary-grid">
        <div className="page-card settings-card access-summary-card">
          <h3>Total Users</h3>
          <p className="dashboard-value">{summary.total}</p>
        </div>
        <div className="page-card settings-card access-summary-card">
          <h3>POS Only</h3>
          <p className="dashboard-value">{summary.posOnly}</p>
        </div>
        <div className="page-card settings-card access-summary-card">
          <h3>CRM Only</h3>
          <p className="dashboard-value">{summary.crmOnly}</p>
        </div>
        <div className="page-card settings-card access-summary-card">
          <h3>POS + CRM</h3>
          <p className="dashboard-value">{summary.both}</p>
        </div>
      </div>

      {message ? <p className="success-text">{message}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}

      <div className="inventory-modern-table">
        <div className="inventory-table-head settings-users-table-head access-control-table-head">
          <span>User</span>
          <span>Applications</span>
          <span>Roles</span>
          <span>Modules</span>
          <span>Actions</span>
        </div>

        {loading ? <p className="muted-text">Loading user access...</p> : null}

        {!loading && filteredUsers.length === 0 ? (
          <p className="muted-text">No users matched your search.</p>
        ) : (
          <div className="inventory-table-body">
            {filteredUsers.map((user) => {
              const isCurrentUser = String(user.username || "").toLowerCase() === currentUsername;
              const enabledApps = getEnabledApps(user);
              const posModuleCount = Array.isArray(user.posModules) ? user.posModules.length : 0;
              const crmModuleCount = Array.isArray(user.crmModules) ? user.crmModules.length : 0;

              return (
                <div className="inventory-table-row access-control-table-row" key={user.id}>
                  <div className="settings-user-cell">
                    <div className="access-user-avatar" aria-hidden="true">
                      {getUserInitial(user.username)}
                    </div>
                    <div>
                      <div className="inventory-product-name">{user.username}</div>
                      <div className="inventory-product-sku">Default app: {user.defaultApp || "-"}</div>
                    </div>
                  </div>

                  <div className="inventory-row-text access-app-cell" data-label="Applications">
                    {enabledApps.length > 0 ? (
                      <div className="access-pill-list">
                        {enabledApps.map((appName) => (
                          <span className="access-app-pill" key={appName}>{appName}</span>
                        ))}
                      </div>
                    ) : (
                      <span className="access-empty-value">No access</span>
                    )}
                  </div>

                  <div className="inventory-row-text access-detail-stack" data-label="Roles">
                    <div className="access-detail-line">
                      <span className="access-detail-label">POS</span>
                      <span className="access-detail-value">
                        {user.isPosEnabled ? normalizeRole(user.posRole || user.role) : "-"}
                      </span>
                    </div>
                    <div className="access-detail-line">
                      <span className="access-detail-label">CRM</span>
                      <span className="access-detail-value">
                        {user.isCrmEnabled ? normalizeCrmRole(user.crmRole) : "-"}
                      </span>
                    </div>
                  </div>

                  <div className="inventory-row-text access-detail-stack" data-label="Modules">
                    <div className="access-detail-line">
                      <span className="access-detail-label">POS</span>
                      <span className="access-detail-value">{posModuleCount}</span>
                    </div>
                    <div className="access-detail-line">
                      <span className="access-detail-label">CRM</span>
                      <span className="access-detail-value">{crmModuleCount}</span>
                    </div>
                  </div>

                  <div className="inventory-actions access-row-actions">
                    <button
                      type="button"
                      className="inventory-action-btn inventory-edit-action-btn access-manage-btn"
                      onClick={() => openEditor(user)}
                      aria-label="Manage access"
                      title={isCurrentUser ? "Manage your own access" : "Manage access"}
                    >
                      <AppIcon name="edit" />
                      <span className="access-action-text">Manage access</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export default AccessControl;
