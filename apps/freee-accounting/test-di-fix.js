/**
 * Quick test to verify DI container bindings are working
 */

import 'reflect-metadata';
import { ServiceContainer } from './src/container/service-container.js';
import { TYPES } from './src/container/types.js';

// Test the fix
console.log('Testing DI container bindings...\n');

const container = new ServiceContainer();

// Test generic handlers should fail if used incorrectly
try {
  const genericHandler = container.get(TYPES.ToolHandler);
  console.log('❌ ERROR: Generic TYPES.ToolHandler should not be bound');
} catch (error) {
  console.log('✅ GOOD: Generic TYPES.ToolHandler is not bound (as expected)');
}

// Test specific handlers should work
try {
  const dealHandler = container.get(TYPES.DealToolHandler);
  console.log('✅ GOOD: TYPES.DealToolHandler is properly bound');
} catch (error) {
  console.log('❌ ERROR: TYPES.DealToolHandler failed to resolve:', error.message);
}

try {
  const companyHandler = container.get(TYPES.CompanyToolHandler);
  console.log('✅ GOOD: TYPES.CompanyToolHandler is properly bound');
} catch (error) {
  console.log('❌ ERROR: TYPES.CompanyToolHandler failed to resolve:', error.message);
}

try {
  const authHandler = container.get(TYPES.AuthToolHandler);
  console.log('✅ GOOD: TYPES.AuthToolHandler is properly bound');
} catch (error) {
  console.log('❌ ERROR: TYPES.AuthToolHandler failed to resolve:', error.message);
}

try {
  const systemHandler = container.get(TYPES.SystemToolHandler);
  console.log('✅ GOOD: TYPES.SystemToolHandler is properly bound');
} catch (error) {
  console.log('❌ ERROR: TYPES.SystemToolHandler failed to resolve:', error.message);
}

console.log('\nDI container test complete!');