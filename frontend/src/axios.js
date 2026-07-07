import axios from 'axios';

const TOKEN_KEY = 'crm_auth_token';

const instance = axios.create({
    baseURL: '',
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
    }
});

// Inject token into every request automatically
instance.interceptors.request.use((config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
});

export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);
export const getToken = () => localStorage.getItem(TOKEN_KEY);

export default instance;
