/**
 * freee API クライアント
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { FreeeApiResponse, FreeeError } from '@mcp-server/types';

export interface FreeeClientConfig {
  baseURL?: string;
  accessToken?: string;
  timeout?: number;
}

export class FreeeClient {
  private client: AxiosInstance;
  private accessToken?: string;

  constructor(config: FreeeClientConfig = {}) {
    this.accessToken = config.accessToken;
    
    this.client = axios.create({
      baseURL: config.baseURL || 'https://api.freee.co.jp',
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // リクエストインターセプター
    this.client.interceptors.request.use((config) => {
      if (this.accessToken) {
        config.headers.Authorization = `Bearer ${this.accessToken}`;
      }
      return config;
    });

    // レスポンスインターセプター
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.data) {
          throw new FreeeError(
            error.response.data.message || 'API Error',
            error.response.status,
            error.response.data.errors
          );
        }
        throw error;
      }
    );
  }

  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<FreeeApiResponse<T>> {
    const response = await this.client.get(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<FreeeApiResponse<T>> {
    const response = await this.client.post(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<FreeeApiResponse<T>> {
    const response = await this.client.put(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<FreeeApiResponse<T>> {
    const response = await this.client.delete(url, config);
    return response.data;
  }
}
