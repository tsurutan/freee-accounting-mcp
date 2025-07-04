# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Commands
- `npm run build` - Build all packages using Turbo
- `npm run dev` - Run in development mode with hot reload
- `npm run test` - Run all tests across packages
- `npm run lint` - Run ESLint on all packages
- `npm run type-check` - Run TypeScript type checking

### Package-Specific Commands (freee-accounting)
- `npm run dev --workspace=freee-accounting-mcp` - Run freee-accounting in dev mode
- `npm run test:unit --workspace=freee-accounting-mcp` - Run unit tests only
- `npm run test:integration --workspace=freee-accounting-mcp` - Run integration tests
- `npm run test:e2e --workspace=freee-accounting-mcp` - Run end-to-end tests
- `npm run test:coverage --workspace=freee-accounting-mcp` - Run tests with coverage

### MCP Inspector Commands
- `npm run debug` - Debug with MCP Inspector using TypeScript source
- `npm run debug:build` - Debug with MCP Inspector using built JavaScript
- `npm run inspect` - Alternative command for MCP Inspector
- `npm run inspect:build` - Alternative command for built version

### Test Phase Commands
- `npm run test:phase0` through `npm run test:phase6` - Run specific development phase tests
- `npm run test:get-deals` - Run get-deals functionality tests
- `npm run test:get-deals-unit` - Run unit tests for deal handler
- `npm run test:get-deals-integration` - Run integration tests for deals
- `npm run test:get-deals-e2e` - Run end-to-end tests for deals (set RUN_E2E_TESTS=true)

## Project Architecture

### Monorepo Structure
- **apps/freee-accounting**: Main MCP server application
- **packages/shared**: Shared utilities and authentication logic
- **packages/types**: Common type definitions

### Main Application Architecture (freee-accounting)
The application follows clean architecture principles with dependency injection:

#### Core Layers
- **Presentation Layer**: MCP Server handlers for tools, resources, and prompts
- **Application Layer**: Business logic services and use cases
- **Infrastructure Layer**: External API clients and utilities
- **Domain Layer**: Core business entities and value objects

#### Key Components
- **MCPServer**: Main entry point handling MCP protocol communication
- **ServiceContainer**: Dependency injection container using InversifyJS
- **FreeeApiClient**: HTTP client for freee API with retry logic and rate limiting
- **AuthService**: Handles OAuth and token-based authentication
- **Handler Registry**: Manages tool, resource, and prompt handlers

#### Configuration System
- **EnvironmentConfig**: Environment variable validation and configuration
- **AppConfig**: Application-level configuration using Convict
- Uses separate configs for OAuth and general app settings

#### Error Handling
- Uses `neverthrow` Result type for functional error handling
- Structured error responses with proper error codes
- Comprehensive error logging with Winston

#### Testing Strategy
- **Unit Tests**: Test individual components in isolation
- **Integration Tests**: Test service interactions
- **E2E Tests**: Test full MCP protocol flows
- Uses Jest with ES Module support
- Extensive mocking with Sinon and Nock

### Key Development Patterns

#### Dependency Injection
All services are registered in the DI container with typed symbols:
```typescript
// Register services
container.bind<AuthService>(TYPES.AuthService).to(AuthService);
// Inject dependencies
constructor(@inject(TYPES.AuthService) private authService: AuthService) {}
```

#### Result Pattern
Functions return Result types for explicit error handling:
```typescript
const result = await service.doSomething();
if (result.isOk()) {
  // Handle success
} else {
  // Handle error
}
```

#### Handler Pattern
MCP handlers extend base classes for consistent behavior:
- `BaseToolHandler` for tool implementations
- `BaseResourceHandler` for resource providers
- Handlers are registered in registries for automatic discovery

### Authentication Flow
1. Support for both OAuth 2.0 and direct token authentication
2. Token persistence and automatic refresh
3. Company selection during OAuth flow
4. Secure token storage with encryption

### API Integration
- Rate limiting with exponential backoff
- Request/response logging for debugging
- Comprehensive error mapping from freee API
- Caching for frequently accessed data

### Development Environment
- Full ES Module support (type: "module")
- TypeScript with strict type checking
- Prettier for code formatting
- ESLint for code quality
- Uses tsx for TypeScript execution in development

### Environment Setup
Create `.env` file with:
```env
# Required for OAuth
FREEE_CLIENT_ID=your_client_id
FREEE_CLIENT_SECRET=your_client_secret
FREEE_REDIRECT_URI=http://localhost:3000/callback

# OR for direct token auth
FREEE_ACCESS_TOKEN=your_access_token

# Optional
FREEE_API_BASE_URL=https://api.freee.co.jp
DEBUG=true
LOG_LEVEL=debug
```

### Build Process
- Turbo for monorepo build orchestration
- TypeScript compilation to ES modules
- Automatic import extension resolution
- Build artifacts in `dist/` directories

### MCP Protocol Implementation
- Supports tools, resources, and prompts
- Comprehensive error handling and validation
- Structured logging for debugging
- Built-in health checks and metrics