// Tidewatch metrics add-on (utils/tidewatchMetrics.js): window math, p95, auth, MongoDB command
// timing, and that nothing identifying (paths, query strings, bodies) ever reaches the output.
import { EventEmitter } from "node:events";
import express from "express";
import request from "supertest";

import { Series, recordDep, snapshot, tidewatchMetrics, track, watchMongo } from "../../utils/tidewatchMetrics.js";

const TOKEN = "test-token-not-a-secret-0123456789";
const T = 1_000_000_000_000;

describe("tidewatchMetrics", () => {
    test("rolling 60 s window: old seconds drop out, slots are reused", () => {
        const s = new Series();
        s.record(10, true, T);
        s.record(10, false, T + 30_000);
        expect([s.totals(T + 30_000).count, s.totals(T + 30_000).errors]).toEqual([2, 1]);
        expect(s.totals(T + 61_000).count).toBe(1); // the first second has left the window
        s.record(10, true, T + 60_000); // same slot as T, one minute later: reset, not added
        expect(s.totals(T + 60_000).count).toBe(2);
        expect(s.totals(T + 200_000)).toEqual({ count: 0, errors: 0, p95_ms: 0 });
    });

    test("p95 comes from the log-spaced histogram (within one bucket, ~1.43x)", () => {
        const fast = new Series();
        for (let i = 0; i < 95; i++) fast.record(10, true, T);
        for (let i = 0; i < 5; i++) fast.record(5000, true, T);
        const p95 = fast.totals(T).p95_ms;
        expect(p95).toBeGreaterThanOrEqual(10);
        expect(p95).toBeLessThan(14.5);

        const slow = new Series();
        for (let i = 0; i < 94; i++) slow.record(10, true, T);
        for (let i = 0; i < 6; i++) slow.record(5000, true, T);
        expect(slow.totals(T).p95_ms).toBeGreaterThanOrEqual(5000);
        expect(slow.totals(T).p95_ms).toBeLessThan(7200);

        const extremes = new Series();
        extremes.record(0, true, T);
        extremes.record(10 * 60_000, true, T); // beyond the top bucket: clamped, not lost
        expect(extremes.totals(T)).toEqual({ count: 2, errors: 0, p95_ms: 60_000 });
    });

    test("dependencies: track() and MongoDB command events, errors counted, max 8 fixed ids", async () => {
        await track("cache", "cache", async () => "ok");
        await expect(track("cache", "cache", async () => { throw new Error("boom"); })).rejects.toThrow("boom");
        await track("ai", "service", async () => ({ status: 503 }));
        await track("ai", "service", async () => ({ status: 404 }));

        const client = new EventEmitter();
        watchMongo(client);
        client.emit("commandSucceeded", { duration: 4, commandName: "find", reply: { secret: "x" } });
        client.emit("commandFailed", { duration: 9, commandName: "insert", failure: new Error("dup") });

        recordDep("Bad Id!", "service", 1, true);
        recordDep("x", "gateway", 1, true);
        for (let i = 0; i < 20; i++) recordDep(`extra-${i}`, "cache", 1, true);

        const deps = snapshot().deps;
        expect(deps).toHaveLength(8);
        const byId = Object.fromEntries(deps.map((d) => [d.id, d]));
        expect([byId.cache.count, byId.cache.errors, byId.cache.kind]).toEqual([2, 1, "cache"]);
        expect([byId.ai.count, byId.ai.errors, byId.ai.kind]).toEqual([2, 1, "service"]);
        expect([byId.db.count, byId.db.errors, byId.db.kind]).toEqual([2, 1, "database"]);
        expect(byId["Bad Id!"]).toBeUndefined();
        expect(byId.x).toBeUndefined();
        const text = JSON.stringify(deps);
        for (const leak of ["find", "insert", "secret", "dup"]) expect(text).not.toContain(leak);
    });

    test("the route does not exist without a token", async () => {
        const app = express();
        expect(tidewatchMetrics(app, { token: "" })).toBe(false);
        await request(app).get("/tidewatch/metrics").expect(404);
    });

    test("auth, no-store, 5xx-only errors, and nothing identifying in the output", async () => {
        const app = express();
        expect(tidewatchMetrics(app, { token: TOKEN })).toBe(true);
        app.get("/api/users/:name", (req, res) => res.status(req.query.fail ? 500 : 404).json({}));

        for (const auth of [undefined, "Bearer wrong", TOKEN]) {
            const req = request(app).get("/tidewatch/metrics");
            const res = await (auth ? req.set("Authorization", auth) : req);
            expect(res.status).toBe(401);
            expect(res.headers["cache-control"]).toBe("no-store");
        }

        await request(app).get("/api/users/alice-secret?email=alice%40example.com").expect(404);
        await request(app).get("/api/users/bob?fail=1").expect(500);

        const res = await request(app).get("/tidewatch/metrics").set("Authorization", `Bearer ${TOKEN}`);
        expect(res.status).toBe(200);
        expect(res.headers["cache-control"]).toBe("no-store");
        expect(Object.keys(res.body)).toEqual(["v", "window_s", "uptime_s", "http", "deps"]);
        expect(Object.keys(res.body.http)).toEqual(["count", "errors", "p95_ms"]);
        // Polls of the metrics route are never counted; the two app requests are.
        expect(res.body.http.count).toBe(2);
        expect(res.body.http.errors).toBe(1);
        for (const leak of ["alice", "bob", "example.com", "/api", "users", TOKEN]) {
            expect(res.text).not.toContain(leak);
        }
    });
});
