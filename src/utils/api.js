export async function fetchJson(url, options = {}) {
  try {
    const response = await fetch(url, options);
    const text = await response.text();

    if (!response.ok) {
      // Check if response is HTML (likely an error page)
      const isHtml = text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html") || /^\s*<!doctype html/i.test(text) || /^\s*<html/i.test(text);
      
      const message = isHtml
        ? `API Error ${response.status}: The server returned an error page. Status: ${response.status}`
        : text || `Request failed with status ${response.status}`;
      
      console.error(`[API Error] ${url}:`, message);
      throw new Error(message);
    }

    if (!text.trim()) return null;

    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      return JSON.parse(text);
    }

    if (/^\s*<!doctype html/i.test(text) || /^\s*<html/i.test(text)) {
      throw new Error("Unexpected HTML response from API");
    }

    try {
      return JSON.parse(text);
    } catch (error) {
      throw new Error("Unexpected response from server");
    }
  } catch (error) {
    // Network errors or fetch failures
    if (error instanceof TypeError && error.message.includes("fetch")) {
      console.error("[Network Error]", error.message);
      throw new Error("Backend not running");
    }
    // Re-throw all other errors as-is
    throw error;
  }
}
