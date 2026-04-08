/**
 * KV Retry Wrapper — Ya Hala E-Portal
 *
 * Wraps kv_store operations with automatic retry logic to handle
 * transient Supabase 502 / connection-reset errors gracefully.
 */
import * as kv from './kv_store.tsx';

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 300; // 300ms, 600ms, 1200ms

async function withRetry<T>(fn: () => Promise<T>, label = 'kv'): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const msg = String(err?.message || err || '');
      const isTransient =
        msg.includes('502') ||
        msg.includes('Bad gateway') ||
        msg.includes('bad gateway') ||
        msg.includes('connection reset') ||
        msg.includes('connection error') ||
        msg.includes('SendRequest') ||
        msg.includes('ECONNRESET') ||
        msg.includes('fetch failed');
      if (!isTransient || attempt === MAX_RETRIES - 1) {
        throw err;
      }
      const delay = BASE_DELAY_MS * Math.pow(2, attempt);
      console.log(`[kv-retry] ${label} attempt ${attempt + 1} failed (transient), retrying in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastError;
}

export const get = (key: string) => withRetry(() => kv.get(key), `get(${key})`);
export const set = (key: string, value: any) => withRetry(() => kv.set(key, value), `set(${key})`);
export const del = (key: string) => withRetry(() => kv.del(key), `del(${key})`);
export const mget = (keys: string[]) => withRetry(() => kv.mget(keys), `mget(${keys.length} keys)`);
export const mset = (keys: string[], values: any[]) => withRetry(() => kv.mset(keys, values), `mset(${keys.length} keys)`);
export const mdel = (keys: string[]) => withRetry(() => kv.mdel(keys), `mdel(${keys.length} keys)`);
export const getByPrefix = (prefix: string) => withRetry(() => kv.getByPrefix(prefix), `getByPrefix(${prefix})`);
