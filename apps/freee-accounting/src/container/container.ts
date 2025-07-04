/**
 * 依存性注入コンテナの設定（後方互換性のため）
 *
 * @deprecated 新しいコードでは service-container.ts を使用してください
 */

import 'reflect-metadata';
import { serviceContainer } from './service-container.js';

/**
 * 後方互換性のためのエクスポート
 */
export const container = serviceContainer.getContainer();
export const createContainer = () => serviceContainer.getContainer();
