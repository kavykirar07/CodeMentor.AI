import crypto from 'crypto';
import logger from '../logger';

// ── Shared Redis Client ────────────────────────────────────────────────────────
const memoryCache = new Map<string, { data: string; expires: number }>();
const memConvStore = new Map<string, { messages: ConvMessage[]; expires: number }>();
const memStruggleStore = new Map<string, { count: number; expires: number }>();

let redisClient: any = null;
let redisAvailable = false;

const TTL_ANALYSIS  = 86_400;   // 24 h
const TTL_CONV      = 1_800;    // 30 min
const TTL_STRUGGLE  = 2_592_000; // 30 days

async function initRedis(): Promise<void> {
  try {
    const Redis = require('ioredis');
    redisClient = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
      connectTimeout: 3_000,
      lazyConnect: true,
    });
    await redisClient.connect();
    redisAvailable = true;
    logger.info('✅ Redis connected');
  } catch {
    logger.warn('⚠️  Redis unavailable — using in-memory cache');
    redisAvailable = false;
  }
}
initRedis().catch(() => {});

export function getRedisClient(): { client: any; available: boolean } {
  return { client: redisClient, available: redisAvailable };
}

// ── Analysis Cache ─────────────────────────────────────────────────────────────
function analysisKey(code: string, language: string): string {
  return `codementor:analysis:${crypto.createHash('sha256').update(`${language}:${code}`).digest('hex')}`;
}

export async function getCachedAnalysis(code: string, language: string): Promise<string | null> {
  const key = analysisKey(code, language);
  if (redisAvailable && redisClient) {
    try { return await redisClient.get(key); } catch { /* fall */ }
  }
  const e = memoryCache.get(key);
  if (e && e.expires > Date.now()) return e.data;
  memoryCache.delete(key);
  return null;
}

export async function setCachedAnalysis(code: string, language: string, data: string): Promise<void> {
  const key = analysisKey(code, language);
  if (redisAvailable && redisClient) {
    try { await redisClient.setex(key, TTL_ANALYSIS, data); return; } catch { /* fall */ }
  }
  memoryCache.set(key, { data, expires: Date.now() + TTL_ANALYSIS * 1_000 });
}

// ── Conversation History ───────────────────────────────────────────────────────
export interface ConvMessage {
  role: 'user' | 'assistant';
  content: string;
}

function convKey(userId: string, submissionId: string) {
  return `codementor:conv:${userId}:${submissionId}`;
}

export async function getConversationHistory(userId: string, submissionId: string): Promise<ConvMessage[]> {
  const key = convKey(userId, submissionId);
  if (redisAvailable && redisClient) {
    try { const r = await redisClient.get(key); return r ? JSON.parse(r) : []; } catch { /* fall */ }
  }
  const e = memConvStore.get(key);
  if (e && e.expires > Date.now()) return e.messages;
  memConvStore.delete(key);
  return [];
}

export async function appendConversationMessage(userId: string, submissionId: string, msg: ConvMessage): Promise<void> {
  const existing = await getConversationHistory(userId, submissionId);
  const updated = [...existing, msg].slice(-20);
  const key = convKey(userId, submissionId);
  if (redisAvailable && redisClient) {
    try { await redisClient.setex(key, TTL_CONV, JSON.stringify(updated)); return; } catch { /* fall */ }
  }
  memConvStore.set(key, { messages: updated, expires: Date.now() + TTL_CONV * 1_000 });
}

export async function clearConversationHistory(userId: string, submissionId: string): Promise<void> {
  const key = convKey(userId, submissionId);
  if (redisAvailable && redisClient) { try { await redisClient.del(key); } catch { /* noop */ } }
  memConvStore.delete(key);
}

// ── Struggle Tracking ─────────────────────────────────────────────────────────
function struggleKey(userId: string, category: string) {
  return `codementor:struggle:${userId}:${encodeURIComponent(category)}`;
}

/**
 * Increment the struggle counter for a given error category.
 * Returns the new count.
 */
export async function incrementStruggle(userId: string, category: string): Promise<number> {
  const key = struggleKey(userId, category);
  if (redisAvailable && redisClient) {
    try {
      const count = await redisClient.incr(key);
      await redisClient.expire(key, TTL_STRUGGLE);
      return count as number;
    } catch { /* fall */ }
  }
  const e = memStruggleStore.get(key);
  const count = (e?.count ?? 0) + 1;
  memStruggleStore.set(key, { count, expires: Date.now() + TTL_STRUGGLE * 1_000 });
  return count;
}

export async function getStruggleCount(userId: string, category: string): Promise<number> {
  const key = struggleKey(userId, category);
  if (redisAvailable && redisClient) {
    try {
      const r = await redisClient.get(key);
      return r ? parseInt(r, 10) : 0;
    } catch { /* fall */ }
  }
  const e = memStruggleStore.get(key);
  return (e && e.expires > Date.now()) ? e.count : 0;
}

/**
 * Returns true if ANY error category for this user has been hit 3+ times.
 */
export async function isUserStruggling(userId: string, categories: string[]): Promise<boolean> {
  for (const cat of categories) {
    const c = await getStruggleCount(userId, cat);
    if (c >= 3) return true;
  }
  return false;
}

// ── Total Submission Counter (anti-cheat) ─────────────────────────────────────
function submissionCountKey(userId: string) {
  return `codementor:submissions:total:${userId}`;
}

export async function incrementUserSubmissions(userId: string): Promise<number> {
  const key = submissionCountKey(userId);
  if (redisAvailable && redisClient) {
    try { return (await redisClient.incr(key)) as number; } catch { /* fall */ }
  }
  const e = memStruggleStore.get(key);
  const n = (e?.count ?? 0) + 1;
  memStruggleStore.set(key, { count: n, expires: Date.now() + TTL_STRUGGLE * 1_000 });
  return n;
}

export async function getUserSubmissionCount(userId: string): Promise<number> {
  const key = submissionCountKey(userId);
  if (redisAvailable && redisClient) {
    try { const r = await redisClient.get(key); return r ? parseInt(r, 10) : 0; } catch { /* fall */ }
  }
  const e = memStruggleStore.get(key);
  return (e && e.expires > Date.now()) ? e.count : 0;
}
