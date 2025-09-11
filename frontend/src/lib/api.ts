import axios, { AxiosRequestHeaders } from 'axios';
import { API_BASE } from '@/config';
import { useAuthStore } from '@/store/auth';

console.log('[API] baseURL =', API_BASE);

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
});

// attach token + log request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    const headers = (config.headers ?? {}) as AxiosRequestHeaders;
    headers['Authorization'] = `Bearer ${token}`;
    config.headers = headers;
  }
  console.log(`[API] → ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, {
    data: config.data,
    headers: config.headers,
  });
  return config;
});

// log responses / errors
api.interceptors.response.use(
  (res) => {
    console.log(`[API] ← ${res.status} ${res.config.url}`, res.data);
    return res;
  },
  (err) => {
    const conf = err?.config || {};
    console.log(`[API] ✖ ${conf.method?.toUpperCase()} ${conf.baseURL || ''}${conf.url}`, {
      message: err?.message,
      code: err?.code,
      data: err?.response?.data,
    });
    return Promise.reject(err);
  }
);

// endpoints
export async function sendOtp(phone: string) {
  const { data } = await api.post('/otp/send', { phoneNumber: phone });
  return data;
}

export async function verifyOtp(phone: string, otp: string) {
  const { data } = await api.post('/otp/verify', { phoneNumber: phone, otp });
  return data;
}
