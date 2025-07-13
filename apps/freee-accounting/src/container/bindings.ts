/**
 * 依存関係の設定 - DIコンテナのバインディング
 */

import { Container } from 'inversify';
import { TYPES } from './types.js';

// 設定関連
import { EnvironmentConfig } from '../config/environment-config.js';
import { AppConfig } from '../config/app-config.js';

// ユーティリティ
import { ResponseBuilder } from '../utils/response-builder.js';
import { ErrorHandler } from '../utils/error-handler.js';
import { DateUtils } from '../utils/date-utils.js';
import { Validator } from '../utils/validator.js';

// インフラストラクチャ
import { Logger } from '../infrastructure/logger.js';
import { LoggerSetup } from '../infrastructure/logger-setup.js';
import { FreeeApiClient } from '../infrastructure/freee-api-client.js';
import { ApiResponseMapper } from '../infrastructure/api-response-mapper.js';
import { DebugInterceptor } from '../infrastructure/debug-interceptor.js';

// サービス
import { AuthService } from '../services/auth-service.js';

// ハンドラー
import { CompaniesResourceHandler } from '../handlers/companies-resource-handler.js';
import { DealsResourceHandler } from '../handlers/deals-resource-handler.js';
import { ResourceRegistry } from '../handlers/resource-registry.js';
import { AuthToolHandler } from '../handlers/auth-tool-handler.js';
import { DealToolHandler } from '../handlers/deal-tool-handler.js';
import { CompanyToolHandler } from '../handlers/company-tool-handler.js';
import { SystemToolHandler } from '../handlers/system-tool-handler.js';
import { InvoiceToolHandler } from '../handlers/invoice-tool-handler.js';
import { QuotationToolHandler } from '../handlers/quotation-tool-handler.js';
import { DeliverySlipToolHandler } from '../handlers/delivery-slip-tool-handler.js';
import { ToolRegistry } from '../handlers/tool-registry.js';

// サーバー
import { MCPServer } from '../server/mcp-server.js';
import { RequestHandlers } from '../server/request-handlers.js';
import { Middleware } from '../server/middleware.js';

// 外部ライブラリ（モック）
// import { FreeeClient, MetricsCollector, SecurityAuditor } from '@mcp-server/shared';

/**
 * 一時的なモッククラス（メトリクスとセキュリティ監査用）
 */

class MockMetricsCollector {
  increment(metric: string, value: number = 1) {}
  gauge(metric: string, value: number) {}
  histogram(metric: string, value: number) {}
}

class MockSecurityAuditor {
  logAccess(action: string, resource: string, user?: string) {}
  validateRequest(request: any): boolean { return true; }
}

/**
 * 依存関係の設定を実行
 */
export function configureBindings(container: Container): void {
  // 設定関連のバインディング
  configureConfigBindings(container);
  
  // ユーティリティのバインディング
  configureUtilityBindings(container);
  
  // インフラストラクチャのバインディング
  configureInfrastructureBindings(container);
  
  // サービスのバインディング
  configureServiceBindings(container);
  
  // ハンドラーのバインディング
  configureHandlerBindings(container);
  
  // サーバーのバインディング
  configureServerBindings(container);
}

/**
 * 設定関連のバインディング
 */
function configureConfigBindings(container: Container): void {
  container.bind(TYPES.EnvironmentConfig).to(EnvironmentConfig).inSingletonScope();
  container.bind(TYPES.AppConfig).to(AppConfig).inSingletonScope();
}

/**
 * ユーティリティのバインディング
 */
function configureUtilityBindings(container: Container): void {
  container.bind(TYPES.ResponseBuilder).to(ResponseBuilder).inSingletonScope();
  container.bind(TYPES.ErrorHandler).to(ErrorHandler).inSingletonScope();
  container.bind(TYPES.DateUtils).to(DateUtils).inSingletonScope();
  container.bind(TYPES.Validator).to(Validator).inSingletonScope();
}

/**
 * インフラストラクチャのバインディング
 */
function configureInfrastructureBindings(container: Container): void {
  container.bind(TYPES.Logger).to(Logger).inSingletonScope();
  container.bind(TYPES.LoggerSetup).to(LoggerSetup).inSingletonScope();
  container.bind(TYPES.FreeeApiClient).to(FreeeApiClient).inSingletonScope();
  container.bind(TYPES.ApiResponseMapper).to(ApiResponseMapper).inSingletonScope();
  container.bind(TYPES.DebugInterceptor).to(DebugInterceptor).inSingletonScope();
  
  // モッククラスのバインディング
  container.bind(TYPES.MetricsCollector).to(MockMetricsCollector).inSingletonScope();
  container.bind(TYPES.SecurityAuditor).to(MockSecurityAuditor).inSingletonScope();

  // 実際のFreeeApiClientを使用（FreeeClientインターフェースとして）
  container.bind(TYPES.FreeeClient).to(FreeeApiClient).inSingletonScope();
}

/**
 * サービスのバインディング
 */
function configureServiceBindings(container: Container): void {
  container.bind(TYPES.AuthService).to(AuthService).inSingletonScope();
}

/**
 * ハンドラーのバインディング
 */
function configureHandlerBindings(container: Container): void {
  // リソースハンドラー
  container.bind(TYPES.CompaniesResourceHandler).to(CompaniesResourceHandler).inSingletonScope();
  container.bind(TYPES.DealsResourceHandler).to(DealsResourceHandler).inSingletonScope();
  container.bind(TYPES.ResourceRegistry).to(ResourceRegistry).inSingletonScope();

  // ツールハンドラー
  container.bind(TYPES.AuthToolHandler).to(AuthToolHandler).inSingletonScope();
  container.bind(TYPES.DealToolHandler).to(DealToolHandler).inSingletonScope();
  container.bind(TYPES.CompanyToolHandler).to(CompanyToolHandler).inSingletonScope();
  container.bind(TYPES.SystemToolHandler).to(SystemToolHandler).inSingletonScope();
  container.bind(TYPES.InvoiceToolHandler).to(InvoiceToolHandler).inSingletonScope();
  container.bind(TYPES.QuotationToolHandler).to(QuotationToolHandler).inSingletonScope();
  container.bind(TYPES.DeliverySlipToolHandler).to(DeliverySlipToolHandler).inSingletonScope();
  container.bind(TYPES.ToolRegistry).to(ToolRegistry).inSingletonScope();
}

/**
 * サーバーのバインディング
 */
function configureServerBindings(container: Container): void {
  container.bind(TYPES.MCPServer).to(MCPServer).inSingletonScope();
  container.bind(TYPES.RequestHandlers).to(RequestHandlers).inSingletonScope();
  container.bind(TYPES.Middleware).to(Middleware).inSingletonScope();
}

/**
 * 開発環境用の追加バインディング
 */
export function configureDevBindings(container: Container): void {
  // 開発環境でのみ使用するサービスをここに追加
  // 例: テスト用のモック、デバッグツールなど
}

/**
 * プロダクション環境用の追加バインディング
 */
export function configureProdBindings(container: Container): void {
  // プロダクション環境でのみ使用するサービスをここに追加
  // 例: 本物のメトリクス収集、セキュリティ監査など
}
