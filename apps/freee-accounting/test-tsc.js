#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';

console.log('Starting TypeScript compilation test...');

// Clean dist
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true, force: true });
  console.log('Cleaned dist directory');
}

// Clean build info
if (fs.existsSync('tsconfig.tsbuildinfo')) {
  fs.rmSync('tsconfig.tsbuildinfo');
  console.log('Cleaned tsconfig.tsbuildinfo');
}

// Run TypeScript compilation
try {
  console.log('Running TypeScript compilation...');
  const result = execSync('npx tsc', { encoding: 'utf8', stdio: 'pipe' });
  console.log('TypeScript output:', result);
  
  // Check if dist was created
  if (fs.existsSync('dist')) {
    console.log('dist directory was created!');
    const files = fs.readdirSync('dist');
    console.log('Files in dist:', files.slice(0, 10)); // Show first 10 files
  } else {
    console.log('dist directory was NOT created');
  }
} catch (error) {
  console.error('TypeScript compilation failed:', error.message);
  console.error('Error output:', error.stdout ? error.stdout.toString() : 'No stdout');
  console.error('Error stderr:', error.stderr ? error.stderr.toString() : 'No stderr');
}