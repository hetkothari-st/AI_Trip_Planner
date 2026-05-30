/**
 * Tiny in-memory TTL + LRU cache. Persists across requests within a single
 * `next start` instance (Railway runs one), so repeat inputs return instantly
 * instead of re-hitting the LLM / research connectors. Not shared across
 * instances and cleared on redeploy — fine for "same input → fast repeat".
 */
interface Entry<T> {
  value: T;
  expires: number;
}

export class TTLCache<T> {
  private map = new Map<string, Entry<T>>();
  constructor(
    private ttlMs: number,
    private max = 500,
  ) {}

  get(key: string): T | undefined {
    const hit = this.map.get(key);
    if (!hit) return undefined;
    if (hit.expires < this.now()) {
      this.map.delete(key);
      return undefined;
    }
    // LRU touch: re-insert to move to the end.
    this.map.delete(key);
    this.map.set(key, hit);
    return hit.value;
  }

  set(key: string, value: T): void {
    if (this.map.size >= this.max) {
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.map.delete(oldest);
    }
    this.map.set(key, { value, expires: this.now() + this.ttlMs });
  }

  // Date.now via a method so it is easy to stub in tests.
  private now(): number {
    return Date.now();
  }
}

/** Memoise an async fn behind a TTL cache. Concurrent calls share one inflight promise. */
export function memoizeAsync<T>(
  cache: TTLCache<T>,
  inflight: Map<string, Promise<T>>,
  key: string,
  fn: () => Promise<T>,
): Promise<T> {
  const cached = cache.get(key);
  if (cached !== undefined) return Promise.resolve(cached);

  const existing = inflight.get(key);
  if (existing) return existing;

  const p = fn()
    .then((value) => {
      cache.set(key, value);
      return value;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}
