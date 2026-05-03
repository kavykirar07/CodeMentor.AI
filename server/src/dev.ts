/**
 * Development entry point.
 *
 * Execution order:
 *   1. devBootstrap loads .env via dotenv
 *   2. If MONGODB_URI is localhost → starts MongoMemoryServer, patches process.env
 *   3. Dynamic import of app.ts (which runs Zod config validation)
 *   4. Server starts and connectDB() picks up the patched URI
 */
import { bootstrapDevDB } from './devBootstrap';

(async () => {
  await bootstrapDevDB();
  await import('./app');
})();
