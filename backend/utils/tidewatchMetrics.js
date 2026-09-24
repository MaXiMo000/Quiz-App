// Tidewatch metrics add-on (vendored, v1, no dependencies).
// Source of truth: github.com/MaXiMo000/tidewatch addons/tidewatch-metrics.js
//
// Serves aggregate health numbers at GET /tidewatch/metrics for the Tidewatch dashboard:
//   { v: 1, window_s: 60, uptime_s, http: {count, errors, p95_ms}, deps: [{id, kind, ...}] }
// - Only exists when TIDEWATCH_METRICS_TOKEN is set; requires `Authorization: Bearer <token>`
//   (constant-time compare). Mount it before rate limiters, sessions and request logging.
// - Records per request ONLY (duration, 5xx or not) - never URLs, routes, query strings, bodies,
//   headers or user ids. errors = 5xx responses (4xx are the client"s fault).
// - Rolling 60 s window of 1 s buckets; p95 from a fixed log-spaced histogram (1 ms..60 s).
//   Memory is constant: the http series plus at most 8 dependency series.
import { createHash, timingSafeEqual } from "node:crypto";

const WINDOW_S = 60;
const BUCKETS = 32;
const MIN_MS = 1;
const MAX_MS = 60_000;
const STEP = Math.log(MAX_MS / MIN_MS) / (BUCKETS - 1); // each bucket ~1.43x the previous
const MAX_DEPS = 8;
const DEP_ID = /^[a-z0-9-]{1,16}$/;
const KINDS = new Set(["service", "cache", "database", "queue", "worker"]);

const bucketOf = (ms) => (ms > MIN_MS ? Math.min(BUCKETS - 1, Math.ceil(Math.log(ms / MIN_MS) / STEP)) : 0);
const upperEdge = (b) => MIN_MS * Math.exp(b * STEP);

export class Series {
  constructor() {
    this.stamp = new Float64Array(WINDOW_S).fill(-1); // which second each slot currently holds
    this.count = new Uint32Array(WINDOW_S);
    this.errors = new Uint32Array(WINDOW_S);
    this.hist = new Uint32Array(WINDOW_S * BUCKETS);
  }

  record(ms, ok, nowMs = Date.now()) {
    const sec = Math.floor(nowMs / 1000);
    const i = sec % WINDOW_S;
    if (this.stamp[i] !== sec) {
      this.stamp[i] = sec;
      this.count[i] = 0;
      this.errors[i] = 0;
      this.hist.fill(0, i * BUCKETS, (i + 1) * BUCKETS);
    }
    this.count[i] += 1;
    if (!ok) this.errors[i] += 1;
    this.hist[i * BUCKETS + bucketOf(ms)] += 1;
  }

  totals(nowMs = Date.now()) {
    const oldest = Math.floor(nowMs / 1000) - WINDOW_S;
    const merged = new Uint32Array(BUCKETS);
    let count = 0;
    let errors = 0;
    for (let i = 0; i < WINDOW_S; i++) {
      if (this.stamp[i] <= oldest) continue;
      count += this.count[i];
      errors += this.errors[i];
      for (let b = 0; b < BUCKETS; b++) merged[b] += this.hist[i * BUCKETS + b];
    }
    let p95 = 0;
    for (let b = 0, seen = 0, target = Math.ceil(count * 0.95); count && b < BUCKETS; b++) {
      seen += merged[b];
      if (seen >= target) {
        p95 = upperEdge(b);
        break;
      }
    }
    return { count, errors, p95_ms: Math.round(p95 * 10) / 10 };
  }
}

const startedAt = Date.now();
const http = new Series();
const deps = new Map();

/** Record one dependency call. Unknown ids beyond 8, bad ids and bad kinds are ignored. */
export function recordDep(id, kind, ms, ok) {
  let dep = deps.get(id);
  if (!dep) {
    if (deps.size >= MAX_DEPS || !DEP_ID.test(id) || !KINDS.has(kind)) return;
    dep = { kind, series: new Series() };
    deps.set(id, dep);
  }
  dep.series.record(ms, ok);
}

/**
 * Time an async dependency call: `await track("db", "database", () => db.execute(sql))`.
 * A throw counts as an error, and so does a resolved fetch Response with a 5xx status.
 */
export async function track(id, kind, fn) {
  const t0 = performance.now();
  let ok = false;
  try {
    const result = await fn();
    ok = !(typeof result?.status === "number" && result.status >= 500);
    return result;
  } finally {
    recordDep(id, kind, performance.now() - t0, ok);
  }
}

export function snapshot(nowMs = Date.now()) {
  return {
    v: 1,
    window_s: WINDOW_S,
    uptime_s: Math.floor((nowMs - startedAt) / 1000),
    http: http.totals(nowMs),
    deps: [...deps].map(([id, dep]) => ({ id, kind: dep.kind, ...dep.series.totals(nowMs) })),
  };
}

/**
 * Time every MongoDB command (durations only, never the command or its documents). The client
 * must be created with `monitorCommands: true`; with mongoose: `mongoose.connect(uri, { monitorCommands: true })`
 * then `watchMongo(mongoose.connection.getClient())`.
 */
export function watchMongo(client, id = "db") {
  client.on("commandSucceeded", (e) => recordDep(id, "database", e.duration, true));
  client.on("commandFailed", (e) => recordDep(id, "database", e.duration, false));
}

const digest = (s) => createHash("sha256").update(s).digest();

/** Mount request timing + GET /tidewatch/metrics on an Express app. No token -> nothing mounted. */
export function tidewatchMetrics(app, { token = process.env.TIDEWATCH_METRICS_TOKEN, path = "/tidewatch/metrics" } = {}) {
  if (!token) return false;
  const expected = digest(token);
  app.use((req, res, next) => {
    if (req.path !== path) {
      const t0 = performance.now();
      res.on("finish", () => http.record(performance.now() - t0, res.statusCode < 500));
    }
    next();
  });
  app.get(path, (req, res) => {
    const auth = req.get("authorization") || "";
    const given = digest(auth.startsWith("Bearer ") ? auth.slice(7) : "");
    res.set("Cache-Control", "no-store");
    if (!auth.startsWith("Bearer ") || !timingSafeEqual(given, expected)) {
      res.set("WWW-Authenticate", "Bearer");
      return res.status(401).json({ error: "unauthorized" });
    }
    return res.json(snapshot());
  });
  return true;
}
