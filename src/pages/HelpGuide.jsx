import AppIcon from "../components/common/AppIcon";
import useI18n from "../i18n/useI18n";

function HelpGuide() {
  const { t } = useI18n();
  const currentRole = (localStorage.getItem("role") || "").toLowerCase() === "admin"
    ? "Admin"
    : "Cashier";
  const currentRoleLabel = currentRole === "Admin"
    ? t("settings.roleAdmin")
    : t("settings.roleCashier");

  const quickStartSteps = [
    {
      title: t("help.step1Title"),
      body: t("help.step1Body"),
    },
    {
      title: t("help.step2Title"),
      body: t("help.step2Body"),
    },
    {
      title: t("help.step3Title"),
      body: t("help.step3Body"),
    },
    {
      title: t("help.step4Title"),
      body: t("help.step4Body"),
    },
  ];

  const cashierFeatures = [
    {
      icon: "items-screen",
      title: t("help.cashierPosTitle"),
      body: t("help.cashierPosBody"),
    },
    {
      icon: "invoice-screen",
      title: t("help.cashierInvoiceTitle"),
      body: t("help.cashierInvoiceBody"),
    },
    {
      icon: "dashboard",
      title: t("help.cashierDashboardTitle"),
      body: t("help.cashierDashboardBody"),
    },
    {
      icon: "settings",
      title: t("help.cashierSettingsTitle"),
      body: t("help.cashierSettingsBody"),
    },
  ];

  const adminFeatures = [
    {
      icon: "stock",
      title: t("help.adminInventoryTitle"),
      body: t("help.adminInventoryBody"),
    },
    {
      icon: "reports",
      title: t("help.adminReportsTitle"),
      body: t("help.adminReportsBody"),
    },
    {
      icon: "audit",
      title: t("help.adminAuditTitle"),
      body: t("help.adminAuditBody"),
    },
    {
      icon: "settings",
      title: t("help.adminSettingsTitle"),
      body: t("help.adminSettingsBody"),
    },
  ];

  const tips = [
    t("help.tip1"),
    t("help.tip2"),
    t("help.tip3"),
    t("help.tip4"),
    t("help.tip5"),
  ];

  return (
    <div className="help-page">
      <section className="page-card help-hero">
        <div className="help-hero-copy">
          <p className="help-kicker">{t("nav.help")}</p>
          <h2>{t("help.title")}</h2>
          <p className="muted-text">{t("help.subtitle")}</p>
        </div>

        <div className="help-role-card">
          <span className="field-label">{t("help.currentRole")}</span>
          <strong>{currentRoleLabel}</strong>
          <span className="muted-text">{t("help.roleHint")}</span>
        </div>
      </section>

      <section className="help-grid">
        <article className="page-card help-card help-card-wide">
          <div className="help-section-head">
            <div className="help-icon-badge" aria-hidden="true">
              <AppIcon name="help" />
            </div>
            <div>
              <h3>{t("help.quickStartTitle")}</h3>
              <p className="muted-text">{t("help.quickStartIntro")}</p>
            </div>
          </div>

          <div className="help-step-list">
            {quickStartSteps.map((step, index) => (
              <div className="help-step" key={step.title}>
                <span className="help-step-number">{index + 1}</span>
                <div>
                  <h4>{step.title}</h4>
                  <p>{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="page-card help-card">
          <div className="help-section-head help-section-head-split">
            <div className="help-section-title">
              <div className="help-icon-badge" aria-hidden="true">
                <AppIcon name="checkout" />
              </div>
              <div>
                <h3>{t("help.cashierTitle")}</h3>
                <p className="muted-text">{t("help.cashierIntro")}</p>
              </div>
            </div>
            <span className="help-audience-badge">{t("help.allUsers")}</span>
          </div>

          <div className="help-feature-list">
            {cashierFeatures.map((feature) => (
              <div className="help-feature" key={feature.title}>
                <div className="help-feature-head">
                  <AppIcon name={feature.icon} />
                  <h4>{feature.title}</h4>
                </div>
                <p>{feature.body}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="page-card help-card">
          <div className="help-section-head help-section-head-split">
            <div className="help-section-title">
              <div className="help-icon-badge" aria-hidden="true">
                <AppIcon name="settings" />
              </div>
              <div>
                <h3>{t("help.adminTitle")}</h3>
                <p className="muted-text">{t("help.adminIntro")}</p>
              </div>
            </div>
            <span className="help-audience-badge help-audience-badge-admin">{t("help.adminOnly")}</span>
          </div>

          <div className="help-feature-list">
            {adminFeatures.map((feature) => (
              <div className="help-feature" key={feature.title}>
                <div className="help-feature-head">
                  <AppIcon name={feature.icon} />
                  <h4>{feature.title}</h4>
                </div>
                <p>{feature.body}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="page-card help-card help-card-wide">
          <div className="help-section-head">
            <div className="help-icon-badge" aria-hidden="true">
              <AppIcon name="key" />
            </div>
            <div>
              <h3>{t("help.tipsTitle")}</h3>
              <p className="muted-text">{t("help.tipsIntro")}</p>
            </div>
          </div>

          <div className="help-tip-list">
            {tips.map((tip) => (
              <div className="help-tip" key={tip}>
                <span className="help-tip-dot" aria-hidden="true" />
                <p>{tip}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}

export default HelpGuide;
