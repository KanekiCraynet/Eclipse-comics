import axios from 'axios';

const BASE_URL = 'https://api-komikcast.vercel.app';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor untuk handle error global
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.status, error.config?.url);
    return Promise.reject(error);
  }
);

// API Methods (SESUAI DOKUMENTASI)
export const komikcastAPI = {
  // ✅ Available endpoints
  getRecommended: () => api.get('/recommended'),
  getPopular: () => api.get('/popular'),
  getDetail: (endpoint) => api.get(`/detail/${endpoint}`),
  search: (keyword) => api.get('/search', { params: { keyword } }),
  readChapter: (endpoint) => api.get(`/read/${endpoint}`),
  getGenres: () => api.get('/genre'),
  getGenreComics: (genre, page = 1) => api.get(`/genre/${genre}`, { params: { page } }),

  // ❌ REMOVED - tidak ada di dokumentasi
  // getOngoing: () => api.get('/ongoing'), // HAPUS INI
};

export default api;