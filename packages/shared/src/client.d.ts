/**
 * freee API クライアント
 */
import { AxiosRequestConfig } from 'axios';
import { FreeeCompaniesResponse, FreeeDealsResponse, FreeeAccountItemsResponse, FreeePartnersResponse, FreeeSectionsResponse, FreeeItemsResponse, FreeeTagsResponse, FreeeTrialBalanceResponse } from '@mcp-server/types';
import { FreeeOAuthClient } from './auth';
interface RateLimitInfo {
    limit: number;
    remaining: number;
    resetTime: number;
}
export interface FreeeClientConfig {
    baseURL?: string;
    accessToken?: string;
    timeout?: number;
    oauthClient?: FreeeOAuthClient;
    maxRetries?: number;
    retryDelay?: number;
    enableCache?: boolean;
    cacheTtl?: number;
}
export declare class FreeeClient {
    private client;
    private accessToken?;
    private oauthClient?;
    private rateLimiter;
    private retryConfig;
    private cache?;
    private enableCache;
    private cacheTtl;
    constructor(config?: FreeeClientConfig);
    setAccessToken(token: string): void;
    setOAuthClient(oauthClient: FreeeOAuthClient): void;
    getOAuthClient(): FreeeOAuthClient | undefined;
    get<T>(url: string, config?: AxiosRequestConfig): Promise<T>;
    post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>;
    put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>;
    delete<T>(url: string, config?: AxiosRequestConfig): Promise<T>;
    getRateLimitInfo(): RateLimitInfo | null;
    getCacheStats(): import("./cache").CacheStats | null;
    clearCache(): void;
    invalidateCache(pattern?: string): void;
    getCompanies(): Promise<FreeeCompaniesResponse>;
    getDeals(params: {
        company_id: number;
        start_issue_date?: string;
        end_issue_date?: string;
        limit?: number;
        offset?: number;
    }): Promise<FreeeDealsResponse>;
    getAccountItems(companyId: number): Promise<FreeeAccountItemsResponse>;
    getPartners(companyId: number): Promise<FreeePartnersResponse>;
    getSections(companyId: number): Promise<FreeeSectionsResponse>;
    getItems(companyId: number): Promise<FreeeItemsResponse>;
    getTags(companyId: number): Promise<FreeeTagsResponse>;
    getTrialBalance(params: {
        company_id: number;
        fiscal_year?: number;
        start_month?: number;
        end_month?: number;
    }): Promise<FreeeTrialBalanceResponse>;
    private executeWithRetry;
}
export {};
//# sourceMappingURL=client.d.ts.map