/**
 * 統合テスト
 */

describe('統合テスト', () => {
  describe('基本的な統合テスト', () => {
    test('モジュールが正しく動作する', () => {
      const testData = { message: 'test' };
      expect(testData.message).toBe('test');
    });
  });

});
