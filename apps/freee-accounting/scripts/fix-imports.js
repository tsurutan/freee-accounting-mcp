#!/usr/bin/env node
/* eslint-env node */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the dist directory path
const distDir = path.join(__dirname, '..', 'dist');

// Function to recursively find all .js files
function findJsFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...findJsFiles(fullPath));
    } else if (item.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Function to fix imports in a file
function fixImports(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Fix relative imports: add .js extension
  const fixedContent = content.replace(
    /from\s+['"](\.[^'"]*?)['"];?/g,
    (match, importPath) => {
      // Skip if already has extension
      if (importPath.endsWith('.js') || importPath.endsWith('.json')) {
        return match;
      }
      
      // Add .js extension
      return match.replace(importPath, `${importPath}.js`);
    }
  );
  
  // Also fix dynamic imports
  const fullyFixedContent = fixedContent.replace(
    /import\s*\(\s*['"](\.[^'"]*?)['"][\s)]/g,
    (match, importPath) => {
      // Skip if already has extension
      if (importPath.endsWith('.js') || importPath.endsWith('.json')) {
        return match;
      }
      
      // Add .js extension
      return match.replace(importPath, `${importPath}.js`);
    }
  );
  
  // Write back if changed
  if (fullyFixedContent !== content) {
    fs.writeFileSync(filePath, fullyFixedContent);
    console.log(`Fixed imports in: ${path.relative(distDir, filePath)}`);
  }
}

// Main execution
try {
  if (!fs.existsSync(distDir)) {
    console.error('dist directory not found. Run TypeScript compilation first.');
    process.exit(1);
  }
  
  const jsFiles = findJsFiles(distDir);
  console.log(`Found ${jsFiles.length} JavaScript files to process...`);
  
  for (const file of jsFiles) {
    fixImports(file);
  }
  
  console.log('Import fixing completed.');
} catch (error) {
  console.error('Error fixing imports:', error);
  process.exit(1);
}