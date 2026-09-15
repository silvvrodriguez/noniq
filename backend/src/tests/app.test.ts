import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";

import app from "../app.js";
import { prisma } from "../lib/prisma.js";

describe("Noniq API", () => {
  const testEmail = "vitest@noniq.test";

  afterEach(async () => {
    await prisma.user.deleteMany({
      where: {
        email: testEmail,
      },
    });
  });

  it("GET / returns the API status message", async () => {
    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: "Noniq API is running",
    });
  });

  it("uses the test database", () => {
    expect(process.env.DATABASE_URL).toContain("/noniq_test");
  });

  it("POST /auth/register creates a new user", async () => {
    const response = await request(app)
      .post("/auth/register")
      .send({
        name: "Vitest User",
        email: testEmail,
        password: "password123",
        currency: "PYG",
      });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe(
      "User registered successfully"
    );

    expect(response.body.user).toMatchObject({
      name: "Vitest User",
      email: testEmail,
      currency: "PYG",
    });

    expect(response.body.user.id).toBeDefined();
    expect(response.body.user.createdAt).toBeDefined();
    expect(response.body.user.password).toBeUndefined();
  });

  it("POST /auth/register rejects an already registered email", async () => {
    const userData = {
      name: "Vitest User",
      email: testEmail,
      password: "password123",
      currency: "PYG",
    };

    const firstResponse = await request(app)
      .post("/auth/register")
      .send(userData);

    expect(firstResponse.status).toBe(201);

    const secondResponse = await request(app)
      .post("/auth/register")
      .send(userData);

    expect(secondResponse.status).toBe(409);
    expect(secondResponse.body).toEqual({
      message: "Email already registered",
    });
  });

  it("GET /categories rejects requests without authentication", async () => {
    const response = await request(app).get("/categories");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      message: "Authentication required",
    });
  });

  it("GET /categories rejects an invalid token", async () => {
    const response = await request(app)
      .get("/categories")
      .set("Authorization", "Bearer invalid-token");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      message: "Invalid or expired token",
    });
  });
});