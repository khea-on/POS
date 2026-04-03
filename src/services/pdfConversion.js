import api from "./api";

const routes = {
  docx: "/pdf-conversions/docx",
  png: "/pdf-conversions/png",
  pngArchive: "/pdf-conversions/png/archive",
  xlsx: "/pdf-conversions/xlsx",
};

const extractErrorMessage = (payload) => {
  if (typeof payload === "string") {
    const trimmed = payload.trim();
    if (!trimmed) {
      return "";
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed?.message === "string" && parsed.message.trim()) {
        return parsed.message.trim();
      }
    } catch {
      return trimmed;
    }

    return trimmed;
  }

  if (typeof payload?.message === "string" && payload.message.trim()) {
    return payload.message.trim();
  }

  return "";
};

const getRequestErrorMessage = async (error) => {
  const responseData = error?.response?.data;

  if (responseData instanceof Blob) {
    const blobMessage = extractErrorMessage(await responseData.text());
    if (blobMessage) {
      return blobMessage;
    }
  }

  const responseMessage = extractErrorMessage(responseData);
  if (responseMessage) {
    return responseMessage;
  }

  return error instanceof Error ? error.message : "Unable to convert the PDF.";
};

const getFileNameFromDisposition = (contentDisposition) => {
  if (!contentDisposition) {
    return "";
  }

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const quotedMatch = contentDisposition.match(/filename="([^"]+)"/i);
  if (quotedMatch?.[1]) {
    return quotedMatch[1];
  }

  const plainMatch = contentDisposition.match(/filename=([^;]+)/i);
  if (plainMatch?.[1]) {
    return plainMatch[1].trim();
  }

  return "";
};

const createFormData = (file, options = {}) => {
  const formData = new FormData();
  formData.append("file", file);

  Object.entries(options).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      formData.append(key, String(value));
    }
  });

  return formData;
};

const requestConversion = async (url, file, options = {}) => {
  try {
    const response = await api.post(url, createFormData(file, options), {
      responseType: "blob",
    });

    return {
      blob: response.data,
      contentType: response.headers["content-type"] || response.data.type || "",
      fileName: getFileNameFromDisposition(response.headers["content-disposition"]),
    };
  } catch (error) {
    throw new Error(await getRequestErrorMessage(error));
  }
};

export const saveBlobAsFile = (blob, fileName) => {
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = fileName || "download";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(downloadUrl);
};

const pdfConversion = {
  convertToDocx: (file) => requestConversion(routes.docx, file),
  convertToPng: (file, options = {}) =>
    requestConversion(routes.png, file, options),
  convertToPngArchive: (file, options = {}) =>
    requestConversion(routes.pngArchive, file, options),
  convertToXlsx: (file) => requestConversion(routes.xlsx, file),
  saveBlobAsFile,
};

export default pdfConversion;
