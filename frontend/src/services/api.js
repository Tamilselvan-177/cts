import axios from "axios";

// In Production/Docker, use relative path for Nginx. In local dev (npm run dev), use localhost:8000.
const BASE_URL = import.meta.env.DEV ? "http://localhost:8000" : (import.meta.env.VITE_API_URL || "");
const api = axios.create({ baseURL: BASE_URL });

export const getExecutiveDashboard  = () => api.get("/api/dashboard/executive").then(r => r.data);
export const getSalesDashboard      = () => api.get("/api/dashboard/sales").then(r => r.data);
export const getInventoryDashboard  = () => api.get("/api/dashboard/inventory").then(r => r.data);
export const getSyncStatus          = () => api.get("/api/dashboard/sync/status").then(r => r.data);
export const triggerSync            = () => api.post("/api/dashboard/sync").then(r => r.data);

export const askAssistant = (query, generateViz = false, sessionId = null) =>
  api.post("/api/chat/ask", { query, generate_viz: generateViz, session_id: sessionId }).then(r => r.data);

export const generateVisualization = (query) =>
  api.post("/api/chat/visualize", { query }).then(r => r.data);

export const getChatSessions = () =>
  api.get("/api/chat/sessions").then(r => r.data);

export const getSessionHistory = (sessionId) =>
  api.get(`/api/chat/sessions/${sessionId}`).then(r => r.data);

export default api;
