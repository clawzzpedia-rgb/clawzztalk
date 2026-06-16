import axios from 'axios';

const API = axios.create({ baseURL: '/api' });

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.reload();
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  register: (data) => API.post('/auth/register', data),
  login: (data) => API.post('/auth/login', data),
  me: () => API.get('/auth/me')
};

export const serverAPI = {
  list: () => API.get('/servers'),
  get: (id) => API.get(`/servers/${id}`),
  create: (data) => API.post('/servers', data),
  join: (id) => API.post(`/servers/${id}/join`),
  search: (q) => API.get(`/servers/search/${q}`),
  members: (id) => API.get(`/servers/${id}/members`)
};

export const channelAPI = {
  create: (data) => API.post('/channels', data),
  delete: (id) => API.delete(`/channels/${id}`)
};

export const messageAPI = {
  getChannel: (id, limit, offset) => API.get(`/messages/channel/${id}`, { params: { limit, offset } }),
  sendChannel: (id, data) => API.post(`/messages/channel/${id}`, data),
  delete: (id) => API.delete(`/messages/${id}`),
  getDM: (id, limit, offset) => API.get(`/messages/dm/${id}`, { params: { limit, offset } }),
  sendDM: (id, data) => API.post(`/messages/dm/${id}`, data)
};

export const uploadAPI = {
  upload: (file) => {
    const form = new FormData();
    form.append('file', file);
    return API.post('/upload', form);
  }
};

export const userAPI = {
  search: (q) => API.get(`/users/search/${q}`),
  getDM: () => API.get('/users/dm'),
  startDM: (id) => API.post(`/users/dm/${id}`)
};

export default API;
