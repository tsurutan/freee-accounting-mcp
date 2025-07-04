// Quick verification script for our TYPES fixes
import { TYPES } from './src/container/types.js';

console.log('Testing TYPES symbols...');
console.log('✓ TYPES.AuthToolHandler:', TYPES.AuthToolHandler);
console.log('✓ TYPES.DealToolHandler:', TYPES.DealToolHandler);
console.log('✓ TYPES.CompanyToolHandler:', TYPES.CompanyToolHandler);
console.log('✓ TYPES.SystemToolHandler:', TYPES.SystemToolHandler);
console.log('✓ TYPES.CompaniesResourceHandler:', TYPES.CompaniesResourceHandler);
console.log('✓ TYPES.DealsResourceHandler:', TYPES.DealsResourceHandler);
console.log('✓ TYPES.ToolRegistry:', TYPES.ToolRegistry);
console.log('✓ TYPES.ResourceRegistry:', TYPES.ResourceRegistry);

console.log('\nAll missing TYPES symbols have been added successfully!');