// src/api.js
import axios from 'axios';

// backend is on localhost:5000
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});

export default api;
