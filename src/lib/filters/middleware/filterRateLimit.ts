const DEFAULT_WINDOW_MS = 60_000;

type RateLimitOptions = {
  windowMs?: number;
  max: number;
  keyGenerator?: (req: ReqType) => string;
  message?: string;
  name?: string;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const stores = new Map<string, Map<string, RateLimitEntry>>();

const getStore = (name: string): Map<string, RateLimitEntry> => {
  const existing = stores.get(name);
  if (existing) {
    return existing;
  }
  const store = new Map<string, RateLimitEntry>();
  stores.set(name, store);
  return store;
};

const defaultKeyGenerator = (req: ReqType): string => {
  const userId = req.user?.id ?? "anon";
  return `${userId}:${req.ip}`;
};

export const createRateLimiter = (options: RateLimitOptions): MiddlewareType => {
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
  const max = options.max;
  const message = options.message ?? "Too many requests";
  const name = options.name ?? "default";
  const keyGenerator = options.keyGenerator ?? defaultKeyGenerator;
  const store = getStore(name);

  return (req: ReqType, res: ResType, next: () => void) => {
    const key = keyGenerator(req);
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || now >= entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    entry.count += 1;

    if (entry.count > max) {
      const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfterSeconds));
      return res.status(429).json({ success: false, error: message });
    }

    return next();
  };
};

export const previewRateLimit = createRateLimiter({
  name: "filters_preview",
  windowMs: DEFAULT_WINDOW_MS,
  max: 30,
  message: "Too many preview requests"
});

export const createRateLimit = createRateLimiter({
  name: "filters_create",
  windowMs: DEFAULT_WINDOW_MS,
  max: 10,
  message: "Too many create requests"
});

export const countRateLimit = createRateLimiter({
  name: "filters_count",
  windowMs: DEFAULT_WINDOW_MS,
  max: 60,
  message: "Too many count requests"
});

const resolveToken = (value: unknown): string | undefined => {
  if (Array.isArray(value)) {
    const item = value.find((entry) => typeof entry === "string" && entry.trim().length > 0);
    return item ? item.trim() : undefined;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  return undefined;
};

export const publicApiRateLimit = createRateLimiter({
  name: "public_api",
  windowMs: DEFAULT_WINDOW_MS,
  max: 120,
  message: "Too many public API requests",
  keyGenerator: (req) => {
    const token = resolveToken(req.query?.token);
    if (token) {
      return `token:${token}`;
    }
    return `${req.ip}`;
  }
});
