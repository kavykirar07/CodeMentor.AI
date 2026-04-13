import crypto from 'crypto';

// In-memory cache fallback when Redis is unavailable
const memoryCache = new Map<string, { data: string; expires: number }>();

let redisClient: any = null;
let redisAvailable = false;

const TTL = 86400; // 24 hours in seconds

async function initRedis(): Promise<void> {
  try {
    const Redis = require('ioredis');
    redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
      connectTimeout: 3000,
      lazyConnect: true,
    });
    await redisClient.connect();
    redisAvailable = true;
    console.log('✅ Redis connected');
  } catch {
    console.log('⚠️  Redis unavailable — using in-memory cache');
    redisAvailable = false;
  }
}

// Initialize on import
initRedis().catch(() => {});

function generateKey(code: string, language: string): string {
  const hash = crypto.createHash('sha256').update(`${language}:${code}`).digest('hex');
  return `codementor:analysis:${hash}`;
}

export async function getCachedAnalysis(code: string, language: string): Promise<string | null> {
  const key = generateKey(code, language);

  if (redisAvailable && redisClient) {
    try {
      return await redisClient.get(key);
    } catch {
      // Fallback to memory
    }
  }

  const entry = memoryCache.get(key);
  if (entry && entry.expires > Date.now()) {
    return entry.data;
  }
  memoryCache.delete(key);
  return null;
}

export async function setCachedAnalysis(code: string, language: string, analysis: string): Promise<void> {
  const key = generateKey(code, language);

  if (redisAvailable && redisClient) {
    try {
      await redisClient.setex(key, TTL, analysis);
      return;
    } catch {
      // Fallback to memory
    }
  }

  memoryCache.set(key, { data: analysis, expires: Date.now() + TTL * 1000 });
}
