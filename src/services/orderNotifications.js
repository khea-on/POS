import { buildApiUrl } from "./api";
import { routes } from "./gateway";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token
    ? { Authorization: `Bearer ${token}` }
    : {};
};

export const startOrderNotificationStream = async ({ signal, onMessage }) => {
  const response = await fetch(buildApiUrl(routes.notifications.stream), {
    method: "GET",
    headers: {
      Accept: "application/x-ndjson",
      ...getAuthHeaders(),
    },
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    throw new Error(`Notification stream failed with status ${response.status}.`);
  }

  if (!response.body) {
    throw new Error("Streaming is not supported in this browser.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }

      let event;
      try {
        event = JSON.parse(trimmed);
      } catch {
        continue;
      }

      if (event.type === "heartbeat" || event.type === "ready") {
        continue;
      }

      onMessage?.(event);
    }
  }

  if (!signal?.aborted) {
    throw new Error("Notification stream ended.");
  }
};
