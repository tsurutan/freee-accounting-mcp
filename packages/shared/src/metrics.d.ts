/**
 * メトリクス・監視機能
 */
/// <reference types="node" />
export interface MetricEntry {
    name: string;
    value: number;
    timestamp: number;
    tags?: Record<string, string>;
}
export interface PerformanceMetrics {
    requestCount: number;
    errorCount: number;
    averageResponseTime: number;
    cacheHitRate: number;
    rateLimitHits: number;
    authenticationCount: number;
    lastRequestTime: number;
}
export interface SystemMetrics {
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: number;
    activeConnections: number;
}
export declare class MetricsCollector {
    private metrics;
    private readonly maxEntries;
    private readonly retentionPeriod;
    private performanceMetrics;
    private responseTimes;
    private startTime;
    recordMetric(name: string, value: number, tags?: Record<string, string>): void;
    private cleanupOldEntries;
    recordRequest(responseTime: number, isError?: boolean): void;
    recordCacheHit(isHit: boolean): void;
    recordRateLimitHit(): void;
    recordAuthentication(): void;
    getMetrics(name: string, since?: number): MetricEntry[];
    getPerformanceMetrics(): PerformanceMetrics;
    getSystemMetrics(): SystemMetrics;
    getAllMetricNames(): string[];
    getMetricsSummary(since?: number): Record<string, any>;
    reset(): void;
}
export declare class HealthChecker {
    private checks;
    addCheck(name: string, checkFunction: () => Promise<boolean>): void;
    runHealthChecks(): Promise<Record<string, boolean>>;
    isHealthy(): Promise<boolean>;
}
export declare class AlertManager {
    private alerts;
    private thresholds;
    checkAlerts(metrics: PerformanceMetrics, systemMetrics: SystemMetrics): void;
    private createAlert;
    getActiveAlerts(): {
        id: string;
        message: string;
        severity: "critical" | "error" | "info" | "warning";
        timestamp: number;
        resolved: boolean;
    }[];
    getAllAlerts(): {
        id: string;
        message: string;
        severity: "critical" | "error" | "info" | "warning";
        timestamp: number;
        resolved: boolean;
    }[];
    resolveAlert(id: string): void;
}
export declare const metricsCollector: MetricsCollector;
export declare const healthChecker: HealthChecker;
export declare const alertManager: AlertManager;
//# sourceMappingURL=metrics.d.ts.map