import { app } from './app';
import { env } from './config/env';

const server = Bun.serve({
  port: env.PORT,
  fetch: app.fetch,
});

console.log(`🚀 OTLS backend listening on http://localhost:${server.port}`);
console.log(`   health: http://localhost:${server.port}/health`);
console.log(`   env:    ${env.NODE_ENV}`);

// Graceful shutdown so in-flight requests finish before the process exits.
process.on('SIGTERM', () => {
  console.log('SIGTERM received, stopping server');
  server.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, stopping server');
  server.stop();
  process.exit(0);
});
