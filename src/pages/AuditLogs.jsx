import { useCallback, useEffect, useMemo, useState } from "react";
import gateway from "../services/gateway";
import useI18n from "../i18n/useI18n";

const AUDIT_LOG_TIME_ZONE = "Asia/Phnom_Penh";
const AUDIT_LOG_TIME_ZONE_OFFSET_HOURS = 7;
const AUDIT_LOG_LOCALES = {
  en: "en-US",
  km: "km-KH-u-nu-khmr",
};

function toAuditLogUtcIsoOrEmpty(dateTimeValue) {
  if (!dateTimeValue) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(dateTimeValue);
  if (!match) return "";

  const [, year, month, day, hour, minute, second = "0"] = match;
  const utcDate = new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour) - AUDIT_LOG_TIME_ZONE_OFFSET_HOURS,
      Number(minute),
      Number(second)
    )
  );

  return utcDate.toISOString();
}

function tryPrettyJson(text) {
  if (!text) return "";
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return String(text);
  }
}

function parseAuditTimestamp(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const raw = String(value).trim();
  if (!raw) return null;

  const normalized = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(raw)
    ? `${raw}Z`
    : raw;

  const dt = new Date(normalized);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function formatAuditTimestamp(value, formatter) {
  if (!value) return "";
  const dt = parseAuditTimestamp(value);
  if (!dt) return String(value);
  return formatter.format(dt);
}

function AuditLogs() {
  const { language, t } = useI18n();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);
  const pageSize = 50;
  const [totalCount, setTotalCount] = useState(0);

  const [fromLocal, setFromLocal] = useState("");
  const [toLocal, setToLocal] = useState("");
  const [username, setUsername] = useState("");
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [entityId, setEntityId] = useState("");

  const totalPages = useMemo(() => {
    const pages = Math.ceil((totalCount || 0) / pageSize);
    return pages > 0 ? pages : 1;
  }, [pageSize, totalCount]);

  const auditDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(AUDIT_LOG_LOCALES[language] || AUDIT_LOG_LOCALES.en, {
        timeZone: AUDIT_LOG_TIME_ZONE,
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }),
    [language]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        page,
        pageSize,
        fromUtc: toAuditLogUtcIsoOrEmpty(fromLocal),
        toUtc: toAuditLogUtcIsoOrEmpty(toLocal),
        username: username.trim() || undefined,
        action: action || undefined,
        entityType: entityType.trim() || undefined,
        entityId: entityId.trim() || undefined,
      };
      const data = await gateway.auditLogs.getAll(params);
      setItems(data?.items || []);
      setTotalCount(Number(data?.totalCount || 0));
    } catch (err) {
      const apiError = err.response?.data;
      if (typeof apiError === "string" && apiError.trim()) {
        setError(apiError);
      } else {
        setError(t("auditLogs.failedToLoad"));
      }
    } finally {
      setLoading(false);
    }
  }, [action, entityId, entityType, fromLocal, page, pageSize, t, toLocal, username]);

  useEffect(() => {
    load();
  }, [load]);

  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className="page-card">
      <div className="page-header-row">
        <h2>{t("auditLogs.title")}</h2>
        <div className="audit-pager">
          <button className="audit-btn" type="button" disabled={!canPrev || loading} onClick={() => setPage((p) => p - 1)}>
            {t("auditLogs.prev")}
          </button>
          <span className="muted-text">
            {t("auditLogs.page")} {page} / {totalPages} ({totalCount})
          </span>
          <button className="audit-btn" type="button" disabled={!canNext || loading} onClick={() => setPage((p) => p + 1)}>
            {t("auditLogs.next")}
          </button>
        </div>
      </div>

      <p className="muted-text">{t("auditLogs.timeZoneHint")}</p>

      <div className="audit-filters">
        <label className="audit-field">
          <span className="field-label">{t("auditLogs.from")}</span>
          <input className="audit-input" type="datetime-local" value={fromLocal} onChange={(e) => setFromLocal(e.target.value)} />
        </label>
        <label className="audit-field">
          <span className="field-label">{t("auditLogs.to")}</span>
          <input className="audit-input" type="datetime-local" value={toLocal} onChange={(e) => setToLocal(e.target.value)} />
        </label>
        <label className="audit-field">
          <span className="field-label">{t("auditLogs.username")}</span>
          <input className="audit-input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin" />
        </label>
        <label className="audit-field">
          <span className="field-label">{t("auditLogs.action")}</span>
          <select className="audit-input audit-select" value={action} onChange={(e) => setAction(e.target.value)}>
            <option value="">{t("common.all")}</option>
            <option value="Create">Create</option>
            <option value="Update">Update</option>
            <option value="Delete">Delete</option>
            <option value="Login">Login</option>
          </select>
        </label>
        <label className="audit-field">
          <span className="field-label">{t("auditLogs.entityType")}</span>
          <input className="audit-input" value={entityType} onChange={(e) => setEntityType(e.target.value)} placeholder="Product" />
        </label>
        <label className="audit-field">
          <span className="field-label">{t("auditLogs.entityId")}</span>
          <input className="audit-input" value={entityId} onChange={(e) => setEntityId(e.target.value)} placeholder="123" />
        </label>

        <div className="audit-filter-actions">
          <button className="primary-btn" type="button" disabled={loading} onClick={() => { setPage(1); load(); }}>
            {loading ? t("common.loading") : t("auditLogs.search")}
          </button>
          <button
            className="audit-btn"
            type="button"
            disabled={loading}
            onClick={() => {
              setFromLocal("");
              setToLocal("");
              setUsername("");
              setAction("");
              setEntityType("");
              setEntityId("");
              setPage(1);
            }}
          >
            {t("auditLogs.clear")}
          </button>
        </div>
      </div>

      {error ? <p className="form-error">{error}</p> : null}
      {loading ? <p className="muted-text">{t("auditLogs.loading")}</p> : null}

      <div className="audit-list">
        {items.length === 0 && !loading ? <p>{t("auditLogs.noResults")}</p> : null}
        {items.map((log) => (
          <details key={log.id} className="audit-entry">
            <summary className="audit-summary">
              <span className="audit-time">{formatAuditTimestamp(log.occurredAtUtc, auditDateFormatter)}</span>
              <span className="audit-pill">{log.action}</span>
              <span className="audit-main">
                <span className="audit-user">{log.username || "system"}</span>
                <span className="audit-entity">
                  {log.entityType}
                  {log.entityId ? `#${log.entityId}` : ""}
                </span>
              </span>
              <span className="audit-route muted-text">{log.method} {log.path}</span>
            </summary>
            <pre className="audit-json">{tryPrettyJson(log.changesJson)}</pre>
          </details>
        ))}
      </div>
    </div>
  );
}

export default AuditLogs;
