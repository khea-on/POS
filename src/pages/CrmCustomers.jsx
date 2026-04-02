import { useCallback, useEffect, useMemo, useState } from "react";
import AppIcon from "../components/common/AppIcon";
import {
  CUSTOMER_STATUS_OPTIONS,
  formatDateTime,
  getCrmEnumLabel,
  getStatusTone,
  toApiDateTime,
  toDateTimeLocalInputValue,
} from "../crm/config";
import useI18n from "../i18n/useI18n";
import gateway from "../services/gateway";

const DEFAULT_CUSTOMER_FORM = {
  fullName: "",
  companyName: "",
  email: "",
  phone: "",
  status: "Active",
  source: "",
  address: "",
  notes: "",
  lastContactedUtc: "",
};

const RECENT_CONTACT_DAYS = 30;

const cleanOptionalText = (value) => {
  const trimmed = String(value || "").trim();
  return trimmed ? trimmed : null;
};

function CrmCustomers() {
  const { language, t } = useI18n();
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sort, setSort] = useState("name_asc");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState(null);
  const [form, setForm] = useState(DEFAULT_CUSTOMER_FORM);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await gateway.crm.customers.getAll();
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      const apiError = err.response?.data;
      setError(typeof apiError === "string" && apiError.trim() ? apiError : t("crm.customers.failedToLoad"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const filteredCustomers = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = customers.filter((customer) => {
      const searchable = [
        customer.fullName,
        customer.companyName,
        customer.email,
        customer.phone,
        customer.source,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (term && !searchable.includes(term)) {
        return false;
      }

      if (statusFilter !== "all" && customer.status !== statusFilter) {
        return false;
      }

      return true;
    });

    filtered.sort((left, right) => {
      const leftName = String(left.fullName || "");
      const rightName = String(right.fullName || "");
      const leftCompany = String(left.companyName || "");
      const rightCompany = String(right.companyName || "");
      const leftLastContact = new Date(left.lastContactedUtc || left.createdAtUtc || 0).getTime();
      const rightLastContact = new Date(right.lastContactedUtc || right.createdAtUtc || 0).getTime();
      const leftCreated = new Date(left.createdAtUtc || 0).getTime();
      const rightCreated = new Date(right.createdAtUtc || 0).getTime();

      if (sort === "name_desc") {
        return rightName.localeCompare(leftName);
      }
      if (sort === "company_asc") {
        return leftCompany.localeCompare(rightCompany) || leftName.localeCompare(rightName);
      }
      if (sort === "company_desc") {
        return rightCompany.localeCompare(leftCompany) || leftName.localeCompare(rightName);
      }
      if (sort === "recent_contact") {
        return rightLastContact - leftLastContact;
      }
      if (sort === "newest") {
        return rightCreated - leftCreated;
      }
      return leftName.localeCompare(rightName);
    });

    return filtered;
  }, [customers, search, statusFilter, sort]);

  const summary = useMemo(() => {
    const now = Date.now();
    const recentThreshold = RECENT_CONTACT_DAYS * 24 * 60 * 60 * 1000;

    return {
      total: customers.length,
      active: customers.filter((customer) => customer.status === "Active").length,
      vip: customers.filter((customer) => customer.status === "VIP").length,
      contactedRecently: customers.filter((customer) => {
        if (!customer.lastContactedUtc) {
          return false;
        }

        const contactedAt = new Date(customer.lastContactedUtc).getTime();
        return Number.isFinite(contactedAt) && now - contactedAt <= recentThreshold;
      }).length,
    };
  }, [customers]);

  const resetForm = useCallback(() => {
    setForm(DEFAULT_CUSTOMER_FORM);
    setEditingCustomerId(null);
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

  const openEditModal = (customer) => {
    setMessage("");
    setError("");
    setEditingCustomerId(customer.id);
    setForm({
      fullName: customer.fullName || "",
      companyName: customer.companyName || "",
      email: customer.email || "",
      phone: customer.phone || "",
      status: customer.status || "Active",
      source: customer.source || "",
      address: customer.address || "",
      notes: customer.notes || "",
      lastContactedUtc: toDateTimeLocalInputValue(customer.lastContactedUtc),
    });
    setShowModal(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    const payload = {
      fullName: form.fullName.trim(),
      companyName: cleanOptionalText(form.companyName),
      email: cleanOptionalText(form.email),
      phone: cleanOptionalText(form.phone),
      status: form.status,
      source: cleanOptionalText(form.source),
      address: cleanOptionalText(form.address),
      notes: cleanOptionalText(form.notes),
      lastContactedUtc: toApiDateTime(form.lastContactedUtc),
    };

    try {
      if (editingCustomerId) {
        await gateway.crm.customers.update(editingCustomerId, payload);
        setMessage(t("crm.customers.updateSuccess"));
      } else {
        await gateway.crm.customers.create(payload);
        setMessage(t("crm.customers.createSuccess"));
      }

      setShowModal(false);
      resetForm();
      await loadCustomers();
    } catch (err) {
      const apiError = err.response?.data;
      setError(typeof apiError === "string" && apiError.trim() ? apiError : t("crm.customers.failedToSave"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (customer) => {
    if (!window.confirm(t("crm.customers.confirmDelete", { name: customer.fullName }))) {
      return;
    }

    setError("");
    setMessage("");
    setSaving(true);

    try {
      await gateway.crm.customers.remove(customer.id);
      setMessage(t("crm.customers.deleteSuccess"));
      if (editingCustomerId === customer.id) {
        setShowModal(false);
        resetForm();
      }
      await loadCustomers();
    } catch (err) {
      const apiError = err.response?.data;
      setError(typeof apiError === "string" && apiError.trim() ? apiError : t("crm.customers.failedToDelete"));
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
            aria-labelledby="crm-customer-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="inventory-modal-header">
              <div>
                <h3 id="crm-customer-modal-title">
                  {editingCustomerId ? t("crm.customers.edit") : t("crm.customers.add")}
                </h3>
                <p className="muted-text">{t("crm.customers.modalSubtitle")}</p>
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
                <span className="inventory-modal-label">{t("crm.customers.fullName")}</span>
                <input
                  className="inventory-modal-input"
                  value={form.fullName}
                  onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
                  autoFocus
                  required
                />
              </label>

              <label className="inventory-modal-field">
                <span className="inventory-modal-label">{t("crm.customers.company")}</span>
                <input
                  className="inventory-modal-input"
                  value={form.companyName}
                  onChange={(event) => setForm((current) => ({ ...current, companyName: event.target.value }))}
                />
              </label>

              <label className="inventory-modal-field">
                <span className="inventory-modal-label">{t("crm.customers.email")}</span>
                <input
                  className="inventory-modal-input"
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                />
              </label>

              <label className="inventory-modal-field">
                <span className="inventory-modal-label">{t("crm.customers.phone")}</span>
                <input
                  className="inventory-modal-input"
                  value={form.phone}
                  onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                />
              </label>

              <label className="inventory-modal-field">
                <span className="inventory-modal-label">{t("crm.customers.status")}</span>
                <select
                  className="inventory-modal-input"
                  value={form.status}
                  onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                >
                  {CUSTOMER_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {getCrmEnumLabel(t, "customerStatus", status)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="inventory-modal-field">
                <span className="inventory-modal-label">{t("crm.customers.source")}</span>
                <input
                  className="inventory-modal-input"
                  value={form.source}
                  onChange={(event) => setForm((current) => ({ ...current, source: event.target.value }))}
                  placeholder={t("crm.customers.sourcePlaceholder")}
                />
              </label>

              <label className="inventory-modal-field inventory-modal-field-wide">
                <span className="inventory-modal-label">{t("crm.customers.address")}</span>
                <input
                  className="inventory-modal-input"
                  value={form.address}
                  onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
                />
              </label>

              <label className="inventory-modal-field inventory-modal-field-wide">
                <span className="inventory-modal-label">{t("crm.customers.lastContacted")}</span>
                <input
                  className="inventory-modal-input"
                  type="datetime-local"
                  value={form.lastContactedUtc}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, lastContactedUtc: event.target.value }))
                  }
                />
              </label>

              <label className="inventory-modal-field inventory-modal-field-wide">
                <span className="inventory-modal-label">{t("crm.customers.notes")}</span>
                <textarea
                  className="inventory-modal-input crm-textarea"
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  placeholder={t("crm.customers.notesPlaceholder")}
                />
              </label>

              <div className="product-form-actions inventory-modal-actions">
                <button className="primary-btn btn-with-icon" type="submit" disabled={saving}>
                  <AppIcon name={editingCustomerId ? "save" : "plus"} />
                  {saving
                    ? t("common.saving")
                    : editingCustomerId
                      ? t("crm.customers.updateButton")
                      : t("crm.customers.createButton")}
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
          <h2>{t("crm.customers.title")}</h2>
          <p>{t("crm.customers.subtitle")}</p>
        </div>

        <div className="inventory-modern-controls">
          <label className="inventory-search" aria-label="Search customers">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              placeholder={t("crm.customers.searchPlaceholder")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">{t("crm.customers.allStatus")}</option>
            {CUSTOMER_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {getCrmEnumLabel(t, "customerStatus", status)}
              </option>
            ))}
          </select>

          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="name_asc">{t("crm.customers.sortNameAsc")}</option>
            <option value="name_desc">{t("crm.customers.sortNameDesc")}</option>
            <option value="company_asc">{t("crm.customers.sortCompanyAsc")}</option>
            <option value="company_desc">{t("crm.customers.sortCompanyDesc")}</option>
            <option value="recent_contact">{t("crm.customers.sortRecentContact")}</option>
            <option value="newest">{t("crm.customers.sortNewest")}</option>
          </select>

          <button className="inventory-add-btn" type="button" onClick={openCreateModal}>
            <AppIcon name="plus" />
            {t("crm.customers.add")}
          </button>
        </div>
      </div>

      <div className="inventory-summary-grid access-summary-grid">
        <div className="page-card inventory-summary-card settings-card">
          <h3>{t("crm.customers.total")}</h3>
          <p className="dashboard-value">{summary.total}</p>
        </div>
        <div className="page-card inventory-summary-card settings-card">
          <h3>{t("crm.customers.active")}</h3>
          <p className="dashboard-value">{summary.active}</p>
        </div>
        <div className="page-card inventory-summary-card settings-card">
          <h3>{t("crm.customers.vip")}</h3>
          <p className="dashboard-value">{summary.vip}</p>
        </div>
        <div className="page-card inventory-summary-card settings-card">
          <h3>{t("crm.customers.contacted30d")}</h3>
          <p className="dashboard-value">{summary.contactedRecently}</p>
        </div>
      </div>

      {message ? <p className="success-text">{message}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}

      <div className="inventory-modern-table">
        <div className="inventory-table-head crm-table-head crm-customers-table">
          <span>{t("crm.customers.customerColumn")}</span>
          <span>{t("crm.customers.companyColumn")}</span>
          <span>{t("crm.customers.statusColumn")}</span>
          <span>{t("crm.customers.lastContactColumn")}</span>
          <span>{t("crm.customers.actionsColumn")}</span>
        </div>

        {loading ? <p className="muted-text">{t("crm.customers.loading")}</p> : null}

        {!loading && filteredCustomers.length === 0 ? (
          <p className="muted-text">{t("crm.customers.noResults")}</p>
        ) : (
          <div className="inventory-table-body">
            {filteredCustomers.map((customer) => (
              <div className="inventory-table-row crm-table-row crm-customers-table" key={customer.id}>
                <div className="crm-primary-cell">
                  <strong>{customer.fullName}</strong>
                  <span className="crm-secondary-line">
                    {customer.email || t("crm.noEmail")} · {customer.phone || t("crm.customers.noPhone")}
                  </span>
                </div>
                <div className="crm-primary-cell">
                  <span>{customer.companyName || t("crm.customers.noCompanyShort")}</span>
                  <span className="crm-secondary-line">{customer.source || t("crm.customers.noSource")}</span>
                </div>
                <div>
                  <span className={`crm-status-pill ${getStatusTone(customer.status)}`}>
                    {getCrmEnumLabel(t, "customerStatus", customer.status)}
                  </span>
                </div>
                <div className="inventory-row-text">
                  {customer.lastContactedUtc
                    ? formatDateTime(customer.lastContactedUtc, language)
                    : t("crm.customers.notContacted")}
                </div>
                <div className="crm-table-actions">
                  <button
                    type="button"
                    className="inventory-action-btn inventory-edit-action-btn"
                    onClick={() => openEditModal(customer)}
                    disabled={saving}
                    aria-label={`${t("crm.customers.edit")} ${customer.fullName}`}
                  >
                    <AppIcon name="edit" />
                  </button>
                  <button
                    type="button"
                    className="inventory-action-btn settings-user-delete-btn"
                    onClick={() => handleDelete(customer)}
                    disabled={saving}
                    aria-label={`${t("common.delete")} ${customer.fullName}`}
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

export default CrmCustomers;
