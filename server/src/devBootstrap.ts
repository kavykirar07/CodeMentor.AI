/**
 * devBootstrap.ts
 *
 * Automatically starts mongodb-memory-server on port 27017 when
 * MONGODB_URI points to localhost (no Atlas credentials needed).
 *
 * - Uses the existing MONGODB_URI if it points to localhost → boots MongoMemoryServer
 * - Skips entirely if MONGODB_URI is an Atlas/remote URI
 * - Data resets on every restart — intentional for dev
 */

import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGODB_URI ?? '';
const IS_LOCAL = uri.includes('127.0.0.1') || uri.includes('localhost');
const IS_DEV   = (process.env.NODE_ENV ?? 'development') !== 'production';

export async function bootstrapDevDB(): Promise<void> {
  if (!IS_DEV || !IS_LOCAL) {
    console.log(`[devBootstrap] Using remote DB: ${uri.slice(0, 40)}...`);
    return;
  }

  console.log('\n🔧  [devBootstrap] Local MongoDB URI detected — starting mongodb-memory-server...');

  try {
    const { MongoMemoryServer } = await import('mongodb-memory-server');

    const port = 27017;
    const mongod = await MongoMemoryServer.create({
      instance: { port, dbName: 'codementor' },
    });

    const memUri = mongod.getUri();
    // Patch the env so that connectDB (which reads process.env) picks it up
    process.env.MONGODB_URI = memUri;

    console.log(`✅  [devBootstrap] In-memory MongoDB running at: ${memUri}`);
    console.log('    ⚠️  Data resets on restart — set an Atlas URI in .env to persist.\n');

    process.on('exit',   () => { mongod.stop().catch(() => {}); });
    process.on('SIGINT',  () => mongod.stop().then(() => process.exit(0)).catch(() => process.exit(1)));
    process.on('SIGTERM', () => mongod.stop().then(() => process.exit(0)).catch(() => process.exit(1)));
  } catch (err) {
    console.error('❌  [devBootstrap] Failed to start in-memory MongoDB:', err);
    console.error('    Try: npm install mongodb-memory-server --save-dev');
    process.exit(1);
  }
}
