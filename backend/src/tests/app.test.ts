import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";

import app from "../app.js";
import { prisma } from "../lib/prisma.js";

describe("Noniq API", () => {
  const testEmail = "vitest@noniq.test";
  const secondTestEmail = "vitest-second@noniq.test";

  afterEach(async () => {
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [testEmail, secondTestEmail],
        },
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

  it("PATCH /categories/:id updates a category owned by the authenticated user", async () => {
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

    const token = loginResponse.body.token;

    const createResponse = await request(app)
      .post("/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Food",
        type: "EXPENSE",
      });

    expect(createResponse.status).toBe(201);

    const categoryId = createResponse.body.category.id;

    const updateResponse = await request(app)
      .patch(`/categories/${categoryId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Groceries",
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.message).toBe(
      "Category updated successfully"
    );

    expect(updateResponse.body.category).toMatchObject({
      id: categoryId,
      name: "Groceries",
      type: "EXPENSE",
    });
  });

  it("DELETE /categories/:id deletes a category owned by the authenticated user", async () => {
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

    const token = loginResponse.body.token;

    const createResponse = await request(app)
      .post("/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Food",
        type: "EXPENSE",
      });

    expect(createResponse.status).toBe(201);

    const categoryId = createResponse.body.category.id;

    const deleteResponse = await request(app)
      .delete(`/categories/${categoryId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body).toEqual({
      message: "Category deleted successfully",
    });

    const listResponse = await request(app)
      .get("/categories")
      .set("Authorization", `Bearer ${token}`);

    expect(listResponse.status).toBe(200);

    expect(listResponse.body.categories).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: categoryId,
        }),
      ])
    );
  });

  it("PATCH /categories/:id rejects a category owned by another user", async () => {
    await request(app)
      .post("/auth/register")
      .send({
        name: "First User",
        email: testEmail,
        password: "password123",
        currency: "PYG",
      });

    const firstLoginResponse = await request(app)
      .post("/auth/login")
      .send({
        email: testEmail,
        password: "password123",
      });

    const firstToken = firstLoginResponse.body.token;

    const createResponse = await request(app)
      .post("/categories")
      .set("Authorization", `Bearer ${firstToken}`)
      .send({
        name: "Private Food",
        type: "EXPENSE",
      });

    expect(createResponse.status).toBe(201);

    const categoryId = createResponse.body.category.id;

    await request(app)
      .post("/auth/register")
      .send({
        name: "Second User",
        email: secondTestEmail,
        password: "password123",
        currency: "PYG",
      });

    const secondLoginResponse = await request(app)
      .post("/auth/login")
      .send({
        email: secondTestEmail,
        password: "password123",
      });

    const secondToken = secondLoginResponse.body.token;

    const updateResponse = await request(app)
      .patch(`/categories/${categoryId}`)
      .set("Authorization", `Bearer ${secondToken}`)
      .send({
        name: "Hacked Category",
      });

    expect(updateResponse.status).toBe(404);
    expect(updateResponse.body).toEqual({
      message: "Category not found",
    });
  });

  it("DELETE /categories/:id rejects a category owned by another user", async () => {
    await request(app)
      .post("/auth/register")
      .send({
        name: "First User",
        email: testEmail,
        password: "password123",
        currency: "PYG",
      });

    const firstLoginResponse = await request(app)
      .post("/auth/login")
      .send({
        email: testEmail,
        password: "password123",
      });

    const firstToken = firstLoginResponse.body.token;

    const createResponse = await request(app)
      .post("/categories")
      .set("Authorization", `Bearer ${firstToken}`)
      .send({
        name: "Private Food",
        type: "EXPENSE",
      });

    expect(createResponse.status).toBe(201);

    const categoryId = createResponse.body.category.id;

    await request(app)
      .post("/auth/register")
      .send({
        name: "Second User",
        email: secondTestEmail,
        password: "password123",
        currency: "PYG",
      });

    const secondLoginResponse = await request(app)
      .post("/auth/login")
      .send({
        email: secondTestEmail,
        password: "password123",
      });

    const secondToken = secondLoginResponse.body.token;

    const deleteResponse = await request(app)
      .delete(`/categories/${categoryId}`)
      .set("Authorization", `Bearer ${secondToken}`);

    expect(deleteResponse.status).toBe(404);
    expect(deleteResponse.body).toEqual({
      message: "Category not found",
    });

    const categoryStillExists = await prisma.category.findUnique({
      where: {
        id: categoryId,
      },
    });

    expect(categoryStillExists).not.toBeNull();
    expect(categoryStillExists?.name).toBe("Private Food");
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