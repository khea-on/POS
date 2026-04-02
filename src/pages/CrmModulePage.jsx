import AppIcon from "../components/common/AppIcon";
import { getAuthSession } from "../services/authSession";

function CrmModulePage({ title, description, checklist }) {
  const session = getAuthSession();

  return (
    <div className="crm-workspace">
      <section className="page-card crm-hero-card">
        <div>
          <p className="help-kicker">CRM Module</p>
          <h2>{title}</h2>
          <p className="muted-text">{description}</p>
        </div>
        <div className="crm-role-chip">
          <span className="field-label">CRM Role</span>
          <strong>{session.crmRole || "CrmUser"}</strong>
        </div>
      </section>

      <section className="page-card crm-profile-card">
        <div className="help-section-head">
          <span className="help-icon-badge">
            <AppIcon name="crm" />
          </span>
          <div>
            <h3>Ready For Build-Out</h3>
            <p className="muted-text">
              This screen is active because the module is enabled for {session.username || "this user"}.
            </p>
          </div>
        </div>

        <div className="crm-module-checklist">
          {checklist.map((item) => (
            <div className="crm-module-checklist-item" key={item}>
              <span className="help-tip-dot" />
              <p>{item}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default CrmModulePage;
