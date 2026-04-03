import { useEffect, useMemo, useRef, useState } from "react";
import AppIcon from "../components/common/AppIcon";
import useI18n from "../i18n/useI18n";
import gateway from "../services/gateway";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const DOCUMENT_TYPE_KEYS = ["generic", "invoice", "id-card", "khmer-form"];

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

const getTemplateFocusAreas = (t, documentType) => {
  switch (documentType) {
    case "invoice":
      return [
        t("crm.ocr.focusMerchantName"),
        t("crm.ocr.focusInvoiceNumber"),
        t("crm.ocr.focusInvoiceDate"),
        t("crm.ocr.focusCustomerName"),
        t("crm.ocr.focusSubtotal"),
        t("crm.ocr.focusTaxAmount"),
        t("crm.ocr.focusTotalAmount"),
        t("crm.ocr.focusCurrency"),
      ];
    case "id-card":
      return [
        t("crm.ocr.focusIdNumber"),
        t("crm.ocr.focusFullName"),
        t("crm.ocr.focusDateOfBirth"),
        t("crm.ocr.focusGender"),
        t("crm.ocr.focusNationality"),
        t("crm.ocr.focusAddress"),
        t("crm.ocr.focusIssueDate"),
        t("crm.ocr.focusExpiryDate"),
      ];
    case "khmer-form":
      return [
        t("crm.ocr.focusFormTitle"),
        t("crm.ocr.focusFormNumber"),
        t("crm.ocr.focusApplicantName"),
        t("crm.ocr.focusPhoneNumber"),
        t("crm.ocr.focusAddress"),
        t("crm.ocr.focusDocumentDate"),
        t("crm.ocr.focusDepartment"),
        t("crm.ocr.focusAmount"),
      ];
    case "generic":
    default:
      return [
        t("crm.ocr.focusReferenceNumber"),
        t("crm.ocr.focusPersonName"),
        t("crm.ocr.focusOrganization"),
        t("crm.ocr.focusDocumentDate"),
        t("crm.ocr.focusTotalAmount"),
        t("crm.ocr.focusPhoneNumber"),
      ];
  }
};

const getDocumentTypeLabel = (t, documentType) => {
  switch (documentType) {
    case "invoice":
      return t("crm.ocr.documentTypeInvoice");
    case "id-card":
      return t("crm.ocr.documentTypeIdCard");
    case "khmer-form":
      return t("crm.ocr.documentTypeKhmerForm");
    case "generic":
    default:
      return t("crm.ocr.documentTypeGeneric");
  }
};

const getConfidenceLabel = (t, confidence) => {
  switch (String(confidence || "").toLowerCase()) {
    case "high":
      return t("crm.ocr.confidenceHigh");
    case "medium":
      return t("crm.ocr.confidenceMedium");
    case "low":
      return t("crm.ocr.confidenceLow");
    default:
      return t("crm.ocr.confidenceUnknown");
  }
};

const getConfidenceToneClass = (confidence) => {
  switch (String(confidence || "").toLowerCase()) {
    case "high":
      return "high";
    case "medium":
      return "medium";
    case "low":
      return "low";
    default:
      return "unknown";
  }
};

function CrmOcr() {
  const { t } = useI18n();
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [documentType, setDocumentType] = useState("generic");
  const [promptHint, setPromptHint] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);

  useEffect(() => () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
  }, [previewUrl]);

  const structuredFields = result?.data?.structuredFields || [];
  const extractedFieldCount = structuredFields.filter((field) =>
    String(field.value || field.normalizedValue || "").trim()
  ).length;

  const stats = useMemo(() => [
    {
      label: t("crm.ocr.supportedLabel"),
      value: t("crm.ocr.supportedValue"),
      hint: t("crm.ocr.supportedHint"),
    },
    {
      label: t("crm.ocr.limitLabel"),
      value: t("crm.ocr.limitValue"),
      hint: t("crm.ocr.limitHint"),
    },
    {
      label: t("crm.ocr.outputLabel"),
      value: result?.data?.characterCount ?? 0,
      hint: t("crm.ocr.outputHint"),
    },
    {
      label: t("crm.ocr.fieldsFoundLabel"),
      value: extractedFieldCount,
      hint: t("crm.ocr.fieldsFoundHint"),
    },
  ], [extractedFieldCount, result?.data?.characterCount, t]);

  const documentTypeOptions = useMemo(
    () => DOCUMENT_TYPE_KEYS.map((key) => ({
      key,
      label: getDocumentTypeLabel(t, key),
    })),
    [t]
  );

  const templateFocusAreas = useMemo(
    () => getTemplateFocusAreas(t, documentType),
    [documentType, t]
  );

  const handleSelectFile = (event) => {
    const nextFile = event.target.files?.[0];
    event.target.value = "";

    if (!nextFile) {
      return;
    }

    if (!String(nextFile.type || "").startsWith("image/")) {
      setError(t("crm.ocr.invalidFileType"));
      return;
    }

    if (nextFile.size > MAX_FILE_SIZE) {
      setError(t("crm.ocr.fileTooLarge"));
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setFile(nextFile);
    setPreviewUrl(URL.createObjectURL(nextFile));
    setResult(null);
    setError("");
    setCopyMessage("");
  };

  const clearSelection = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setFile(null);
    setPreviewUrl("");
    setResult(null);
    setError("");
    setCopyMessage("");
  };

  const handleExtract = async () => {
    if (!file) {
      setError(t("crm.ocr.requireImage"));
      return;
    }

    try {
      setIsExtracting(true);
      setError("");
      setCopyMessage("");
      const response = await gateway.crm.ocr.extract(file, promptHint, documentType);
      setResult(response);
    } catch (nextError) {
      setResult(null);
      setError(getApiErrorMessage(nextError, t("crm.ocr.extractFailed")));
    } finally {
      setIsExtracting(false);
    }
  };

  const handleCopy = async () => {
    const text = result?.data?.normalizedText || result?.data?.text;
    if (!text) {
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopyMessage(t("crm.ocr.copySuccess"));
    } catch {
      setCopyMessage(t("crm.ocr.copyFailed"));
    }
  };

  return (
    <div className="crm-ocr-page">
      <section className="crm-ocr-hero">
        <div className="crm-ocr-hero-copy">
          <span className="crm-ocr-kicker">{t("crm.ocr.heroKicker")}</span>
          <h2>{t("crm.ocr.heroTitle")}</h2>
          <p>{t("crm.ocr.heroDescription")}</p>
        </div>

        <div className="crm-ocr-stats">
          {stats.map((item) => (
            <article className="crm-ocr-stat-card" key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <small>{item.hint}</small>
            </article>
          ))}
        </div>
      </section>

      <div className="crm-ocr-grid">
        <section className="crm-ocr-card crm-ocr-upload-card">
          <div className="crm-ocr-card-head">
            <div>
              <span className="crm-ocr-kicker">{t("crm.ocr.uploadKicker")}</span>
              <h3>{t("crm.ocr.uploadTitle")}</h3>
            </div>
            <span className="crm-ocr-pill">
              {file ? file.name : t("crm.ocr.noFileSelected")}
            </span>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={handleSelectFile}
          />

          <div className="crm-ocr-upload-stage">
            {previewUrl ? (
              <img src={previewUrl} alt={file?.name || t("crm.ocr.previewAlt")} className="crm-ocr-preview" />
            ) : (
              <div className="crm-ocr-empty-state">
                <AppIcon name="ocr" />
                <h4>{t("crm.ocr.emptyTitle")}</h4>
                <p>{t("crm.ocr.emptyBody")}</p>
              </div>
            )}
          </div>

          <div className="crm-ocr-action-row">
            <button
              type="button"
              className="primary-btn btn-with-icon"
              onClick={() => inputRef.current?.click()}
            >
              <AppIcon name="upload" />
              {t("crm.ocr.chooseImage")}
            </button>
            <button
              type="button"
              className="screen-btn btn-with-icon"
              onClick={clearSelection}
              disabled={!file && !result && !error}
            >
              <AppIcon name="close" />
              {t("crm.ocr.clear")}
            </button>
          </div>

          <label className="crm-ocr-hint-field">
            <span>{t("crm.ocr.documentTypeLabel")}</span>
            <select value={documentType} onChange={(event) => setDocumentType(event.target.value)}>
              {documentTypeOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="crm-ocr-template-panel">
            <span className="crm-ocr-template-title">{t("crm.ocr.focusAreaLabel")}</span>
            <div className="crm-ocr-template-pills">
              {templateFocusAreas.map((item) => (
                <span className="crm-ocr-template-pill" key={item}>
                  {item}
                </span>
              ))}
            </div>
            <p className="crm-ocr-inline-note">{t("crm.ocr.documentTypeHelper")}</p>
          </div>

          <label className="crm-ocr-hint-field">
            <span>{t("crm.ocr.promptHintLabel")}</span>
            <textarea
              value={promptHint}
              onChange={(event) => setPromptHint(event.target.value)}
              placeholder={t("crm.ocr.promptHintPlaceholder")}
              rows={4}
            />
          </label>

          <div className="crm-ocr-action-row">
            <button
              type="button"
              className="primary-btn btn-with-icon"
              disabled={!file || isExtracting}
              onClick={handleExtract}
            >
              <AppIcon name="ocr" />
              {isExtracting ? t("crm.ocr.extracting") : t("crm.ocr.extractAction")}
            </button>
            <button
              type="button"
              className="screen-btn btn-with-icon"
              disabled={!result?.data?.normalizedText}
              onClick={handleCopy}
            >
              <AppIcon name="copy" />
              {t("crm.ocr.copyText")}
            </button>
          </div>

          <p className="crm-ocr-inline-note">{t("crm.ocr.configurationHint")}</p>
          {error ? <p className="crm-ocr-inline-error">{error}</p> : null}
          {copyMessage ? <p className="crm-ocr-inline-note">{copyMessage}</p> : null}
        </section>

        <section className="crm-ocr-card crm-ocr-result-card">
          <div className="crm-ocr-card-head">
            <div>
              <span className="crm-ocr-kicker">{t("crm.ocr.resultKicker")}</span>
              <h3>{t("crm.ocr.resultTitle")}</h3>
            </div>
            <span className="crm-ocr-pill">
              {result?.data?.model || t("crm.ocr.awaitingResult")}
            </span>
          </div>

          {result?.data ? (
            <>
              <div className="crm-ocr-result-meta">
                <div>
                  <dt>{t("crm.ocr.fileLabel")}</dt>
                  <dd>{result.data.fileName}</dd>
                </div>
                <div>
                  <dt>{t("crm.ocr.typeLabel")}</dt>
                  <dd>{result.data.contentType}</dd>
                </div>
                <div>
                  <dt>{t("crm.ocr.requestedTypeLabel")}</dt>
                  <dd>{getDocumentTypeLabel(t, result.data.requestedDocumentType)}</dd>
                </div>
                <div>
                  <dt>{t("crm.ocr.detectedTypeLabel")}</dt>
                  <dd>{getDocumentTypeLabel(t, result.data.detectedDocumentType)}</dd>
                </div>
                <div>
                  <dt>{t("crm.ocr.charactersLabel")}</dt>
                  <dd>{result.data.characterCount}</dd>
                </div>
                <div>
                  <dt>{t("crm.ocr.fieldsCountLabel")}</dt>
                  <dd>{structuredFields.length}</dd>
                </div>
                <div>
                  <dt>{t("crm.ocr.detectedLanguageLabel")}</dt>
                  <dd>{result.data.detectedLanguage || t("crm.ocr.valueMissing")}</dd>
                </div>
                <div>
                  <dt>{t("crm.ocr.documentTitleLabel")}</dt>
                  <dd>{result.data.documentTitle || t("crm.ocr.valueMissing")}</dd>
                </div>
              </div>

              <div className="crm-ocr-output-block">
                <h4>{t("crm.ocr.summaryTitle")}</h4>
                <p>{result.data.summary || t("crm.ocr.valueMissing")}</p>
              </div>

              <div className="crm-ocr-output-block">
                <h4>{t("crm.ocr.structuredFieldsTitle")}</h4>
                {structuredFields.length > 0 ? (
                  <div className="crm-ocr-structured-grid">
                    {structuredFields.map((field) => {
                      const value = field.value || field.normalizedValue || "";
                      return (
                        <article
                          className={`crm-ocr-structured-field ${getConfidenceToneClass(field.confidence)}`.trim()}
                          key={`${field.key}-${field.label}`}
                        >
                          <div className="crm-ocr-field-head">
                            <strong>{field.label || field.key}</strong>
                            <span>{getConfidenceLabel(t, field.confidence)}</span>
                          </div>
                          <p className={`crm-ocr-field-value${value ? "" : " crm-ocr-field-empty"}`}>
                            {value || t("crm.ocr.valueMissing")}
                          </p>
                          <dl className="crm-ocr-field-meta">
                            <div>
                              <dt>{t("crm.ocr.fieldKeyLabel")}</dt>
                              <dd>{field.key || t("crm.ocr.valueMissing")}</dd>
                            </div>
                            <div>
                              <dt>{t("crm.ocr.normalizedValueLabel")}</dt>
                              <dd>{field.normalizedValue || t("crm.ocr.valueMissing")}</dd>
                            </div>
                            <div>
                              <dt>{t("crm.ocr.notesLabel")}</dt>
                              <dd>{field.notes || t("crm.ocr.valueMissing")}</dd>
                            </div>
                          </dl>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <p>{t("crm.ocr.structuredFieldsEmpty")}</p>
                )}
              </div>

              <div className="crm-ocr-output-block">
                <h4>{t("crm.ocr.normalizedTextTitle")}</h4>
                <pre>{result.data.normalizedText || result.data.text}</pre>
              </div>

              {result.data.promptHint ? (
                <div className="crm-ocr-output-block">
                  <h4>{t("crm.ocr.hintUsedTitle")}</h4>
                  <p>{result.data.promptHint}</p>
                </div>
              ) : null}
            </>
          ) : (
            <div className="crm-ocr-empty-state crm-ocr-result-empty">
              <AppIcon name="ocr" />
              <h4>{t("crm.ocr.resultEmptyTitle")}</h4>
              <p>{t("crm.ocr.resultEmptyBody")}</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default CrmOcr;
