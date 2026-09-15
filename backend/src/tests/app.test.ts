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

  it("POST /auth/login authenticates a registered user", async () => {
    await request(app)
      .post("/auth/register")
      .send({
        name: "Vitest User",
        email: testEmail,
        password: "password123",
        currency: "PYG",
      });

    const response = await request(app)
      .post("/auth/login")
      .send({
        email: testEmail,
        password: "password123",
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Login successful");

    expect(response.body.token).toBeDefined();
    expect(typeof response.body.token).toBe("string");

    expect(response.body.user).toMatchObject({
      name: "Vitest User",
      email: testEmail,
      currency: "PYG",
    });

    expect(response.body.user.id).toBeDefined();
    expect(response.body.user.password).toBeUndefined();
  });

  it("POST /auth/login rejects an incorrect password", async () => {
    await request(app)
      .post("/auth/register")
      .send({
        name: "Vitest User",
        email: testEmail,
        password: "password123",
        currency: "PYG",
      });

    const response = await request(app)
      .post("/auth/login")
      .send({
        email: testEmail,
        password: "wrongpassword",
      });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      message: "Invalid email or password",
    });

    expect(response.body.token).toBeUndefined();
  });

  it("GET /auth/me returns the authenticated user", async () => {
    await request(app)
      .post("/auth/register")
      .send({
        name: "Vitest User",
        email: testEmail,
        password: "password123",
        currency: "PYG",
      });

    const loginResponse = await request(app)
      .post("/auth/login")
      .send({
        email: testEmail,
        password: "password123",
      });

    expect(loginResponse.status).toBe(200);

    const token = loginResponse.body.token;

    expect(token).toBeDefined();

    const response = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);

    expect(response.body.user).toMatchObject({
      name: "Vitest User",
      email: testEmail,
      currency: "PYG",
    });

    expect(response.body.user.id).toBeDefined();
    expect(response.body.user.createdAt).toBeDefined();
    expect(response.body.user.password).toBeUndefined();
  });

  it("POST /categories creates a category for the authenticated user", async () => {
    await request(app)
      .post("/auth/register")
      .send({
        name: "Vitest User",
        email: testEmail,
        password: "password123",
        currency: "PYG",
      });

    const loginResponse = await request(app)
      .post("/auth/login")
      .send({
        email: testEmail,
        password: "password123",
      });

    expect(loginResponse.status).toBe(200);

    const token = loginResponse.body.token;

    const createResponse = await request(app)
      .post("/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Food",
        type: "EXPENSE",
      });

    expect(createResponse.status).toBe(201);

    expect(createResponse.body.category).toMatchObject({
      name: "Food",
      type: "EXPENSE",
    });

    expect(createResponse.body.category.id).toBeDefined();

    const listResponse = await request(app)
      .get("/categories")
      .set("Authorization", `Bearer ${token}`);

    expect(listResponse.status).toBe(200);

    expect(listResponse.body.categories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: createResponse.body.category.id,
          name: "Food",
          type: "EXPENSE",
        }),
      ])
    );
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