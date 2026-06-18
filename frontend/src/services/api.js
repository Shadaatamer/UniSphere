import axios from "axios";

const configuredApiUrl = process.env.REACT_APP_API_URL;
const baseURL =
  configuredApiUrl && !configuredApiUrl.includes("localhost:5001")
    ? configuredApiUrl
    : "http://localhost:5050/api";

const api = axios.create({
  baseURL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
