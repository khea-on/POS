import { useCallback, useEffect, useMemo, useState } from "react";
import AppIcon from "../components/common/AppIcon";
import {
  formatCurrency,
  formatDateTime,
  getCrmEnumLabel,
  getStatusTone,
  LEAD_STATUS_OPTIONS,
  toApiDateTime,
  toDateTimeLocalInputValue,
} from "../crm/config";
import useI18n from "../i18n/useI18n";
import gateway from "../services/gateway";

const DEFAULT_LEAD_FORM = {
  fullName: "",
  companyName: "",
  email: "",
  phone: "",
  status: "New",
  source: "",
  estimatedValue: "",
  assignedTo: "",
  notes: "",
  nextFollowUpUtc: "",
};

const OPEN_LEAD_STATUSES = new Set(["New", "Qualified", "Proposal"]);

const cleanOptionalText = (value) => {
  const trimmed = String(value || "").trim();
  return trimmed ? trimmed : null;
};

function CrmLeads() {
  const { language, t } = useI18n();
  const [leads, setLeads] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [sort, setSort] = useState("name_asc");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingLeadId, setEditingLeadId] = useState(null);
  const [form, setForm] = useState(DEFAULT_LEAD_FORM);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadLeads = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await gateway.crm.leads.getAll();
      setLeads(Array.isArray(data) ? data : []);
    } catch (err) {
      const apiError = err.response?.data;
      setError(typeof apiError === "string" && apiError.trim() ? apiError : t("crm.leads.failedToLoad"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const filteredLeads = useMemo(() => {
    const term = search.trim().toLowerCase();
    const ownerTerm = ownerFilter.trim().toLowerCase();
    const filtered = leads.filter((lead) => {
      const searchable = [
        lead.fullName,
        lead.companyName,
        lead.email,
        lead.phone,
        lead.source,
        lead.assignedTo,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (term && !searchable.includes(term)) {
        return false;
      }

      if (statusFilter !== "all" && lead.status !== statusFilter) {
        return false;
      }

      if (ownerTerm && !String(lead.assignedTo || "").toLowerCase().includes(ownerTerm)) {
        return false;
      }

      return true;
    });

    filtered.sort((left, right) => {
      const leftName = String(left.fullName || "");
      const rightName = String(right.fullName || "");
      const leftValue = Number(left.estimatedValue || 0);
      const rightValue = Number(right.estimatedValue || 0);
      const leftFollowUp = new Date(left.nextFollowUpUtc || Date.now() + 365 * 24 * 60 * 60 * 1000).getTime();
      const rightFollowUp = new Date(right.nextFollowUpUtc || Date.now() + 365 * 24 * 60 * 60 * 1000).getTime();
      const leftCreated = new Date(left.createdAtUtc || 0).getTime();
      const rightCreated = new Date(right.createdAtUtc || 0).getTime();

      if (sort === "name_desc") {
        return rightName.localeCompare(leftName);
      }
      if (sort === "value_desc") {
        return rightValue - leftValue;
      }
      if (sort === "value_asc") {
        return leftValue - rightValue;
      }
      if (sort === "followup_asc") {
        return leftFollowUp - rightFollowUp;
      }
      if (sort === "newest") {
        return rightCreated - leftCreated;
      }
      return leftName.localeCompare(rightName);
    });

    return filtered;
  }, [leads, ownerFilter, search, sort, statusFilter]);

  const summary = useMemo(() => {
    const openLeads = leads.filter((lead) => OPEN_LEAD_STATUSES.has(lead.status));
    return {
      total: leads.length,
      open: openLeads.length,
      won: leads.filter((lead) => lead.status === "Won").length,
      pipelineValue: openLeads.reduce((sum, lead) => sum + Number(lead.estimatedValue || 0), 0),
    };
  }, [leads]);

  const resetForm = useCallback(() => {
    setForm(DEFAULT_LEAD_FORM);
    setEditingLeadId(null);
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

  const openEditModal = (lead) => {
    setMessage("");
    setError("");
    setEditingLeadId(lead.id);
    setForm({
      fullName: lead.fullName || "",
      companyName: lead.companyName || "",
      email: lead.email || "",
      phone: lead.phone || "",
      status: lead.status || "New",
      source: lead.source || "",
      estimatedValue: lead.estimatedValue == null ? "" : String(lead.estimatedValue),
      assignedTo: lead.assignedTo || "",
      notes: lead.notes || "",
      nextFollowUpUtc: toDateTimeLocalInputValue(lead.nextFollowUpUtc),
    });
    setShowModal(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    const numericValue = cleanOptionalText(form.estimatedValue);
    const payload = {
      fullName: form.fullName.trim(),
      companyName: cleanOptionalText(form.companyName),
      email: cleanOptionalText(form.email),
      phone: cleanOptionalText(form.phone),
      status: form.status,
      source: cleanOptionalText(form.source),
      estimatedValue: numericValue === null ? null : Number(numericValue),
      assignedTo: cleanOptionalText(form.assignedTo),
      notes: cleanOptionalText(form.notes),
      nextFollowUpUtc: toApiDateTime(form.nextFollowUpUtc),
    };

    try {
      if (editingLeadId) {
        await gateway.crm.leads.update(editingLeadId, payload);
        setMessage(t("crm.leads.updateSuccess"));
      } else {
        await gateway.crm.leads.create(payload);
        setMessage(t("crm.leads.createSuccess"));
      }

      setShowModal(false);
      resetForm();
      await loadLeads();
    } catch (err) {
      const apiError = err.response?.data;
      setError(typeof apiError === "string" && apiError.trim() ? apiError : t("crm.leads.failedToSave"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (lead) => {
    if (!window.confirm(t("crm.leads.confirmDelete", { name: lead.fullName }))) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      await gateway.crm.leads.remove(lead.id);
      setMessage(t("crm.leads.deleteSuccess"));
      if (editingLeadId === lead.id) {
        setShowModal(false);
        resetForm();
      }
      await loadLeads();
    } catch (err) {
      const apiError = err.response?.data;
      setError(typeof apiError === "string" && apiError.trim() ? apiError : t("crm.leads.failedToDelete"));
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
            aria-labelledby="crm-lead-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="inventory-modal-header">
              <div>
                <h3 id="crm-lead-modal-title">{editingLeadId ? t("crm.leads.edit") : t("crm.leads.add")}</h3>
                <p className="muted-text">{t("crm.leads.modalSubtitle")}</p>
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
              <label className="inventory-modal-field">
                <span className="inventory-modal-label">{t("crm.leads.fullName")}</span>
                <input
                  className="inventory-modal-input"
                  value={form.fullName}
                  onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
                  autoFocus
                  required
                />
              </label>

              <label className="inventory-modal-field">
                <span className="inventory-modal-label">{t("crm.leads.company")}</span>
                <input
                  className="inventory-modal-input"
                  value={form.companyName}
                  onChange={(event) => setForm((current) => ({ ...current, companyName: event.target.value }))}
                />
              </label>

              <label className="inventory-modal-field">
                <span className="inventory-modal-label">{t("crm.leads.email")}</span>
                <input
                  className="inventory-modal-input"
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                />
              </label>

              <label className="inventory-modal-field">
                <span className="inventory-modal-label">{t("crm.leads.phone")}</span>
                <input
                  className="inventory-modal-input"
                  value={form.phone}
                  onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                />
              </label>

              <label className="inventory-modal-field">
                <span className="inventory-modal-label">{t("crm.leads.status")}</span>
                <select
                  className="inventory-modal-input"
                  value={form.status}
                  onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                >
                  {LEAD_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {getCrmEnumLabel(t, "leadStatus", status)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="inventory-modal-field">
                <span className="inventory-modal-label">{t("crm.leads.source")}</span>
                <input
                  className="inventory-modal-input"
                  value={form.source}
                  onChange={(event) => setForm((current) => ({ ...current, source: event.target.value }))}
                  placeholder={t("crm.leads.sourcePlaceholder")}
                />
              </label>

              <label className="inventory-modal-field">
                <span className="inventory-modal-label">{t("crm.leads.estimatedValue")}</span>
                <input
                  className="inventory-modal-input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.estimatedValue}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, estimatedValue: event.target.value }))
                  }
                />
              </label>

              <label className="inventory-modal-field">
                <span className="inventory-modal-label">{t("crm.leads.assignedTo")}</span>
                <input
                  className="inventory-modal-input"
                  value={form.assignedTo}
                  onChange={(event) => setForm((current) => ({ ...current, assignedTo: event.target.value }))}
                />
              </label>

              <label className="inventory-modal-field inventory-modal-field-wide">
                <span className="inventory-modal-label">{t("crm.leads.nextFollowUp")}</span>
                <input
                  className="inventory-modal-input"
                  type="datetime-local"
                  value={form.nextFollowUpUtc}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, nextFollowUpUtc: event.target.value }))
                  }
                />
              </label>

              <label className="inventory-modal-field inventory-modal-field-wide">
                <span className="inventory-modal-label">{t("crm.leads.notes")}</span>
                <textarea
                  className="inventory-modal-input crm-textarea"
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  placeholder={t("crm.leads.notesPlaceholder")}
                />
              </label>

              <div className="product-form-actions inventory-modal-actions">
                <button className="primary-btn btn-with-icon" type="submit" disabled={saving}>
                  <AppIcon name={editingLeadId ? "save" : "plus"} />
                  {saving
                    ? t("common.saving")
                    : editingLeadId
                      ? t("crm.leads.updateButton")
                      : t("crm.leads.createButton")}
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
          <h2>{t("crm.leads.title")}</h2>
          <p>{t("crm.leads.subtitle")}</p>
        </div>

        <div className="inventory-modern-controls">
          <label className="inventory-search" aria-label="Search leads">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              placeholder={t("crm.leads.searchPlaceholder")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <input
            className="audit-input"
            placeholder={t("crm.leads.ownerPlaceholder")}
            value={ownerFilter}
            onChange={(event) => setOwnerFilter(event.target.value)}
          />

          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">{t("crm.leads.allStatus")}</option>
            {LEAD_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {getCrmEnumLabel(t, "leadStatus", status)}
              </option>
            ))}
          </select>

          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="name_asc">{t("crm.leads.sortNameAsc")}</option>
            <option value="name_desc">{t("crm.leads.sortNameDesc")}</option>
            <option value="value_desc">{t("crm.leads.sortValueDesc")}</option>
            <option value="value_asc">{t("crm.leads.sortValueAsc")}</option>
            <option value="followup_asc">{t("crm.leads.sortFollowUpAsc")}</option>
            <option value="newest">{t("crm.leads.sortNewest")}</option>
          </select>

          <button className="inventory-add-btn" type="button" onClick={openCreateModal}>
            <AppIcon name="plus" />
            {t("crm.leads.add")}
          </button>
        </div>
      </div>

      <div className="inventory-summary-grid access-summary-grid">
        <div className="page-card inventory-summary-card settings-card">
          <h3>{t("crm.leads.total")}</h3>
          <p className="dashboard-value">{summary.total}</p>
        </div>
        <div className="page-card inventory-summary-card settings-card">
          <h3>{t("crm.leads.open")}</h3>
          <p className="dashboard-value">{summary.open}</p>
        </div>
        <div className="page-card inventory-summary-card settings-card">
          <h3>{t("crm.leads.won")}</h3>
          <p className="dashboard-value">{summary.won}</p>
        </div>
        <div className="page-card inventory-summary-card settings-card">
          <h3>{t("crm.leads.pipelineValue")}</h3>
          <p className="dashboard-value crm-money-value">{formatCurrency(summary.pipelineValue, language)}</p>
        </div>
      </div>

      {message ? <p className="success-text">{message}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}

      <div className="inventory-modern-table">
        <div className="inventory-table-head crm-table-head crm-leads-table">
          <span>{t("crm.leads.leadColumn")}</span>
          <span>{t("crm.leads.status")}</span>
          <span>{t("crm.leads.valueColumn")}</span>
          <span>{t("crm.leads.followUpColumn")}</span>
          <span>{t("crm.leads.ownerColumn")}</span>
          <span>{t("crm.leads.actionsColumn")}</span>
        </div>

        {loading ? <p className="muted-text">{t("crm.leads.loading")}</p> : null}

        {!loading && filteredLeads.length === 0 ? (
          <p className="muted-text">{t("crm.leads.noResults")}</p>
        ) : (
          <div className="inventory-table-body">
            {filteredLeads.map((lead) => (
              <div className="inventory-table-row crm-table-row crm-leads-table" key={lead.id}>
                <div className="crm-primary-cell">
                  <strong>{lead.fullName}</strong>
                  <span className="crm-secondary-line">
                    {lead.companyName || t("crm.leads.noCompany")} · {lead.email || t("crm.leads.noEmail")}
                  </span>
                </div>
                <div>
                  <span className={`crm-status-pill ${getStatusTone(lead.status)}`}>
                    {getCrmEnumLabel(t, "leadStatus", lead.status)}
                  </span>
                </div>
                <div className="inventory-row-text">{formatCurrency(lead.estimatedValue || 0, language)}</div>
                <div className="crm-primary-cell">
                  <span>{lead.nextFollowUpUtc ? formatDateTime(lead.nextFollowUpUtc, language) : t("crm.leads.notScheduled")}</span>
                  <span className="crm-secondary-line">{lead.source || t("crm.leads.noSource")}</span>
                </div>
                <div className="inventory-row-text">{lead.assignedTo || t("crm.leads.unassigned")}</div>
                <div className="crm-table-actions">
                  <button
                    type="button"
                    className="inventory-action-btn inventory-edit-action-btn"
                    onClick={() => openEditModal(lead)}
                    disabled={saving}
                    aria-label={`${t("crm.leads.edit")} ${lead.fullName}`}
                  >
                    <AppIcon name="edit" />
                  </button>
                  <button
                    type="button"
                    className="inventory-action-btn settings-user-delete-btn"
                    onClick={() => handleDelete(lead)}
                    disabled={saving}
                    aria-label={`${t("common.delete")} ${lead.fullName}`}
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

export default CrmLeads;
