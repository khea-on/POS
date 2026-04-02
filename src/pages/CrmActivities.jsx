import { useCallback, useEffect, useMemo, useState } from "react";
import AppIcon from "../components/common/AppIcon";
import {
  ACTIVITY_PRIORITY_OPTIONS,
  ACTIVITY_STATUS_OPTIONS,
  ACTIVITY_TYPE_OPTIONS,
  formatDateTime,
  getCrmEnumLabel,
  getStatusTone,
  toApiDateTime,
  toDateTimeLocalInputValue,
} from "../crm/config";
import useI18n from "../i18n/useI18n";
import gateway from "../services/gateway";
import { CRM_APP, getAuthSession, hasModuleAccess } from "../services/authSession";

const DEFAULT_ACTIVITY_FORM = {
  title: "",
  activityType: "Task",
  status: "Pending",
  priority: "Medium",
  details: "",
  dueAtUtc: "",
  completedAtUtc: "",
  assignedTo: "",
  customerId: "",
  leadId: "",
  customerLabel: "",
  leadLabel: "",
};

const cleanOptionalText = (value) => {
  const trimmed = String(value || "").trim();
  return trimmed ? trimmed : null;
};

const parseNullableInt = (value) => {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

function CrmActivities() {
  const { language, t } = useI18n();
  const session = getAuthSession();
  const canReadCustomers = hasModuleAccess(CRM_APP, "crm-customers", session);
  const canReadLeads = hasModuleAccess(CRM_APP, "crm-leads", session);

  const [activities, setActivities] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingActivityId, setEditingActivityId] = useState(null);
  const [form, setForm] = useState(DEFAULT_ACTIVITY_FORM);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadActivityData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [activityData, customerData, leadData] = await Promise.all([
        gateway.crm.activities.getAll(),
        canReadCustomers ? gateway.crm.customers.getAll() : Promise.resolve([]),
        canReadLeads ? gateway.crm.leads.getAll() : Promise.resolve([]),
      ]);

      setActivities(Array.isArray(activityData) ? activityData : []);
      setCustomers(Array.isArray(customerData) ? customerData : []);
      setLeads(Array.isArray(leadData) ? leadData : []);
    } catch (err) {
      const apiError = err.response?.data;
      setError(typeof apiError === "string" && apiError.trim() ? apiError : t("crm.activities.failedToLoad"));
    } finally {
      setLoading(false);
    }
  }, [canReadCustomers, canReadLeads, t]);

  useEffect(() => {
    loadActivityData();
  }, [loadActivityData]);

  const filteredActivities = useMemo(() => {
    const now = Date.now();
    const term = search.trim().toLowerCase();

    const filtered = activities.filter((activity) => {
      const searchable = [
        activity.title,
        activity.activityType,
        activity.status,
        activity.priority,
        activity.assignedTo,
        activity.customerName,
        activity.leadName,
        activity.details,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (term && !searchable.includes(term)) {
        return false;
      }

      if (statusFilter !== "all" && activity.status !== statusFilter) {
        return false;
      }

      if (typeFilter !== "all" && activity.activityType !== typeFilter) {
        return false;
      }

      return true;
    });

    filtered.sort((left, right) => {
      const leftPendingRank = left.status === "Pending" ? 0 : 1;
      const rightPendingRank = right.status === "Pending" ? 0 : 1;
      if (leftPendingRank !== rightPendingRank) {
        return leftPendingRank - rightPendingRank;
      }

      const leftDueAt = new Date(left.dueAtUtc || now + 365 * 24 * 60 * 60 * 1000).getTime();
      const rightDueAt = new Date(right.dueAtUtc || now + 365 * 24 * 60 * 60 * 1000).getTime();
      if (leftDueAt !== rightDueAt) {
        return leftDueAt - rightDueAt;
      }

      return new Date(right.createdAtUtc || 0).getTime() - new Date(left.createdAtUtc || 0).getTime();
    });

    return filtered;
  }, [activities, search, statusFilter, typeFilter]);

  const summary = useMemo(() => {
    const now = Date.now();
    return {
      total: activities.length,
      pending: activities.filter((activity) => activity.status === "Pending").length,
      completed: activities.filter((activity) => activity.status === "Completed").length,
      overdue: activities.filter((activity) => {
        if (activity.status !== "Pending" || !activity.dueAtUtc) {
          return false;
        }

        const dueAt = new Date(activity.dueAtUtc).getTime();
        return Number.isFinite(dueAt) && dueAt < now;
      }).length,
    };
  }, [activities]);

  const resetForm = useCallback(() => {
    setForm(DEFAULT_ACTIVITY_FORM);
    setEditingActivityId(null);
  }, []);

  const closeModal = useCallback(() => {
    if (saving) {
      return;
    }

    setShowModal(false);
    resetForm();
  }, [resetForm, saving]);

  useEffect(() => {
    if (!showModal) {
      return undefined;
    }

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        closeModal();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [closeModal, showModal]);

  const openCreateModal = () => {
    setMessage("");
    setError("");
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (activity) => {
    setMessage("");
    setError("");
    setEditingActivityId(activity.id);
    setForm({
      title: activity.title || "",
      activityType: activity.activityType || "Task",
      status: activity.status || "Pending",
      priority: activity.priority || "Medium",
      details: activity.details || "",
      dueAtUtc: toDateTimeLocalInputValue(activity.dueAtUtc),
      completedAtUtc: toDateTimeLocalInputValue(activity.completedAtUtc),
      assignedTo: activity.assignedTo || "",
      customerId: activity.customerId == null ? "" : String(activity.customerId),
      leadId: activity.leadId == null ? "" : String(activity.leadId),
      customerLabel: activity.customerName || "",
      leadLabel: activity.leadName || "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    const payload = {
      title: form.title.trim(),
      activityType: form.activityType,
      status: form.status,
      priority: form.priority,
      details: cleanOptionalText(form.details),
      dueAtUtc: toApiDateTime(form.dueAtUtc),
      completedAtUtc: form.status === "Completed" ? toApiDateTime(form.completedAtUtc) : null,
      assignedTo: cleanOptionalText(form.assignedTo),
      customerId: parseNullableInt(form.customerId),
      leadId: parseNullableInt(form.leadId),
    };

    try {
      if (editingActivityId) {
        await gateway.crm.activities.update(editingActivityId, payload);
        setMessage(t("crm.activities.updateSuccess"));
      } else {
        await gateway.crm.activities.create(payload);
        setMessage(t("crm.activities.createSuccess"));
      }

      setShowModal(false);
      resetForm();
      await loadActivityData();
    } catch (err) {
      const apiError = err.response?.data;
      setError(typeof apiError === "string" && apiError.trim() ? apiError : t("crm.activities.failedToSave"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (activity) => {
    if (!window.confirm(t("crm.activities.confirmDelete", { name: activity.title }))) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      await gateway.crm.activities.remove(activity.id);
      setMessage(t("crm.activities.deleteSuccess"));
      if (editingActivityId === activity.id) {
        setShowModal(false);
        resetForm();
      }
      await loadActivityData();
    } catch (err) {
      const apiError = err.response?.data;
      setError(typeof apiError === "string" && apiError.trim() ? apiError : t("crm.activities.failedToDelete"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="crm-entity-page">
      {showModal ? (
        <div className="inventory-modal-backdrop" role="presentation" onClick={closeModal}>
          <div
            className="inventory-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="crm-activity-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="inventory-modal-header">
              <div>
                <h3 id="crm-activity-modal-title">
                  {editingActivityId ? t("crm.activities.edit") : t("crm.activities.add")}
                </h3>
                <p className="muted-text">{t("crm.activities.modalSubtitle")}</p>
              </div>
              <button
                type="button"
                className="screen-btn btn-with-icon"
                onClick={closeModal}
                disabled={saving}
              >
                <AppIcon name="close" />
                {t("common.close")}
              </button>
            </div>

            <form className="inventory-modal-form" onSubmit={handleSubmit}>
              <label className="inventory-modal-field inventory-modal-field-wide">
                <span className="inventory-modal-label">{t("crm.activities.titleLabel")}</span>
                <input
                  className="inventory-modal-input"
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  autoFocus
                  required
                />
              </label>

              <label className="inventory-modal-field">
                <span className="inventory-modal-label">{t("crm.activities.type")}</span>
                <select
                  className="inventory-modal-input"
                  value={form.activityType}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, activityType: event.target.value }))
                  }
                >
                  {ACTIVITY_TYPE_OPTIONS.map((activityType) => (
                    <option key={activityType} value={activityType}>
                      {getCrmEnumLabel(t, "activityType", activityType)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="inventory-modal-field">
                <span className="inventory-modal-label">{t("crm.activities.status")}</span>
                <select
                  className="inventory-modal-input"
                  value={form.status}
                  onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                >
                  {ACTIVITY_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {getCrmEnumLabel(t, "activityStatus", status)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="inventory-modal-field">
                <span className="inventory-modal-label">{t("crm.activities.priority")}</span>
                <select
                  className="inventory-modal-input"
                  value={form.priority}
                  onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))}
                >
                  {ACTIVITY_PRIORITY_OPTIONS.map((priority) => (
                    <option key={priority} value={priority}>
                      {getCrmEnumLabel(t, "activityPriority", priority)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="inventory-modal-field">
                <span className="inventory-modal-label">{t("crm.activities.assignedTo")}</span>
                <input
                  className="inventory-modal-input"
                  value={form.assignedTo}
                  onChange={(event) => setForm((current) => ({ ...current, assignedTo: event.target.value }))}
                />
              </label>

              <label className="inventory-modal-field">
                <span className="inventory-modal-label">{t("crm.activities.dueAt")}</span>
                <input
                  className="inventory-modal-input"
                  type="datetime-local"
                  value={form.dueAtUtc}
                  onChange={(event) => setForm((current) => ({ ...current, dueAtUtc: event.target.value }))}
                />
              </label>

              {form.status === "Completed" ? (
                <label className="inventory-modal-field">
                  <span className="inventory-modal-label">{t("crm.activities.completedAt")}</span>
                  <input
                    className="inventory-modal-input"
                    type="datetime-local"
                    value={form.completedAtUtc}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, completedAtUtc: event.target.value }))
                    }
                  />
                </label>
              ) : (
                <div className="inventory-modal-field" />
              )}

              <label className="inventory-modal-field">
                <span className="inventory-modal-label">{t("crm.activities.customerLink")}</span>
                <select
                  className="inventory-modal-input"
                  value={form.customerId}
                  onChange={(event) => setForm((current) => ({ ...current, customerId: event.target.value }))}
                  disabled={!canReadCustomers}
                >
                  <option value="">
                    {canReadCustomers ? t("crm.activities.noLinkedCustomer") : t("crm.activities.customerModuleDisabled")}
                  </option>
                  {!canReadCustomers && form.customerId ? (
                    <option value={form.customerId}>{form.customerLabel || t("crm.activities.customerLink")}</option>
                  ) : null}
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.fullName}
                    </option>
                  ))}
                </select>
              </label>

              <label className="inventory-modal-field">
                <span className="inventory-modal-label">{t("crm.activities.leadLink")}</span>
                <select
                  className="inventory-modal-input"
                  value={form.leadId}
                  onChange={(event) => setForm((current) => ({ ...current, leadId: event.target.value }))}
                  disabled={!canReadLeads}
                >
                  <option value="">
                    {canReadLeads ? t("crm.activities.noLinkedLead") : t("crm.activities.leadModuleDisabled")}
                  </option>
                  {!canReadLeads && form.leadId ? (
                    <option value={form.leadId}>{form.leadLabel || t("crm.activities.leadLink")}</option>
                  ) : null}
                  {leads.map((lead) => (
                    <option key={lead.id} value={lead.id}>
                      {lead.fullName}
                    </option>
                  ))}
                </select>
              </label>

              <label className="inventory-modal-field inventory-modal-field-wide">
                <span className="inventory-modal-label">{t("crm.activities.details")}</span>
                <textarea
                  className="inventory-modal-input crm-textarea"
                  value={form.details}
                  onChange={(event) => setForm((current) => ({ ...current, details: event.target.value }))}
                  placeholder={t("crm.activities.detailsPlaceholder")}
                />
              </label>

              <div className="product-form-actions inventory-modal-actions">
                <button className="primary-btn btn-with-icon" type="submit" disabled={saving}>
                  <AppIcon name={editingActivityId ? "save" : "plus"} />
                  {saving
                    ? t("common.saving")
                    : editingActivityId
                      ? t("crm.activities.updateButton")
                      : t("crm.activities.createButton")}
                </button>
                <button className="screen-btn btn-with-icon" type="button" onClick={closeModal} disabled={saving}>
                  <AppIcon name="cancel" />
                  {t("common.cancel")}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <div className="inventory-modern-toolbar">
        <div className="inventory-modern-title">
          <h2>{t("crm.activities.title")}</h2>
          <p>{t("crm.activities.subtitle")}</p>
        </div>

        <div className="inventory-modern-controls">
          <label className="inventory-search" aria-label="Search activities">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              placeholder={t("crm.activities.searchPlaceholder")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">{t("crm.activities.allStatus")}</option>
            {ACTIVITY_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {getCrmEnumLabel(t, "activityStatus", status)}
              </option>
            ))}
          </select>

          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            <option value="all">{t("crm.activities.allTypes")}</option>
            {ACTIVITY_TYPE_OPTIONS.map((activityType) => (
              <option key={activityType} value={activityType}>
                {getCrmEnumLabel(t, "activityType", activityType)}
              </option>
            ))}
          </select>

          <button className="inventory-add-btn" type="button" onClick={openCreateModal}>
            <AppIcon name="plus" />
            {t("crm.activities.add")}
          </button>
        </div>
      </div>

      <div className="inventory-summary-grid access-summary-grid">
        <div className="page-card inventory-summary-card settings-card">
          <h3>{t("crm.activities.total")}</h3>
          <p className="dashboard-value">{summary.total}</p>
        </div>
        <div className="page-card inventory-summary-card settings-card">
          <h3>{t("crm.activities.pending")}</h3>
          <p className="dashboard-value">{summary.pending}</p>
        </div>
        <div className="page-card inventory-summary-card settings-card">
          <h3>{t("crm.activities.completed")}</h3>
          <p className="dashboard-value">{summary.completed}</p>
        </div>
        <div className="page-card inventory-summary-card settings-card">
          <h3>{t("crm.activities.overdue")}</h3>
          <p className="dashboard-value">{summary.overdue}</p>
        </div>
      </div>

      {message ? <p className="success-text">{message}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}

      <div className="inventory-modern-table">
        <div className="inventory-table-head crm-table-head crm-activities-table">
          <span>{t("crm.activities.activityColumn")}</span>
          <span>{t("crm.activities.typeColumn")}</span>
          <span>{t("crm.activities.statusColumn")}</span>
          <span>{t("crm.activities.dueColumn")}</span>
          <span>{t("crm.activities.linkedToColumn")}</span>
          <span>{t("crm.activities.actionsColumn")}</span>
        </div>

        {loading ? <p className="muted-text">{t("crm.activities.loading")}</p> : null}

        {!loading && filteredActivities.length === 0 ? (
          <p className="muted-text">{t("crm.activities.noResults")}</p>
        ) : (
          <div className="inventory-table-body">
            {filteredActivities.map((activity) => (
              <div className="inventory-table-row crm-table-row crm-activities-table" key={activity.id}>
                <div className="crm-primary-cell">
                  <strong>{activity.title}</strong>
                  <span className="crm-secondary-line">
                    {activity.assignedTo || t("crm.unassigned")} · {getCrmEnumLabel(t, "activityPriority", activity.priority)}
                  </span>
                </div>
                <div className="inventory-row-text">{getCrmEnumLabel(t, "activityType", activity.activityType)}</div>
                <div className="crm-list-meta">
                  <span className={`crm-status-pill ${getStatusTone(activity.status)}`}>
                    {getCrmEnumLabel(t, "activityStatus", activity.status)}
                  </span>
                </div>
                <div className="crm-primary-cell">
                  <span>{activity.dueAtUtc ? formatDateTime(activity.dueAtUtc, language) : t("crm.activities.noDueDate")}</span>
                  <span className="crm-secondary-line">
                    {activity.completedAtUtc
                      ? t("crm.activities.doneAt", { date: formatDateTime(activity.completedAtUtc, language) })
                      : t("crm.activities.open")}
                  </span>
                </div>
                <div className="crm-primary-cell">
                  <span>{activity.customerName || activity.leadName || t("crm.activities.generalActivity")}</span>
                  <span className="crm-secondary-line">
                    {activity.customerName && activity.leadName
                      ? `${t("crm.activities.leadLink")}: ${activity.leadName}`
                      : activity.customerName
                        ? t("crm.activities.customerLinked")
                        : activity.leadName
                          ? t("crm.activities.leadLinked")
                          : t("crm.activities.noLinkedRecord")}
                  </span>
                </div>
                <div className="crm-table-actions">
                  <button
                    type="button"
                    className="inventory-action-btn inventory-edit-action-btn"
                    onClick={() => openEditModal(activity)}
                    disabled={saving}
                    aria-label={`${t("crm.activities.edit")} ${activity.title}`}
                  >
                    <AppIcon name="edit" />
                  </button>
                  <button
                    type="button"
                    className="inventory-action-btn settings-user-delete-btn"
                    onClick={() => handleDelete(activity)}
                    disabled={saving}
                    aria-label={`${t("common.delete")} ${activity.title}`}
                  >
                    <AppIcon name="delete" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default CrmActivities;
