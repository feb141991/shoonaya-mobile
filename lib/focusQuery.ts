/** Reuses an in-flight query and successful results until their focus TTL expires. */
export class FocusQuery<T> {
  private entry: { key: string; promise: Promise<T>; completedAt: number | null } | null = null;

  constructor(private readonly ttlMs: number, private readonly now = Date.now) {}

  clear(): void {
    this.entry = null;
  }

  load(key: string, fetchValue: () => Promise<T>): Promise<T> {
    const existing = this.entry;
    if (existing?.key === key &&
      (existing.completedAt === null || this.now() - existing.completedAt < this.ttlMs)) {
      return existing.promise;
    }
    const entry = { key, promise: Promise.resolve().then(fetchValue), completedAt: null as number | null };
    this.entry = entry;
    entry.promise = entry.promise.then((value) => {
      entry.completedAt = this.now();
      return value;
    }, (error: unknown) => {
      if (this.entry === entry) this.entry = null;
      throw error;
    });
    return entry.promise;
  }
}
