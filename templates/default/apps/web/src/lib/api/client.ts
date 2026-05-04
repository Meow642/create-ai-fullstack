import axios, { type AxiosError, type AxiosRequestConfig } from 'axios';
import { toast } from 'sonner';
import { ApiError } from './types';

type ErrorBody = { error?: string };

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE ?? 'http://localhost:3000',
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  (response) => (response.status === 204 ? null : response.data),
  (error: AxiosError<ErrorBody>) => {
    const status = error.response?.status;
    const message = error.response?.data?.error ?? error.message ?? 'Network error';
    if (error.code !== 'ERR_CANCELED') {
      toast.error(message);
    }
    return Promise.reject(new ApiError(message, status, error));
  },
);

export const http = {
  get<T>(url: string, config?: AxiosRequestConfig) {
    return api.get<T, T>(url, config);
  },
  post<T>(url: string, data?: unknown, config?: AxiosRequestConfig) {
    return api.post<T, T>(url, data, config);
  },
  patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig) {
    return api.patch<T, T>(url, data, config);
  },
  delete<T = null>(url: string, config?: AxiosRequestConfig) {
    return api.delete<T, T>(url, config);
  },
};
