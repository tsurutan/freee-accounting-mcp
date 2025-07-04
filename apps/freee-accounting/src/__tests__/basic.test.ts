/**
 * 基本的なテスト - 動作確認用
 */

import 'reflect-metadata';

describe('基本テスト', () => {
  test('基本的な計算が動作する', () => {
    expect(1 + 1).toBe(2);
  });

  test('文字列操作が動作する', () => {
    expect('hello'.toUpperCase()).toBe('HELLO');
  });

  test('配列操作が動作する', () => {
    const arr = [1, 2, 3];
    expect(arr.length).toBe(3);
    expect(arr.includes(2)).toBe(true);
  });

  test('オブジェクト操作が動作する', () => {
    const obj = { name: 'test', value: 123 };
    expect(obj.name).toBe('test');
    expect(obj.value).toBe(123);
  });

  test('非同期処理が動作する', async () => {
    const promise = Promise.resolve('success');
    const result = await promise;
    expect(result).toBe('success');
  });

  test('reflect-metadataが読み込まれている', () => {
    expect(Reflect.getMetadata).toBeDefined();
  });
});
