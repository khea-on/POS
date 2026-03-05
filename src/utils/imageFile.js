export const readImageFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    if (!file || typeof file !== "object") {
      reject(new Error("invalid_file"));
      return;
    }

    const mimeType = String(file.type || "").toLowerCase();
    if (!mimeType.startsWith("image/")) {
      reject(new Error("invalid_image_type"));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string" && reader.result.trim()) {
        resolve(reader.result);
      } else {
        reject(new Error("read_empty_result"));
      }
    };
    reader.onerror = () => {
      reject(new Error("read_failed"));
    };
    reader.readAsDataURL(file);
  });
