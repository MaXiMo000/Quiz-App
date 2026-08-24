/**
 * The routes under /api/debug were mounted with verifyToken alone, which only
 * proves the caller is logged in as somebody. Any authenticated user could
 * read any other user's profile by id, reset any user's XP, level and streaks,
 * and trigger a bulk repair that returned every affected user's name and email.
 *
 * Asserted in both directions: an admin must get through, and a denial must
 * both respond AND not call next() -- a guard that denies and then calls next
 * anyway is not a guard.
 */
import { requireAdmin } from "../../middleware/auth.js";

describe("requireAdmin", () => {
    let req, res, next;

    beforeEach(() => {
        req = { originalUrl: "/api/debug/user/victim/reset-xp" };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        next = jest.fn();
    });

    it("lets an admin through", () => {
        req.user = { id: "a1", role: "admin" };
        requireAdmin(req, res, next);
        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });

    it.each(["user", "premium", undefined, "", "Admin", "administrator"])(
        "rejects role %p with 403 and does not continue", (role) => {
            req.user = { id: "u1", role };
            requireAdmin(req, res, next);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(next).not.toHaveBeenCalled();
        });

    it("rejects an unauthenticated request with 401", () => {
        requireAdmin(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    it("does not echo the caller's identity back in the denial", () => {
        req.user = { id: "u1", role: "user", email: "someone@example.com" };
        requireAdmin(req, res, next);
        const body = JSON.stringify(res.json.mock.calls[0][0]);
        expect(body).not.toContain("someone@example.com");
        expect(body).not.toContain("u1");
    });
});
