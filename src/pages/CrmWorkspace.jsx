import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppIcon from "../components/common/AppIcon";
import useI18n from "../i18n/useI18n";
import gateway from "../services/gateway";
import { CRM_APP, getAuthSession, hasModuleAccess } from "../services/authSession";
import { formatCurrency, formatDateTime, getCrmEnumLabel, getStatusTone } from "../crm/config";

function CrmWorkspace() {
  const { language, t } = useI18n();
  const session = getAuthSession();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const quickLinks = [
    {
      key: "crm-customers",
      to: "/crm/customers",
      title: t("nav.crmCustomers"),
      description: t("crm.customers.subtitle"),
      icon: "user",
    },
    {
      key: "crm-leads",
      to: "/crm/leads",
      title: t("nav.crmLeads"),
      description: t("crm.leads.subtitle"),
      icon: "reports",
    },
    {
      key: "crm-activities",
      to: "/crm/activities",
      title: t("nav.crmActivities"),
      description: t("crm.activities.subtitle"),
      icon: "help",
    },
  ];

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await gateway.crm.getSummary();
      setSummary(data || null);
    } catch (err) {
      const apiError = err.response?.data;
      setError(typeof apiError === "string" && apiError.trim() ? apiError : t("crm.failedToLoadDashboard"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const visibleQuickLinks = quickLinks.filter((item) => hasModuleAccess(CRM_APP, item.key, session));
  const crmRoleLabel = String(session.crmRole || "").toLowerCase() === "crmadmin"
    ? t("crm.roles.crmAdmin")
    : t("crm.roles.crmUser");

  return (
    <div className="crm-workspace">
      <section className="page-card crm-hero-card">
        <div>
          <p className="help-kicker">{t("crm.dashboardKicker")}</p>
          <h2>{t("crm.workspaceTitle")}</h2>
          <p className="muted-text">{t("crm.workspaceSubtitle")}</p>
        </div>
        <div className="crm-role-chip">
          <span className="field-label">{t("crm.roleLabel")}</span>
          <strong>{crmRoleLabel}</strong>
        </div>
      </section>

      {error ? (
        <section className="page-card">
          <p className="form-error">{error}</p>
        </section>
      ) : null}

      <section className="settings-grid crm-dashboard-grid">
        <div className="page-card settings-card">
          <h3>{t("crm.totalCustomers")}</h3>
          <p className="dashboard-value">{summary?.totalCustomers ?? "-"}</p>
        </div>
        <div className="page-card settings-card">
          <h3>{t("crm.activeCustomers")}</h3>
          <p className="dashboard-value">{summary?.activeCustomers ?? "-"}</p>
        </div>
        <div className="page-card settings-card">
          <h3>{t("crm.openLeads")}</h3>
          <p className="dashboard-value">{summary?.openLeads ?? "-"}</p>
        </div>
        <div className="page-card settings-card">
          <h3>{t("crm.pendingActivities")}</h3>
          <p className="dashboard-value">{summary?.pendingActivities ?? "-"}</p>
        </div>
        <div className="page-card settings-card">
          <h3>{t("crm.wonLeads")}</h3>
          <p className="dashboard-value">{summary?.wonLeads ?? "-"}</p>
        </div>
        <div className="page-card settings-card">
          <h3>{t("crm.overdueActivities")}</h3>
          <p className="dashboard-value">{summary?.overdueActivities ?? "-"}</p>
        </div>
      </section>

      <section className="crm-link-grid">
        {visibleQuickLinks.map((item) => (
          <Link className="page-card crm-link-card" key={item.key} to={item.to}>
            <div className="crm-module-head">
              <AppIcon name={item.icon} />
              <h3>{item.title}</h3>
            </div>
            <p>{item.description}</p>
          </Link>
        ))}
      </section>

      {loading ? <section className="page-card"><p className="muted-text">{t("crm.loadingDashboard")}</p></section> : null}

      {!loading && summary ? (
        <div className="crm-dashboard-sections">
          <section className="page-card crm-section-card">
            <div className="crm-section-head">
              <h3>{t("crm.recentCustomers")}</h3>
              <Link to="/crm/customers">{t("crm.openCustomers")}</Link>
            </div>
            {summary.recentCustomers?.length > 0 ? (
              <div className="crm-list">
                {summary.recentCustomers.map((customer) => (
                  <div className="crm-list-item" key={customer.id}>
                    <div>
                      <strong>{customer.fullName}</strong>
                      <p>{customer.companyName || t("crm.noCompany")} · {customer.email || t("crm.noEmail")}</p>
                    </div>
                    <span className={`crm-status-pill ${getStatusTone(customer.status)}`}>
                      {getCrmEnumLabel(t, "customerStatus", customer.status)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted-text">{t("crm.noCustomerRecords")}</p>
            )}
          </section>

          <section className="page-card crm-section-card">
            <div className="crm-section-head">
              <h3>{t("crm.topLeads")}</h3>
              <Link to="/crm/leads">{t("crm.openLeadsLink")}</Link>
            </div>
            {summary.topLeads?.length > 0 ? (
              <div className="crm-list">
                {summary.topLeads.map((lead) => (
                  <div className="crm-list-item" key={lead.id}>
                    <div>
                      <strong>{lead.fullName}</strong>
                      <p>{lead.companyName || t("crm.noCompany")} · {lead.assignedTo || t("crm.unassigned")}</p>
                    </div>
                    <div className="crm-list-meta">
                      <span className={`crm-status-pill ${getStatusTone(lead.status)}`}>
                        {getCrmEnumLabel(t, "leadStatus", lead.status)}
                      </span>
                      <strong>{formatCurrency(lead.estimatedValue, language)}</strong>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted-text">{t("crm.noLeadsPipeline")}</p>
            )}
          </section>

          <section className="page-card crm-section-card">
            <div className="crm-section-head">
              <h3>{t("crm.upcomingActivities")}</h3>
              <Link to="/crm/activities">{t("crm.openActivities")}</Link>
            </div>
            {summary.upcomingActivities?.length > 0 ? (
              <div className="crm-list">
                {summary.upcomingActivities.map((activity) => (
                  <div className="crm-list-item" key={activity.id}>
                    <div>
                      <strong>{activity.title}</strong>
                      <p>
                        {activity.customerName || activity.leadName || t("crm.generalTask")} · {formatDateTime(activity.dueAtUtc, language)}
                      </p>
                    </div>
                    <span className={`crm-status-pill ${getStatusTone(activity.status)}`}>
                      {getCrmEnumLabel(t, "activityStatus", activity.status)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted-text">{t("crm.noUpcomingActivities")}</p>
            )}
          </section>

          <section className="page-card crm-section-card">
            <div className="crm-section-head">
              <h3>{t("crm.leadPipeline")}</h3>
              <span className="muted-text">{t("crm.currentStageDistribution")}</span>
            </div>
            {summary.leadPipeline?.length > 0 ? (
              <div className="crm-list">
                {summary.leadPipeline.map((item) => (
                  <div className="crm-list-item" key={item.status}>
                    <strong>{getCrmEnumLabel(t, "leadStatus", item.status)}</strong>
                    <span className="crm-count-badge">{item.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted-text">{t("crm.noPipelineData")}</p>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}

export default CrmWorkspace;
