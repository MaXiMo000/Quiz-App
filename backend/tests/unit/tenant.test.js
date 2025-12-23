import mongoose from "mongoose";
import request from "supertest";
import express from "express";
import Organization from "../../models/Organization.js";
import User from "../../models/User.js";
import Quiz from "../../models/Quiz.js";
import { tenantMiddleware } from "../../middleware/tenantMiddleware.js";

const app = express();
app.use(express.json());
app.use(tenantMiddleware);
app.get("/test", (req, res) => {
    if (req.organization) {
        res.json({ message: "Tenant found", organization: req.organization });
    } else {
        res.json({ message: "No tenant" });
    }
});

describe("Multi-Tenant Architecture", () => {
    afterEach(async () => {
        await Organization.deleteMany({});
        await User.deleteMany({});
        await Quiz.deleteMany({});
    });

    it("should create an organization", async () => {
        const owner = new User({
            name: "Org Owner",
            email: "owner@org.com",
            password: "password"
        });
        await owner.save();

        const org = new Organization({
            name: "Test Org",
            slug: "test-org",
            owner: owner._id,
            subscription: { plan: "pro" }
        });
        await org.save();

        const savedOrg = await Organization.findOne({ slug: "test-org" });
        expect(savedOrg).toBeDefined();
        expect(savedOrg.name).toBe("Test Org");
        expect(savedOrg.subscription.plan).toBe("pro");
    });

    it("should link user to organization", async () => {
        const owner = new User({
            name: "Org Owner",
            email: "owner@org.com",
            password: "password"
        });
        await owner.save();

        const org = await Organization.create({
            name: "Test Org",
            slug: "test-org",
            owner: owner._id
        });

        const user = new User({
            name: "Org User",
            email: "user@org.com",
            password: "password",
            organizationId: org._id
        });
        await user.save();

        const savedUser = await User.findOne({ email: "user@org.com" }).populate("organizationId");
        expect(savedUser.organizationId).toBeDefined();
        expect(savedUser.organizationId.name).toBe("Test Org");
    });

    it("should link quiz to organization", async () => {
        const owner = new User({
            name: "Org Owner",
            email: "owner@org.com",
            password: "password"
        });
        await owner.save();

        const org = await Organization.create({
            name: "Test Org",
            slug: "test-org",
            owner: owner._id
        });

        const quiz = new Quiz({
            title: "Org Quiz",
            organizationId: org._id
        });
        await quiz.save();

        const savedQuiz = await Quiz.findOne({ title: "Org Quiz" }).populate("organizationId");
        expect(savedQuiz.organizationId).toBeDefined();
        expect(savedQuiz.organizationId.name).toBe("Test Org");
    });

    it("middleware should identify tenant from header", async () => {
        const owner = new User({
            name: "Org Owner",
            email: "owner@org.com",
            password: "password"
        });
        await owner.save();

        const org = await Organization.create({
            name: "Test Org",
            slug: "test-org",
            owner: owner._id
        });

        const res = await request(app)
            .get("/test")
            .set("x-tenant-id", org._id.toString());

        expect(res.statusCode).toBe(200);
        expect(res.body.message).toBe("Tenant found");
        expect(res.body.organization.name).toBe("Test Org");
    });

    it("middleware should handle missing tenant header", async () => {
        const res = await request(app).get("/test");
        expect(res.statusCode).toBe(200);
        expect(res.body.message).toBe("No tenant");
    });

    it("middleware should handle invalid tenant id", async () => {
        const res = await request(app)
            .get("/test")
            .set("x-tenant-id", new mongoose.Types.ObjectId().toString());

        expect(res.statusCode).toBe(404);
        expect(res.body.message).toBe("Organization not found");
    });
});
