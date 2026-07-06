import { handleMockRequest } from "./mockBackend.js";

const API_URL = import.meta.env.VITE_API_URL || "";
const TOKEN_KEY = "dentify.token";

const isDevServer = 
  window.location.hostname === "localhost" || 
  window.location.hostname === "127.0.0.1" || 
  window.location.hostname.startsWith("192.168.");

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export async function api(path, options = {}) {
  if (!isDevServer) {
    const mockRes = await handleMockRequest(path, options);
    if (!mockRes.ok) {
      throw new Error(mockRes.error || "Mock request failed");
    }
    return mockRes.data;
  }

  const token = getToken();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || "Request failed");
  }
  return body.data;
}

export const authApi = {
  me: () => api("/api/me"),
  login: (payload) => api("/api/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  register: (payload) => api("/api/auth/register", { method: "POST", body: JSON.stringify(payload) })
};
