#!/usr/bin/env node

/**
 * ES Module インポートの拡張子を修正するスクリプト
 */

const fs = require('fs');
const path = require('path');

function fixImportsInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');

  // 相対インポートに .js 拡張子を追加
  const fixedContent = content.replace(
    /from\s+['"](\.\/.+?)['"];/g,
    (match, importPath) => {
      // 既に拡張子がある場合はそのまま
      if (importPath.endsWith('.js') || importPath.endsWith('.d.ts')) {
        return match;
      }
      return match.replace(importPath, importPath + '.js');
    }
  );

  // export文も修正
  const finalContent = fixedContent.replace(
    /export\s+\*\s+from\s+['"](\.\/.+?)['"];/g,
    (match, importPath) => {
      // 既に拡張子がある場合はそのまま
      if (importPath.endsWith('.js') || importPath.endsWith('.d.ts')) {
        return match;
      }
      return match.replace(importPath, importPath + '.js');
    }
  );

  if (content !== finalContent) {
    fs.writeFileSync(filePath, finalContent, 'utf8');
    console.log(`Fixed imports in: ${filePath}`);
  }
}

function processDirectory(dirPath) {
  const items = fs.readdirSync(dirPath);

  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (item.endsWith('.js')) {
      fixImportsInFile(fullPath);
    }
  }
}

// packages/shared/dist ディレクトリを処理
const distPath = path.join(__dirname, '../packages/shared/dist');
if (fs.existsSync(distPath)) {
  console.log('Fixing ES Module imports in packages/shared/dist...');
  processDirectory(distPath);
  console.log('Done!');
} else {
  console.warn('packages/shared/dist directory not found, skipping ESM import fixes');
  // エラーで終了せず、警告のみ表示
}
