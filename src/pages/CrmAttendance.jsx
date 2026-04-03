import { useEffect, useRef, useState } from "react";
import AppIcon from "../components/common/AppIcon";
import useBarcodeScanner from "../hooks/useBarcodeScanner";
import useI18n from "../i18n/useI18n";
import gateway from "../services/gateway";

const getDefaultDeviceCode = () => {
  if (typeof navigator === "undefined") {
    return "WEB-KIOSK-01";
  }

  return /android|iphone|ipad|ipod/i.test(navigator.userAgent)
    ? "MOBILE-SCAN-01"
    : "WEB-KIOSK-01";
};

const createInitialForm = () => ({
  staffCode: "",
  branchCode: "PP01",
  deviceCode: getDefaultDeviceCode(),
  scanType: "CHECKIN",
});

const getLocale = (language) => language === "km" ? "km-KH" : "en-US";

const formatDateTime = (value, language) => {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleString(getLocale(language));
};

const formatTime = (value, language) => {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleTimeString(getLocale(language));
};

const getApiErrorMessage = (error, fallback) => {
  const responseData = error?.response?.data;
  if (typeof responseData === "string" && responseData.trim()) {
    return responseData;
  }

  if (typeof responseData?.message === "string" && responseData.message.trim()) {
    return responseData.message;
  }

  return error instanceof Error ? error.message : fallback;
};

function AttendanceResultCard({ result, language, t }) {
  if (!result) {
    return (
      <section className="crm-attendance-card crm-attendance-result-card crm-attendance-placeholder-card">
        <div className="crm-attendance-card-head">
          <span className="crm-attendance-icon-badge">
            <AppIcon name="clock" />
          </span>
          <div>
            <h3>{t("crm.attendance.waitingTitle")}</h3>
            <p>{t("crm.attendance.waitingBody")}</p>
          </div>
        </div>
      </section>
    );
  }

  const toneClass = result.success ? "crm-attendance-result-success" : "crm-attendance-result-error";

  return (
    <section className={`crm-attendance-card crm-attendance-result-card ${toneClass}`.trim()}>
      <div className="crm-attendance-card-head">
        <span className="crm-attendance-pill">
          {result.success ? t("crm.attendance.resultSuccess") : t("crm.attendance.resultAttention")}
        </span>
        <h3>{result.message}</h3>
      </div>

      {result.data ? (
        <dl className="crm-attendance-detail-grid">
          <div>
            <dt>{t("crm.attendance.resultStaff")}</dt>
            <dd>{result.data.staffName}</dd>
          </div>
          <div>
            <dt>{t("crm.attendance.resultCode")}</dt>
            <dd>{result.data.staffCode}</dd>
          </div>
          <div>
            <dt>{t("crm.attendance.resultScanType")}</dt>
            <dd>{result.data.scanType}</dd>
          </div>
          <div>
            <dt>{t("crm.attendance.resultStatus")}</dt>
            <dd>{result.data.status}</dd>
          </div>
          <div>
            <dt>{t("crm.attendance.resultScanTime")}</dt>
            <dd>{formatDateTime(result.data.scanTime, language)}</dd>
          </div>
          <div>
            <dt>{t("crm.attendance.resultBranchDevice")}</dt>
            <dd>{result.data.branchCode} / {result.data.deviceCode}</dd>
          </div>
        </dl>
      ) : null}
    </section>
  );
}

function AttendanceStaffLookupCard({ error, staff, t }) {
  return (
    <section className="crm-attendance-card crm-attendance-lookup-card">
      <div className="crm-attendance-card-head">
        <span className="crm-attendance-kicker">{t("crm.attendance.lookupKicker")}</span>
        <h3>{t("crm.attendance.lookupTitle")}</h3>
      </div>

      {error ? <p className="crm-attendance-inline-error">{error}</p> : null}

      {!staff && !error ? (
        <div className="crm-attendance-empty-state">
          <p>{t("crm.attendance.lookupEmpty")}</p>
        </div>
      ) : null}

      {staff ? (
        <div className="crm-attendance-detail-grid">
          <div>
            <dt>{t("crm.attendance.lookupFullName")}</dt>
            <dd>{staff.fullName}</dd>
          </div>
          <div>
            <dt>{t("crm.attendance.resultCode")}</dt>
            <dd>{staff.staffCode}</dd>
          </div>
          <div>
            <dt>{t("crm.attendance.lookupDepartment")}</dt>
            <dd>{staff.department}</dd>
          </div>
          <div>
            <dt>{t("crm.attendance.lookupBranch")}</dt>
            <dd>{staff.branchCode}</dd>
          </div>
          <div>
            <dt>{t("crm.attendance.lookupShift")}</dt>
            <dd>{staff.shiftWindow}</dd>
          </div>
          <div>
            <dt>{t("crm.attendance.resultStatus")}</dt>
            <dd>{staff.isActive ? t("common.active") : t("common.inactive")}</dd>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function AttendanceTodayTable({ language, records, t }) {
  return (
    <section className="crm-attendance-card crm-attendance-table-card">
      <div className="crm-attendance-table-head">
        <div>
          <span className="crm-attendance-kicker">{t("crm.attendance.realtimeKicker")}</span>
          <h3>{t("crm.attendance.tableTitle")}</h3>
        </div>
        <span className="crm-attendance-pill">
          {records.length} {t("crm.attendance.recordsCount")}
        </span>
      </div>

      {records.length === 0 ? (
        <div className="crm-attendance-empty-state">
          <p>{t("crm.attendance.emptyRecords")}</p>
        </div>
      ) : (
        <>
          <div className="crm-attendance-table-wrap">
            <table className="crm-attendance-table">
              <thead>
                <tr>
                  <th>{t("crm.attendance.tableStaff")}</th>
                  <th>{t("crm.attendance.tableType")}</th>
                  <th>{t("crm.attendance.tableStatus")}</th>
                  <th>{t("crm.attendance.tableBranch")}</th>
                  <th>{t("crm.attendance.tableDevice")}</th>
                  <th>{t("crm.attendance.tableTime")}</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id}>
                    <td>
                      <strong>{record.staffName}</strong>
                      <span>{record.staffCode}</span>
                    </td>
                    <td>{record.scanType}</td>
                    <td>
                      <span className={`crm-attendance-status-pill ${record.statusTone || "positive"}`.trim()}>
                        {record.status}
                      </span>
                    </td>
                    <td>{record.branchCode}</td>
                    <td>{record.deviceCode}</td>
                    <td>{formatTime(record.scanTime, language)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="crm-attendance-mobile-list">
            {records.map((record) => (
              <article className="crm-attendance-mobile-record" key={`mobile-${record.id}`}>
                <div className="crm-attendance-mobile-record-head">
                  <div>
                    <strong>{record.staffName}</strong>
                    <span>{record.staffCode}</span>
                  </div>
                  <span className={`crm-attendance-status-pill ${record.statusTone || "positive"}`.trim()}>
                    {record.status}
                  </span>
                </div>
                <dl className="crm-attendance-mobile-record-grid">
                  <div>
                    <dt>{t("crm.attendance.tableType")}</dt>
                    <dd>{record.scanType}</dd>
                  </div>
                  <div>
                    <dt>{t("crm.attendance.tableTime")}</dt>
                    <dd>{formatTime(record.scanTime, language)}</dd>
                  </div>
                  <div>
                    <dt>{t("crm.attendance.tableBranch")}</dt>
                    <dd>{record.branchCode}</dd>
                  </div>
                  <div>
                    <dt>{t("crm.attendance.tableDevice")}</dt>
                    <dd>{record.deviceCode}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function CrmAttendance() {
  const { language, t } = useI18n();
  const barcodeUploadInputRef = useRef(null);
  const [form, setForm] = useState(createInitialForm);
  const [submitMode, setSubmitMode] = useState("scan");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingBarcode, setIsUploadingBarcode] = useState(false);
  const [result, setResult] = useState(null);
  const [records, setRecords] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [staffError, setStaffError] = useState("");
  const [pageError, setPageError] = useState("");

  async function refreshTodayAttendance() {
    try {
      setPageError("");
      const response = await gateway.crm.attendance.getToday();
      setRecords(response.data || []);
    } catch (error) {
      setPageError(getApiErrorMessage(error, t("crm.attendance.pageLoadFailed")));
    }
  }

  async function loadStaffList() {
    try {
      const response = await gateway.crm.attendance.getStaffList();
      setStaffList(response.data || []);
    } catch {
      setStaffList([]);
    }
  }

  useEffect(() => {
    refreshTodayAttendance();
    loadStaffList();
  }, []);

  async function lookupStaff(staffCode) {
    if (!staffCode.trim()) {
      setSelectedStaff(null);
      setStaffError("");
      return;
    }

    try {
      setStaffError("");
      const response = await gateway.crm.attendance.getStaff(staffCode.trim());
      setSelectedStaff(response.data || null);
    } catch (error) {
      setSelectedStaff(null);
      setStaffError(getApiErrorMessage(error, t("crm.attendance.staffLookupFailed")));
    }
  }

  async function submitAttendance(nextScanType, scannedCode) {
    const staffCode = (scannedCode ?? form.staffCode).trim().toUpperCase();
    if (!staffCode) {
      setResult({
        success: false,
        message: t("crm.attendance.requireStaffCode"),
      });
      return;
    }

    try {
      setIsSubmitting(true);
      setPageError("");

      const payload = {
        staffCode,
        branchCode: form.branchCode.trim(),
        deviceCode: form.deviceCode.trim(),
        scanType: nextScanType,
        scanTime: new Date().toISOString(),
      };

      const response = nextScanType === "CHECKOUT"
        ? await gateway.crm.attendance.checkOut(payload)
        : submitMode === "checkin"
          ? await gateway.crm.attendance.checkIn(payload)
          : await gateway.crm.attendance.scan(payload);

      setResult(response);
      setForm((current) => ({
        ...current,
        staffCode,
        scanType: nextScanType,
      }));
      await lookupStaff(staffCode);
      await refreshTodayAttendance();
    } catch (error) {
      setResult({
        success: false,
        message: getApiErrorMessage(error, t("crm.attendance.submitFailed")),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const scanner = useBarcodeScanner({
    onDetected: async (value) => {
      setForm((current) => ({
        ...current,
        staffCode: value,
      }));
      const nextType = submitMode === "checkout"
        ? "CHECKOUT"
        : submitMode === "checkin"
          ? "CHECKIN"
          : form.scanType;
      await submitAttendance(nextType, value);
    },
  });

  const scannerSupportMessage = !scanner.isSupported
    ? !scanner.support.hasBarcodeDetector
      ? t("crm.attendance.scannerMissingDetector")
      : !scanner.support.hasCameraAccess
        ? scanner.isImageSupported
          ? t("crm.attendance.scannerNeedsSecureContextWithUpload")
          : t("crm.attendance.scannerNeedsSecureContext")
        : scanner.isImageSupported
          ? t("crm.attendance.scannerUnsupportedWithUpload")
          : t("crm.attendance.scannerUnsupported")
    : "";

  const uploadSupportMessage = !scanner.isImageSupported
    ? t("crm.attendance.uploadUnsupported")
    : t("crm.attendance.uploadHint");

  async function handleBarcodeImageChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      setIsUploadingBarcode(true);
      await scanner.detectFromFile(file);
    } catch {
      // Scanner hook already surfaces a helpful error message.
    } finally {
      setIsUploadingBarcode(false);
    }
  }

  const totalCheckIns = records.filter((record) => record.scanType === "CHECKIN").length;
  const totalCheckOuts = records.filter((record) => record.scanType === "CHECKOUT").length;
  const totalLate = records.filter((record) => record.status === "Late").length;

  const metrics = [
    {
      label: t("crm.attendance.metricToday"),
      value: records.length,
      hint: t("crm.attendance.metricTodayHint"),
    },
    {
      label: t("crm.attendance.metricCheckIns"),
      value: totalCheckIns,
      hint: t("crm.attendance.metricCheckInsHint"),
    },
    {
      label: t("crm.attendance.metricLate"),
      value: totalLate,
      hint: t("crm.attendance.metricLateHint"),
    },
    {
      label: t("crm.attendance.metricCheckOuts"),
      value: totalCheckOuts,
      hint: t("crm.attendance.metricCheckOutsHint"),
    },
  ];

  return (
    <div className="crm-attendance-page">
      <section className="crm-attendance-hero">
        <div className="crm-attendance-hero-copy">
          <span className="crm-attendance-kicker">{t("crm.attendance.heroKicker")}</span>
          <h2>{t("crm.attendance.heroTitle")}</h2>
          <p>{t("crm.attendance.heroDescription")}</p>
        </div>

        <div className="crm-attendance-metrics">
          {metrics.map((item) => (
            <article className="crm-attendance-metric-card" key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <small>{item.hint}</small>
            </article>
          ))}
        </div>
      </section>

      <div className="crm-attendance-grid">
        <section className="crm-attendance-card crm-attendance-scan-card">
          <div className="crm-attendance-table-head">
            <div>
              <span className="crm-attendance-kicker">{t("crm.attendance.scanKicker")}</span>
              <h3>{t("crm.attendance.scanTitle")}</h3>
            </div>
            <div className="crm-attendance-mode-switch">
              <button
                type="button"
                className={submitMode === "scan" ? "active" : ""}
                onClick={() => setSubmitMode("scan")}
              >
                {t("crm.attendance.modeSmartScan")}
              </button>
              <button
                type="button"
                className={submitMode === "checkin" ? "active" : ""}
                onClick={() => setSubmitMode("checkin")}
              >
                {t("crm.attendance.modeForceCheckIn")}
              </button>
              <button
                type="button"
                className={submitMode === "checkout" ? "active" : ""}
                onClick={() => setSubmitMode("checkout")}
              >
                {t("crm.attendance.modeForceCheckOut")}
              </button>
            </div>
          </div>

          <div className="crm-attendance-scanner-stage">
            <video ref={scanner.videoRef} className="crm-attendance-video" playsInline muted />
            <div className="crm-attendance-scanner-overlay">
              <span />
              <p>
                {scanner.isActive
                  ? t("crm.attendance.scannerActiveHint")
                  : t("crm.attendance.scannerIdleHint")}
              </p>
            </div>
          </div>

          <div className="crm-attendance-action-row">
            <button
              type="button"
              className="primary-btn btn-with-icon"
              onClick={scanner.isActive ? scanner.stopScanner : scanner.startScanner}
            >
              <AppIcon name={scanner.isActive ? "close" : "clock"} />
              {scanner.isActive ? t("crm.attendance.stopCamera") : t("crm.attendance.startCamera")}
            </button>
            <input
              ref={barcodeUploadInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={handleBarcodeImageChange}
            />
            <button
              type="button"
              className="screen-btn btn-with-icon"
              onClick={() => barcodeUploadInputRef.current?.click()}
              disabled={!scanner.isImageSupported || isUploadingBarcode}
              title={!scanner.isImageSupported ? t("crm.attendance.uploadUnsupported") : t("crm.attendance.uploadBarcode")}
            >
              <AppIcon name="upload" />
              {isUploadingBarcode ? t("crm.attendance.uploadingBarcode") : t("crm.attendance.uploadBarcode")}
            </button>
            <button
              type="button"
              className="screen-btn btn-with-icon"
              onClick={() => refreshTodayAttendance()}
            >
              <AppIcon name="save" />
              {t("crm.attendance.refreshRecords")}
            </button>
          </div>

          {!scanner.isSupported ? (
            <p className="crm-attendance-inline-note">{scannerSupportMessage}</p>
          ) : null}

          <p className="crm-attendance-inline-note">{uploadSupportMessage}</p>

          {!scanner.isSupported && !scanner.support.isSecureContext ? (
            <p className="crm-attendance-inline-note">{t("crm.attendance.secureContextHint")}</p>
          ) : null}

          {scanner.scannerError ? (
            <p className="crm-attendance-inline-error">{scanner.scannerError}</p>
          ) : null}

          <form
            className="crm-attendance-form"
            onSubmit={async (event) => {
              event.preventDefault();
              const nextType = submitMode === "checkout" ? "CHECKOUT" : "CHECKIN";
              await submitAttendance(nextType);
            }}
          >
            <label>
              <span>{t("crm.attendance.staffCode")}</span>
              <input
                value={form.staffCode}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    staffCode: event.target.value.toUpperCase(),
                  }))
                }
                onBlur={() => lookupStaff(form.staffCode)}
                placeholder="ST0001"
                inputMode="text"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
              />
            </label>

            <label>
              <span>{t("crm.attendance.branchCode")}</span>
              <input
                value={form.branchCode}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    branchCode: event.target.value.toUpperCase(),
                  }))
                }
                placeholder="PP01"
                inputMode="text"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
              />
            </label>

            <label>
              <span>{t("crm.attendance.deviceCode")}</span>
              <input
                value={form.deviceCode}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    deviceCode: event.target.value.toUpperCase(),
                  }))
                }
                placeholder="WEB-KIOSK-01"
                inputMode="text"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
              />
            </label>

            <label>
              <span>{t("crm.attendance.defaultScanType")}</span>
              <select
                value={form.scanType}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    scanType: event.target.value,
                  }))
                }
              >
                <option value="CHECKIN">CHECKIN</option>
                <option value="CHECKOUT">CHECKOUT</option>
              </select>
            </label>

            <div className="crm-attendance-action-row crm-attendance-form-actions">
              <button className="primary-btn btn-with-icon" type="submit" disabled={isSubmitting}>
                <AppIcon name="clock" />
                {isSubmitting ? t("crm.attendance.submitting") : t("crm.attendance.submit")}
              </button>
              <button
                className="screen-btn btn-with-icon"
                type="button"
                onClick={() => lookupStaff(form.staffCode)}
              >
                <AppIcon name="user" />
                {t("crm.attendance.lookupStaff")}
              </button>
            </div>
          </form>

          <div className="crm-attendance-sample-row">
            <span>{t("crm.attendance.sampleStaff")}</span>
            {staffList.map((staff) => (
              <button
                key={staff.staffCode}
                type="button"
                className="crm-attendance-sample-pill"
                onClick={async () => {
                  setForm((current) => ({
                    ...current,
                    staffCode: staff.staffCode,
                    branchCode: staff.branchCode,
                  }));
                  await lookupStaff(staff.staffCode);
                }}
              >
                {staff.staffCode}
              </button>
            ))}
          </div>
        </section>

        <AttendanceResultCard result={result} language={language} t={t} />
        <AttendanceStaffLookupCard error={staffError} staff={selectedStaff} t={t} />
        <AttendanceTodayTable language={language} records={records} t={t} />
      </div>

      {pageError ? <p className="crm-attendance-page-alert">{pageError}</p> : null}
    </div>
  );
}

export default CrmAttendance;
