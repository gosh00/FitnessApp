// src/api.js
import axios from 'axios';

// backend is on localhost:5000
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

export default api;
