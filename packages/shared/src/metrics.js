/**
 * メトリクス・監視機能
 */
export class MetricsCollector {
    metrics = new Map();
    maxEntries = 1000;
    retentionPeriod = 24 * 60 * 60 * 1000; // 24 hours
    performanceMetrics = {
        requestCount: 0,
        errorCount: 0,
        averageResponseTime: 0,
        cacheHitRate: 0,
        rateLimitHits: 0,
        authenticationCount: 0,
        lastRequestTime: 0,
    };
    responseTimes = [];
    startTime = Date.now();
    recordMetric(name, value, tags) {
        const entry = {
            name,
            value,
            timestamp: Date.now(),
            tags,
        };
        if (!this.metrics.has(name)) {
            this.metrics.set(name, []);
        }
        const entries = this.metrics.get(name);
        entries.push(entry);
        // エントリ数制限
        if (entries.length > this.maxEntries) {
            entries.splice(0, entries.length - this.maxEntries);
        }
        // 古いエントリを削除
        this.cleanupOldEntries(name);
    }
    cleanupOldEntries(metricName) {
        const entries = this.metrics.get(metricName);
        if (!entries)
            return;
        const cutoff = Date.now() - this.retentionPeriod;
        const validEntries = entries.filter(entry => entry.timestamp > cutoff);
        this.metrics.set(metricName, validEntries);
    }
    recordRequest(responseTime, isError = false) {
        this.performanceMetrics.requestCount++;
        this.performanceMetrics.lastRequestTime = Date.now();
        if (isError) {
            this.performanceMetrics.errorCount++;
        }
        // レスポンス時間の記録
        this.responseTimes.push(responseTime);
        if (this.responseTimes.length > 100) {
            this.responseTimes.shift();
        }
        // 平均レスポンス時間の更新
        this.performanceMetrics.averageResponseTime =
            this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length;
        this.recordMetric('request_count', this.performanceMetrics.requestCount);
        this.recordMetric('response_time', responseTime);
        if (isError) {
            this.recordMetric('error_count', this.performanceMetrics.errorCount);
        }
    }
    recordCacheHit(isHit) {
        const totalRequests = this.performanceMetrics.requestCount;
        if (totalRequests > 0) {
            // 簡易的なキャッシュヒット率計算
            this.recordMetric('cache_hit', isHit ? 1 : 0);
        }
    }
    recordRateLimitHit() {
        this.performanceMetrics.rateLimitHits++;
        this.recordMetric('rate_limit_hits', this.performanceMetrics.rateLimitHits);
    }
    recordAuthentication() {
        this.performanceMetrics.authenticationCount++;
        this.recordMetric('authentication_count', this.performanceMetrics.authenticationCount);
    }
    getMetrics(name, since) {
        const entries = this.metrics.get(name) || [];
        if (since) {
            return entries.filter(entry => entry.timestamp >= since);
        }
        return [...entries];
    }
    getPerformanceMetrics() {
        return { ...this.performanceMetrics };
    }
    getSystemMetrics() {
        return {
            uptime: Date.now() - this.startTime,
            memoryUsage: process.memoryUsage(),
            cpuUsage: process.cpuUsage().user / 1000000,
            activeConnections: 0, // プレースホルダー
        };
    }
    getAllMetricNames() {
        return Array.from(this.metrics.keys());
    }
    getMetricsSummary(since) {
        const summary = {};
        for (const name of this.getAllMetricNames()) {
            const entries = this.getMetrics(name, since);
            if (entries.length > 0) {
                const values = entries.map(e => e.value);
                const latestEntry = entries[entries.length - 1];
                summary[name] = {
                    count: entries.length,
                    min: Math.min(...values),
                    max: Math.max(...values),
                    avg: values.reduce((sum, val) => sum + val, 0) / values.length,
                    latest: latestEntry?.value || 0,
                    latestTimestamp: latestEntry?.timestamp || 0,
                };
            }
        }
        return summary;
    }
    reset() {
        this.metrics.clear();
        this.performanceMetrics = {
            requestCount: 0,
            errorCount: 0,
            averageResponseTime: 0,
            cacheHitRate: 0,
            rateLimitHits: 0,
            authenticationCount: 0,
            lastRequestTime: 0,
        };
        this.responseTimes = [];
        this.startTime = Date.now();
    }
}
export class HealthChecker {
    checks = new Map();
    addCheck(name, checkFunction) {
        this.checks.set(name, checkFunction);
    }
    async runHealthChecks() {
        const results = {};
        for (const [name, checkFn] of this.checks.entries()) {
            try {
                results[name] = await checkFn();
            }
            catch (error) {
                results[name] = false;
            }
        }
        return results;
    }
    async isHealthy() {
        const results = await this.runHealthChecks();
        return Object.values(results).every(result => result === true);
    }
}
export class AlertManager {
    alerts = [];
    thresholds = {
        errorRate: 0.1,
        responseTime: 5000,
        memoryUsage: 0.9, // 90%
    };
    checkAlerts(metrics, systemMetrics) {
        // エラー率チェック
        if (metrics.requestCount > 0) {
            const errorRate = metrics.errorCount / metrics.requestCount;
            if (errorRate > this.thresholds.errorRate) {
                this.createAlert('high_error_rate', `High error rate detected: ${(errorRate * 100).toFixed(1)}%`, 'error');
            }
        }
        // レスポンス時間チェック
        if (metrics.averageResponseTime > this.thresholds.responseTime) {
            this.createAlert('slow_response', `Slow response time: ${metrics.averageResponseTime.toFixed(0)}ms`, 'warning');
        }
        // メモリ使用量チェック
        const memoryUsageRatio = systemMetrics.memoryUsage.heapUsed / systemMetrics.memoryUsage.heapTotal;
        if (memoryUsageRatio > this.thresholds.memoryUsage) {
            this.createAlert('high_memory_usage', `High memory usage: ${(memoryUsageRatio * 100).toFixed(1)}%`, 'warning');
        }
    }
    createAlert(id, message, severity) {
        // 既存のアラートをチェック
        const existingAlert = this.alerts.find(alert => alert.id === id && !alert.resolved);
        if (existingAlert) {
            return; // 既に同じアラートが存在
        }
        this.alerts.push({
            id,
            message,
            severity,
            timestamp: Date.now(),
            resolved: false,
        });
        // アラート数制限
        if (this.alerts.length > 100) {
            this.alerts = this.alerts.slice(-100);
        }
    }
    getActiveAlerts() {
        return this.alerts.filter(alert => !alert.resolved);
    }
    getAllAlerts() {
        return [...this.alerts];
    }
    resolveAlert(id) {
        const alert = this.alerts.find(alert => alert.id === id && !alert.resolved);
        if (alert) {
            alert.resolved = true;
        }
    }
}
// グローバルインスタンス
export const metricsCollector = new MetricsCollector();
export const healthChecker = new HealthChecker();
export const alertManager = new AlertManager();
//# sourceMappingURL=metrics.js.map