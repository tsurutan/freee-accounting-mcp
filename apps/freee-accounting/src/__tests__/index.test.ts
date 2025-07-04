/**
 * freee会計 MCP Server 基本テスト
 */

import 'reflect-metadata';

describe('freee会計 MCP Server', () => {
  describe('基本機能', () => {
    test('環境変数が設定される', () => {
      process.env.FREEE_CLIENT_ID = 'test-client-id';
      expect(process.env.FREEE_CLIENT_ID).toBe('test-client-id');
    });

    test('基本的な計算が動作する', () => {
      expect(1 + 1).toBe(2);
    });

    test('reflect-metadataが正常に読み込まれる', () => {
      expect(Reflect.getMetadata).toBeDefined();
    });
  });
});
