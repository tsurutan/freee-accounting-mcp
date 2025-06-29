/**
 * 依存性注入コンテナの設定
 */

import 'reflect-metadata';
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

// サービス
import { AuthService } from '../services/auth-service.js';

// 外部ライブラリ
import { FreeeClient, MetricsCollector, SecurityAuditor } from '@mcp-server/shared';

/**
 * DIコンテナを作成・設定
 */
export function createContainer(): Container {
  const container = new Container();

  // 設定
  container.bind(TYPES.EnvironmentConfig).to(EnvironmentConfig).inSingletonScope();
  container.bind(TYPES.AppConfig).to(AppConfig).inSingletonScope();

  // ユーティリティ
  container.bind(TYPES.ResponseBuilder).to(ResponseBuilder).inSingletonScope();
  container.bind(TYPES.ErrorHandler).to(ErrorHandler).inSingletonScope();
  container.bind(TYPES.DateUtils).to(DateUtils).inSingletonScope();
  container.bind(TYPES.Validator).to(Validator).inSingletonScope();

  // インフラストラクチャ
  container.bind(TYPES.Logger).to(Logger).inSingletonScope();
  container.bind(TYPES.MetricsCollector).to(MetricsCollector).inSingletonScope();
  container.bind(TYPES.SecurityAuditor).to(SecurityAuditor).inSingletonScope();

  // FreeeClient（設定に基づいて動的に作成）
  container.bind(TYPES.FreeeClient).toDynamicValue((context) => {
    const envConfig = context.container.get<EnvironmentConfig>(TYPES.EnvironmentConfig);
    const appConfig = context.container.get<AppConfig>(TYPES.AppConfig);

    return new FreeeClient({
      baseURL: appConfig.baseUrl,
      accessToken: envConfig.useDirectToken ? envConfig.accessToken : undefined,
      oauthClient: envConfig.oauthClient,
      maxRetries: 3,
      retryDelay: 1000,
      enableCache: true,
      cacheTtl: 5 * 60 * 1000, // 5分
    });
  }).inSingletonScope();

  // サービス
  container.bind(TYPES.AuthService).to(AuthService).inSingletonScope();

  return container;
}

// グローバルコンテナインスタンス
export const container = createContainer();
