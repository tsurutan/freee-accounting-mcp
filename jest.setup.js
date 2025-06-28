// Jest setup file
// Global test configuration

// Set test timeout
jest.setTimeout(30000);

// Mock environment variables
process.env.FREEE_CLIENT_ID = 'test_client_id';
process.env.FREEE_CLIENT_SECRET = 'test_client_secret';
process.env.FREEE_REDIRECT_URI = 'http://localhost:3000/callback';
process.env.FREEE_API_BASE_URL = 'https://api.freee.co.jp';
