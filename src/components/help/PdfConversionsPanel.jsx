import { useEffect, useMemo, useRef, useState } from "react";
import AppIcon from "../common/AppIcon";
import useI18n from "../../i18n/useI18n";
import pdfConversion from "../../services/pdfConversion";

const MAX_FILE_SIZE = 25 * 1024 * 1024;

const formatBytes = (bytes) => {
  const size = Number(bytes || 0);
  if (size <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
  const value = size / 1024 ** exponent;
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
};

const isPdfFile = (file) => {
  if (!file) {
    return false;
  }

  return String(file.type || "").toLowerCase() === "application/pdf"
    || String(file.name || "").toLowerCase().endsWith(".pdf");
};

const getFormatLabel = (t, format) => {
  switch (format) {
    case "docx":
      return t("help.pdf.formatLabelDocx");
    case "png":
      return t("help.pdf.formatLabelPng");
    case "png-archive":
      return t("help.pdf.formatLabelPngArchive");
    case "xlsx":
    default:
      return t("help.pdf.formatLabelXlsx");
  }
};

const buildFallbackFileName = (fileName, format, pageNumber) => {
  const baseName = String(fileName || "converted-document").replace(/\.pdf$/i, "") || "converted-document";

  switch (format) {
    case "docx":
      return `${baseName}.docx`;
    case "png":
      return `${baseName}-page-${String(pageNumber).padStart(3, "0")}.png`;
    case "png-archive":
      return `${baseName}-png.zip`;
    case "xlsx":
    default:
      return `${baseName}.xlsx`;
  }
};

function PdfConversionsPanel() {
  const { t } = useI18n();
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [format, setFormat] = useState("png");
  const [dpi, setDpi] = useState("144");
  const [pageNumber, setPageNumber] = useState("1");
  const [result, setResult] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");
  const [isConverting, setIsConverting] = useState(false);

  useEffect(() => () => {
    if (result?.previewUrl) {
      URL.revokeObjectURL(result.previewUrl);
    }
  }, [result?.previewUrl]);

  const formatOptions = useMemo(() => ([
    {
      key: "png",
      badge: t("help.pdf.formatLabelPng"),
      label: t("help.pdf.formatPng"),
      hint: t("help.pdf.formatPngHint"),
    },
    {
      key: "png-archive",
      badge: t("help.pdf.formatLabelPngArchive"),
      label: t("help.pdf.formatPngArchive"),
      hint: t("help.pdf.formatPngArchiveHint"),
    },
    {
      key: "docx",
      badge: t("help.pdf.formatLabelDocx"),
      label: t("help.pdf.formatDocx"),
      hint: t("help.pdf.formatDocxHint"),
    },
    {
      key: "xlsx",
      badge: t("help.pdf.formatLabelXlsx"),
      label: t("help.pdf.formatXlsx"),
      hint: t("help.pdf.formatXlsxHint"),
    },
  ]), [t]);

  const resetResult = () => {
    setResult((current) => {
      if (current?.previewUrl) {
        URL.revokeObjectURL(current.previewUrl);
      }

      return null;
    });
  };

  const handleSelectFile = (event) => {
    const nextFile = event.target.files?.[0];
    event.target.value = "";

    if (!nextFile) {
      return;
    }

    if (!isPdfFile(nextFile)) {
      setError(t("help.pdf.invalidFileType"));
      return;
    }

    if (nextFile.size > MAX_FILE_SIZE) {
      setError(t("help.pdf.fileTooLarge"));
      return;
    }

    resetResult();
    setFile(nextFile);
    setError("");
    setStatusMessage("");
  };

  const clearSelection = () => {
    resetResult();
    setFile(null);
    setError("");
    setStatusMessage("");
    setFormat("png");
    setDpi("144");
    setPageNumber("1");
  };

  const handleConvert = async () => {
    if (!file) {
      setError(t("help.pdf.requireFile"));
      return;
    }

    try {
      setIsConverting(true);
      setError("");
      setStatusMessage("");
      resetResult();

      const safeDpi = Math.max(72, Math.min(300, Number.parseInt(dpi, 10) || 144));
      const safePageNumber = Math.max(1, Number.parseInt(pageNumber, 10) || 1);
      let response;

      switch (format) {
        case "docx":
          response = await pdfConversion.convertToDocx(file);
          break;
        case "png":
          response = await pdfConversion.convertToPng(file, {
            dpi: safeDpi,
            pageNumber: safePageNumber,
          });
          break;
        case "png-archive":
          response = await pdfConversion.convertToPngArchive(file, { dpi: safeDpi });
          break;
        case "xlsx":
        default:
          response = await pdfConversion.convertToXlsx(file);
          break;
      }

      const downloadName = response.fileName || buildFallbackFileName(file.name, format, safePageNumber);
      const previewUrl = response.contentType.startsWith("image/")
        ? URL.createObjectURL(response.blob)
        : "";

      pdfConversion.saveBlobAsFile(response.blob, downloadName);
      setResult({
        blob: response.blob,
        fileName: downloadName,
        contentType: response.contentType || response.blob.type || "",
        format,
        previewUrl,
        dpi: format === "png" || format === "png-archive" ? safeDpi : null,
        pageNumber: format === "png" ? safePageNumber : null,
      });
      setStatusMessage(t("help.pdf.statusReady", { fileName: downloadName }));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t("help.pdf.convertFailed"));
    } finally {
      setIsConverting(false);
    }
  };

  const handleDownloadAgain = () => {
    if (!result?.blob) {
      return;
    }

    pdfConversion.saveBlobAsFile(result.blob, result.fileName);
  };

  const showPngOptions = format === "png" || format === "png-archive";
  const showPageNumber = format === "png";

  return (
    <article className="page-card help-card help-card-wide help-pdf-card">
      <div className="help-section-head help-section-head-split">
        <div className="help-section-title">
          <div className="help-icon-badge" aria-hidden="true">
            <AppIcon name="download" />
          </div>
          <div>
            <h3>{t("help.pdf.title")}</h3>
            <p className="muted-text">{t("help.pdf.intro")}</p>
          </div>
        </div>
        <span className="help-audience-badge">{t("help.pdf.audience")}</span>
      </div>

      <div className="help-pdf-grid">
        <section className="help-pdf-panel">
          <div className="help-pdf-subcard">
            <div>
              <h4>{t("help.pdf.uploadTitle")}</h4>
              <p className="muted-text">{t("help.pdf.uploadHint")}</p>
            </div>

            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
              hidden
              onChange={handleSelectFile}
            />

            <div className="help-pdf-dropzone">
              <div className="help-pdf-selected-file">
                <AppIcon name="invoice-screen" />
                <div>
                  <strong>{file ? file.name : t("help.pdf.noFileSelected")}</strong>
                  <span>{file ? formatBytes(file.size) : t("help.pdf.uploadHint")}</span>
                </div>
              </div>

              <div className="help-pdf-action-row">
                <button
                  type="button"
                  className="primary-btn btn-with-icon"
                  onClick={() => inputRef.current?.click()}
                >
                  <AppIcon name="upload" />
                  {file ? t("help.pdf.replaceFile") : t("help.pdf.chooseFile")}
                </button>
                <button
                  type="button"
                  className="screen-btn btn-with-icon"
                  onClick={clearSelection}
                  disabled={!file && !result && !error}
                >
                  <AppIcon name="close" />
                  {t("help.pdf.clear")}
                </button>
              </div>
            </div>

            {file ? (
              <dl className="help-pdf-meta">
                <div>
                  <dt>{t("help.pdf.selectedFile")}</dt>
                  <dd>{file.name}</dd>
                </div>
                <div>
                  <dt>{t("help.pdf.fileSize")}</dt>
                  <dd>{formatBytes(file.size)}</dd>
                </div>
              </dl>
            ) : null}
          </div>

          <div className="help-pdf-subcard">
            <div>
              <h4>{t("help.pdf.outputTitle")}</h4>
              <p className="muted-text">{t("help.pdf.outputHint")}</p>
            </div>

            <div className="help-pdf-format-grid">
              {formatOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  className={`help-pdf-format-option${format === option.key ? " active" : ""}`}
                  onClick={() => setFormat(option.key)}
                  aria-pressed={format === option.key}
                >
                  <span className="help-pdf-format-pill">{option.badge}</span>
                  <strong>{option.label}</strong>
                  <span>{option.hint}</span>
                </button>
              ))}
            </div>

            {showPngOptions ? (
              <div className="help-pdf-settings">
                <label className="help-pdf-field">
                  <span>{t("help.pdf.dpiLabel")}</span>
                  <input
                    type="number"
                    min="72"
                    max="300"
                    step="1"
                    value={dpi}
                    onChange={(event) => setDpi(event.target.value)}
                  />
                  <small>{t("help.pdf.dpiHint")}</small>
                </label>

                {showPageNumber ? (
                  <label className="help-pdf-field">
                    <span>{t("help.pdf.pageNumberLabel")}</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={pageNumber}
                      onChange={(event) => setPageNumber(event.target.value)}
                    />
                    <small>{t("help.pdf.pageNumberHint")}</small>
                  </label>
                ) : null}
              </div>
            ) : null}

            <div className="help-pdf-action-row">
              <button
                type="button"
                className="primary-btn btn-with-icon"
                disabled={!file || isConverting}
                onClick={handleConvert}
              >
                <AppIcon name="download" />
                {isConverting ? t("help.pdf.converting") : t("help.pdf.convert")}
              </button>
              <button
                type="button"
                className="screen-btn btn-with-icon"
                disabled={!result?.blob}
                onClick={handleDownloadAgain}
              >
                <AppIcon name="copy" />
                {t("help.pdf.downloadAgain")}
              </button>
            </div>

            {statusMessage ? <p className="help-pdf-status help-pdf-status-success">{statusMessage}</p> : null}
            {error ? <p className="help-pdf-status help-pdf-status-error">{error}</p> : null}
          </div>
        </section>

        <section className="help-pdf-panel">
          <div className="help-pdf-subcard">
            <div>
              <h4>{t("help.pdf.previewTitle")}</h4>
              <p className="muted-text">{t("help.pdf.previewHint")}</p>
            </div>

            {result ? (
              <>
                <dl className="help-pdf-result-meta">
                  <div>
                    <dt>{t("help.pdf.lastFile")}</dt>
                    <dd>{result.fileName}</dd>
                  </div>
                  <div>
                    <dt>{t("help.pdf.lastType")}</dt>
                    <dd>{result.contentType || "-"}</dd>
                  </div>
                  <div>
                    <dt>{t("help.pdf.lastFormat")}</dt>
                    <dd>{getFormatLabel(t, result.format)}</dd>
                  </div>
                  {result.pageNumber ? (
                    <div>
                      <dt>{t("help.pdf.lastPage")}</dt>
                      <dd>{result.pageNumber}</dd>
                    </div>
                  ) : null}
                  {result.dpi ? (
                    <div>
                      <dt>{t("help.pdf.lastDpi")}</dt>
                      <dd>{result.dpi}</dd>
                    </div>
                  ) : null}
                </dl>

                {result.previewUrl ? (
                  <div className="help-pdf-preview-frame">
                    <img src={result.previewUrl} alt={t("help.pdf.previewAlt")} />
                  </div>
                ) : (
                  <div className="help-pdf-empty-state">
                    <AppIcon name="help" />
                    <p>{t("help.pdf.previewUnavailable")}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="help-pdf-empty-state">
                <AppIcon name="download" />
                <p>{t("help.pdf.previewUnavailable")}</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </article>
  );
}

export default PdfConversionsPanel;
