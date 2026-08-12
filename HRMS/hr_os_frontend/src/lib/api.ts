import axios, { AxiosError, InternalAxiosRequestConfig, AxiosInstance, AxiosRequestConfig } from "axios";
import { toast } from "sonner";
import type { APIResponse } from "@/lib/types";

// Custom type to reflect that our interceptor unwraps the data
interface UnwrappedAxiosInstance extends Omit<AxiosInstance, 'get' | 'post' | 'put' | 'patch' | 'delete'> {
  get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>;
  post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>;
  put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>;
  patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>;
  delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>;
}

const baseApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000",
  headers: { "Content-Type": "application/json" },
});

// REQUEST interceptor — attach JWT
baseApi.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// RESPONSE interceptor — global error handling & unwrapping
baseApi.interceptors.response.use(
  (response) => {
    // If backend returned our standard wrapper { success, data, error }
    if (response.data && typeof response.data === "object" && "success" in response.data) {
      if (!response.data.success) {
        return Promise.reject({
          message: response.data.error || "API Business Logic Error",
          status: response.status
        });
      }
      
      // Unwrap to the data payload directly.
      // This matches the UnwrappedAxiosInstance type definition at the top of this file.
      // If there's a total_count, we might want to keep the envelope, 
      // but most components just want the array/object in .data.
      return response.data.data;
    }
    
    // Fallback for non-standard responses
    return response.data;
  },
  (error: AxiosError<APIResponse>) => {
    const errorMsg = error.response?.data?.error || error.message || "An unexpected error occurred";
    const status = error.response?.status;

    if (status === 401) {
      localStorage.removeItem("token");
      toast.error("Session expired. Please log in again.");
      if (window.location.pathname !== "/login") {
        window.location.replace("/login");
      }
    } else if (status === 403) {
      toast.error("Access Denied: You don't have permission for this action.");
    } else {
      toast.error(errorMsg);
    }

    return Promise.reject(error);
  }
);

const api = baseApi as unknown as UnwrappedAxiosInstance;
export default api;
