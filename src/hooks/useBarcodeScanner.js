import { useEffect, useRef, useState } from "react";

function getScannerSupport() {
  const hasWindow = typeof window !== "undefined";
  const hasNavigator = typeof navigator !== "undefined";
  const hasBarcodeDetector = hasWindow && "BarcodeDetector" in window;
  const hasCameraAccess = hasNavigator && Boolean(navigator.mediaDevices?.getUserMedia);
  const hasImageBitmap = hasWindow && typeof window.createImageBitmap === "function";
  const isSecureContext = hasWindow ? Boolean(window.isSecureContext) : false;

  return {
    hasBarcodeDetector,
    hasCameraAccess,
    hasImageBitmap,
    isSecureContext,
    canScanCamera: hasBarcodeDetector && hasCameraAccess,
    canScanImage: hasBarcodeDetector && hasImageBitmap,
  };
}

function getCameraSupportMessage(support) {
  if (!support.hasBarcodeDetector) {
    return "Native barcode scanning is not available in this browser. Try Chrome or Edge.";
  }

  if (!support.hasCameraAccess) {
    return support.isSecureContext
      ? "Camera access is not available in this browser."
      : "Camera scanning needs HTTPS or localhost in this browser.";
  }

  return "Camera scanning is not supported in this browser.";
}

function getImageSupportMessage(support) {
  if (!support.hasBarcodeDetector) {
    return "Barcode image upload is not available in this browser. Try Chrome or Edge.";
  }

  if (!support.hasImageBitmap) {
    return "This browser cannot scan a barcode from an uploaded image.";
  }

  return "Barcode image upload is not supported in this browser.";
}

function getScannerStartErrorMessage(error, support) {
  if (error?.name === "NotAllowedError") {
    return support.isSecureContext
      ? "Camera permission was blocked. Allow camera access and try again."
      : "Camera scanning needs HTTPS or localhost in this browser.";
  }

  if (error?.name === "NotFoundError" || error?.name === "OverconstrainedError") {
    return "No usable rear camera was found on this device.";
  }

  return error instanceof Error
    ? error.message
    : "Unable to start the camera scanner.";
}

function createDetector() {
  return new window.BarcodeDetector({
    formats: ["qr_code", "code_128", "code_39", "ean_13"],
  });
}

function rememberDetection(lastScanRef, value) {
  const now = Date.now();
  if (lastScanRef.current.value === value && now - lastScanRef.current.at < 4000) {
    return false;
  }

  lastScanRef.current = {
    value,
    at: now,
  };

  return true;
}

export default function useBarcodeScanner({ onDetected }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const detectorRef = useRef(null);
  const lastScanRef = useRef({ value: "", at: 0 });
  const onDetectedRef = useRef(onDetected);
  const [support] = useState(getScannerSupport);
  const [isActive, setIsActive] = useState(false);
  const [scannerError, setScannerError] = useState("");

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  async function startScanner() {
    if (!support.canScanCamera) {
      setScannerError(getCameraSupportMessage(support));
      return;
    }

    try {
      setScannerError("");
      const detector = createDetector();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: {
            ideal: "environment",
          },
          width: {
            ideal: 1920,
          },
          height: {
            ideal: 1080,
          },
        },
        audio: false,
      });

      detectorRef.current = detector;
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      intervalRef.current = window.setInterval(async () => {
        if (!videoRef.current || !detectorRef.current) {
          return;
        }

        try {
          const results = await detectorRef.current.detect(videoRef.current);
          const value = results[0]?.rawValue?.trim();
          if (!value) {
            return;
          }

          if (!rememberDetection(lastScanRef, value)) {
            return;
          }

          onDetectedRef.current?.(value);
        } catch {
          // Ignore intermittent detector frame errors.
        }
      }, 900);

      setIsActive(true);
    } catch (error) {
      setScannerError(getScannerStartErrorMessage(error, support));
      stopScanner();
    }
  }

  function stopScanner() {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }

    detectorRef.current = null;
    setIsActive(false);
  }

  async function detectFromFile(file) {
    if (!file) {
      return "";
    }

    if (!support.canScanImage) {
      const message = getImageSupportMessage(support);
      setScannerError(message);
      throw new Error(message);
    }

    if (!String(file.type || "").startsWith("image/")) {
      const message = "Please upload an image file.";
      setScannerError(message);
      throw new Error(message);
    }

    let imageBitmap;

    try {
      setScannerError("");
      const detector = createDetector();
      imageBitmap = await window.createImageBitmap(file);
      const results = await detector.detect(imageBitmap);
      const value = results[0]?.rawValue?.trim();

      if (!value) {
        throw new Error("No QR code or barcode was detected in the uploaded image.");
      }

      rememberDetection(lastScanRef, value);
      await onDetectedRef.current?.(value);
      return value;
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : "Unable to scan the uploaded barcode image.";
      setScannerError(message);
      throw new Error(message);
    } finally {
      imageBitmap?.close?.();
    }
  }

  return {
    videoRef,
    isSupported: support.canScanCamera,
    isImageSupported: support.canScanImage,
    support,
    isActive,
    scannerError,
    startScanner,
    stopScanner,
    detectFromFile,
  };
}
