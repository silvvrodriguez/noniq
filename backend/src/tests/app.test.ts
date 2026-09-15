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

    const token = loginResponse.body.token;

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

    const categoryId = createResponse.body.category.id;

    const updateResponse = await request(app)
      .patch(`/categories/${categoryId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Groceries",
      });

    expect(updateResponse.status).toBe(200);

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

    const categoryId = createResponse.body.category.id;

    const deleteResponse = await request(app)
      .delete(`/categories/${categoryId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body).toEqual({
      message: "Category deleted successfully",
    });
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

    const response = await request(app)
      .patch(`/categories/${categoryId}`)
      .set("Authorization", `Bearer ${secondToken}`)
      .send({
        name: "Hacked",
      });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
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

    const response = await request(app)
      .delete(`/categories/${categoryId}`)
      .set("Authorization", `Bearer ${secondToken}`);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "Category not found",
    });
  });

  it("POST /transactions creates and GET /transactions lists a transaction for the authenticated user", async () => {
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

    const categoryResponse = await request(app)
      .post("/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Groceries",
        type: "EXPENSE",
      });

    const categoryId = categoryResponse.body.category.id;

    const transactionResponse = await request(app)
      .post("/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        amount: 175000,
        description: "Weekly groceries",
        type: "EXPENSE",
        date: "2026-09-15T15:30:00.000Z",
        categoryId,
      });

    expect(transactionResponse.status).toBe(201);

    expect(transactionResponse.body.transaction).toMatchObject({
      amount: "175000",
      description: "Weekly groceries",
      type: "EXPENSE",
      categoryId,
    });

    const listResponse = await request(app)
      .get("/transactions")
      .set("Authorization", `Bearer ${token}`);

    expect(listResponse.status).toBe(200);

    expect(listResponse.body.transactions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: transactionResponse.body.transaction.id,
          amount: "175000",
          description: "Weekly groceries",
          type: "EXPENSE",
          categoryId,
        }),
      ])
    );
  });

  it("POST /transactions rejects a category owned by another user", async () => {
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

    const categoryResponse = await request(app)
      .post("/categories")
      .set("Authorization", `Bearer ${firstToken}`)
      .send({
        name: "Private Food",
        type: "EXPENSE",
      });

    const categoryId = categoryResponse.body.category.id;

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

    const response = await request(app)
      .post("/transactions")
      .set("Authorization", `Bearer ${secondToken}`)
      .send({
        amount: 50000,
        description: "Unauthorized",
        type: "EXPENSE",
        date: "2026-09-15T17:00:00.000Z",
        categoryId,
      });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "Category not found",
    });
  });

  it("POST /transactions rejects a type that does not match the category type", async () => {
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

    const categoryResponse = await request(app)
      .post("/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Salary",
        type: "INCOME",
      });

    const categoryId = categoryResponse.body.category.id;

    const response = await request(app)
      .post("/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        amount: 5000000,
        description: "Invalid",
        type: "EXPENSE",
        date: "2026-09-15T17:00:00.000Z",
        categoryId,
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "Transaction type must match category type",
    });
  });

  it("GET /transactions filters transactions by type", async () => {
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

    const expenseCategoryResponse = await request(app)
      .post("/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Food",
        type: "EXPENSE",
      });

    const incomeCategoryResponse = await request(app)
      .post("/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Salary",
        type: "INCOME",
      });

    const expenseCategoryId =
      expenseCategoryResponse.body.category.id;

    const incomeCategoryId =
      incomeCategoryResponse.body.category.id;

    await request(app)
      .post("/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        amount: 100000,
        description: "Lunch",
        type: "EXPENSE",
        date: "2026-09-15T12:00:00.000Z",
        categoryId: expenseCategoryId,
      });

    await request(app)
      .post("/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        amount: 5000000,
        description: "Salary",
        type: "INCOME",
        date: "2026-09-15T09:00:00.000Z",
        categoryId: incomeCategoryId,
      });

    const response = await request(app)
      .get("/transactions")
      .query({ type: "EXPENSE" })
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.transactions).toHaveLength(1);

    expect(response.body.transactions[0]).toMatchObject({
      amount: "100000",
      description: "Lunch",
      type: "EXPENSE",
      categoryId: expenseCategoryId,
    });
  });

  it("GET /transactions filters transactions by categoryId", async () => {
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

    const foodResponse = await request(app)
      .post("/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Food",
        type: "EXPENSE",
      });

    const transportResponse = await request(app)
      .post("/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Transport",
        type: "EXPENSE",
      });

    const foodId = foodResponse.body.category.id;
    const transportId = transportResponse.body.category.id;

    await request(app)
      .post("/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        amount: 80000,
        description: "Breakfast",
        type: "EXPENSE",
        date: "2026-09-15T08:00:00.000Z",
        categoryId: foodId,
      });

    await request(app)
      .post("/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        amount: 50000,
        description: "Bus",
        type: "EXPENSE",
        date: "2026-09-15T07:00:00.000Z",
        categoryId: transportId,
      });

    const response = await request(app)
      .get("/transactions")
      .query({ categoryId: foodId })
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.transactions).toHaveLength(1);

    expect(response.body.transactions[0]).toMatchObject({
      amount: "80000",
      description: "Breakfast",
      categoryId: foodId,
    });
  });

  it("GET /transactions filters transactions by date range", async () => {
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

    const categoryResponse = await request(app)
      .post("/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Food",
        type: "EXPENSE",
      });

    const categoryId = categoryResponse.body.category.id;

    await request(app)
      .post("/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        amount: 10000,
        description: "Before",
        type: "EXPENSE",
        date: "2026-08-31T12:00:00.000Z",
        categoryId,
      });

    await request(app)
      .post("/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        amount: 20000,
        description: "Inside",
        type: "EXPENSE",
        date: "2026-09-10T12:00:00.000Z",
        categoryId,
      });

    await request(app)
      .post("/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        amount: 30000,
        description: "After",
        type: "EXPENSE",
        date: "2026-09-20T12:00:00.000Z",
        categoryId,
      });

    const response = await request(app)
      .get("/transactions")
      .query({
        from: "2026-09-01",
        to: "2026-09-15",
      })
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.transactions).toHaveLength(1);

    expect(response.body.transactions[0]).toMatchObject({
      amount: "20000",
      description: "Inside",
      categoryId,
    });
  });

  it("GET /transactions rejects invalid filters", async () => {
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

    const invalidTypeResponse = await request(app)
      .get("/transactions")
      .query({ type: "INVALID" })
      .set("Authorization", `Bearer ${token}`);

    expect(invalidTypeResponse.status).toBe(400);
    expect(invalidTypeResponse.body).toEqual({
      message: "Invalid transaction type",
    });

    const invalidFromResponse = await request(app)
      .get("/transactions")
      .query({ from: "15-09-2026" })
      .set("Authorization", `Bearer ${token}`);

    expect(invalidFromResponse.status).toBe(400);
    expect(invalidFromResponse.body).toEqual({
      message: "Invalid from date. Use YYYY-MM-DD",
    });

    const invalidRangeResponse = await request(app)
      .get("/transactions")
      .query({
        from: "2026-09-20",
        to: "2026-09-10",
      })
      .set("Authorization", `Bearer ${token}`);

    expect(invalidRangeResponse.status).toBe(400);
    expect(invalidRangeResponse.body).toEqual({
      message: "From date must be before or equal to to date",
    });
  });

  it("PATCH /transactions/:id updates a transaction owned by the authenticated user", async () => {
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

    const categoryResponse = await request(app)
      .post("/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Food",
        type: "EXPENSE",
      });

    const categoryId = categoryResponse.body.category.id;

    const createResponse = await request(app)
      .post("/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        amount: 100000,
        description: "Lunch",
        type: "EXPENSE",
        date: "2026-09-15T12:00:00.000Z",
        categoryId,
      });

    const transactionId = createResponse.body.transaction.id;

    const response = await request(app)
      .patch(`/transactions/${transactionId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        amount: 125000,
        description: "Updated lunch",
      });

    expect(response.status).toBe(200);

    expect(response.body.transaction).toMatchObject({
      id: transactionId,
      amount: "125000",
      description: "Updated lunch",
      type: "EXPENSE",
      categoryId,
    });
  });

  it("PATCH /transactions/:id rejects a category owned by another user", async () => {
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

    const firstCategoryResponse = await request(app)
      .post("/categories")
      .set("Authorization", `Bearer ${firstToken}`)
      .send({
        name: "First Food",
        type: "EXPENSE",
      });

    const firstCategoryId =
      firstCategoryResponse.body.category.id;

    const transactionResponse = await request(app)
      .post("/transactions")
      .set("Authorization", `Bearer ${firstToken}`)
      .send({
        amount: 100000,
        description: "Private",
        type: "EXPENSE",
        date: "2026-09-15T12:00:00.000Z",
        categoryId: firstCategoryId,
      });

    const transactionId = transactionResponse.body.transaction.id;

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

    const secondCategoryResponse = await request(app)
      .post("/categories")
      .set("Authorization", `Bearer ${secondToken}`)
      .send({
        name: "Second Food",
        type: "EXPENSE",
      });

    const secondCategoryId =
      secondCategoryResponse.body.category.id;

    const response = await request(app)
      .patch(`/transactions/${transactionId}`)
      .set("Authorization", `Bearer ${secondToken}`)
      .send({
        categoryId: secondCategoryId,
      });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "Transaction not found",
    });
  });

  it("PATCH /transactions/:id rejects a type that does not match the category type", async () => {
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

    const expenseCategoryResponse = await request(app)
      .post("/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Food",
        type: "EXPENSE",
      });

    const incomeCategoryResponse = await request(app)
      .post("/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Salary",
        type: "INCOME",
      });

    const expenseCategoryId =
      expenseCategoryResponse.body.category.id;

    const incomeCategoryId =
      incomeCategoryResponse.body.category.id;

    const transactionResponse = await request(app)
      .post("/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        amount: 100000,
        description: "Food",
        type: "EXPENSE",
        date: "2026-09-15T12:00:00.000Z",
        categoryId: expenseCategoryId,
      });

    const transactionId = transactionResponse.body.transaction.id;

    const invalidResponse = await request(app)
      .patch(`/transactions/${transactionId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        type: "INCOME",
        categoryId: expenseCategoryId,
      });

    expect(invalidResponse.status).toBe(400);
    expect(invalidResponse.body).toEqual({
      message: "Transaction type must match category type",
    });

    const validResponse = await request(app)
      .patch(`/transactions/${transactionId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        type: "INCOME",
        categoryId: incomeCategoryId,
      });

    expect(validResponse.status).toBe(200);

    expect(validResponse.body.transaction).toMatchObject({
      id: transactionId,
      type: "INCOME",
      categoryId: incomeCategoryId,
    });
  });

  it("DELETE /transactions/:id deletes a transaction owned by the authenticated user", async () => {
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

    const categoryResponse = await request(app)
      .post("/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Food",
        type: "EXPENSE",
      });

    const categoryId = categoryResponse.body.category.id;

    const createResponse = await request(app)
      .post("/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        amount: 100000,
        description: "Lunch",
        type: "EXPENSE",
        date: "2026-09-15T12:00:00.000Z",
        categoryId,
      });

    const transactionId = createResponse.body.transaction.id;

    const response = await request(app)
      .delete(`/transactions/${transactionId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: "Transaction deleted successfully",
    });

    const deletedTransaction =
      await prisma.transaction.findUnique({
        where: {
          id: transactionId,
        },
      });

    expect(deletedTransaction).toBeNull();
  });

  it("DELETE /transactions/:id rejects a transaction owned by another user", async () => {
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

    const categoryResponse = await request(app)
      .post("/categories")
      .set("Authorization", `Bearer ${firstToken}`)
      .send({
        name: "Private Food",
        type: "EXPENSE",
      });

    const categoryId = categoryResponse.body.category.id;

    const transactionResponse = await request(app)
      .post("/transactions")
      .set("Authorization", `Bearer ${firstToken}`)
      .send({
        amount: 100000,
        description: "Private transaction",
        type: "EXPENSE",
        date: "2026-09-15T12:00:00.000Z",
        categoryId,
      });

    const transactionId = transactionResponse.body.transaction.id;

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

    const response = await request(app)
      .delete(`/transactions/${transactionId}`)
      .set("Authorization", `Bearer ${secondToken}`);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "Transaction not found",
    });

    const transactionStillExists =
      await prisma.transaction.findUnique({
        where: {
          id: transactionId,
        },
      });

    expect(transactionStillExists).not.toBeNull();
  });

  // ─────────────────────────────────────────────
  // BUDGETS
  // ─────────────────────────────────────────────

  it("POST /budgets creates a budget for an expense category", async () => {
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

    const categoryResponse = await request(app)
      .post("/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Food",
        type: "EXPENSE",
      });

    expect(categoryResponse.status).toBe(201);

    const categoryId = categoryResponse.body.category.id;

    const response = await request(app)
      .post("/budgets")
      .set("Authorization", `Bearer ${token}`)
      .send({
        amount: 1000000,
        month: "2026-09-15",
        categoryId,
      });

    expect(response.status).toBe(201);

    expect(response.body.budget).toMatchObject({
      amount: "1000000",
      categoryId,
    });

    expect(response.body.budget.id).toBeDefined();

    expect(response.body.budget.category).toMatchObject({
      id: categoryId,
      name: "Food",
      type: "EXPENSE",
    });

    expect(response.body.budget.month).toBe(
      "2026-09-01T00:00:00.000Z"
    );
  });

  it("POST /budgets rejects an income category", async () => {
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

    const categoryResponse = await request(app)
      .post("/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Salary",
        type: "INCOME",
      });

    const categoryId = categoryResponse.body.category.id;

    const response = await request(app)
      .post("/budgets")
      .set("Authorization", `Bearer ${token}`)
      .send({
        amount: 1000000,
        month: "2026-09-15",
        categoryId,
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "Budgets can only be created for expense categories",
    });
  });

  it("POST /budgets rejects a category owned by another user", async () => {
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

    const categoryResponse = await request(app)
      .post("/categories")
      .set("Authorization", `Bearer ${firstToken}`)
      .send({
        name: "Private Food",
        type: "EXPENSE",
      });

    const categoryId = categoryResponse.body.category.id;

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

    const response = await request(app)
      .post("/budgets")
      .set("Authorization", `Bearer ${secondToken}`)
      .send({
        amount: 500000,
        month: "2026-09-15",
        categoryId,
      });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "Category not found",
    });
  });

  it("POST /budgets rejects a duplicate budget for the same category and month", async () => {
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

    const categoryResponse = await request(app)
      .post("/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Food",
        type: "EXPENSE",
      });

    const categoryId = categoryResponse.body.category.id;

    const firstResponse = await request(app)
      .post("/budgets")
      .set("Authorization", `Bearer ${token}`)
      .send({
        amount: 1000000,
        month: "2026-09-01",
        categoryId,
      });

    expect(firstResponse.status).toBe(201);

    const secondResponse = await request(app)
      .post("/budgets")
      .set("Authorization", `Bearer ${token}`)
      .send({
        amount: 1500000,
        month: "2026-09-30",
        categoryId,
      });

    expect(secondResponse.status).toBe(409);
    expect(secondResponse.body).toEqual({
      message:
        "A budget already exists for this category and month",
    });
  });

  it("GET /budgets calculates spent, remaining and percentage", async () => {
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

    const categoryResponse = await request(app)
      .post("/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Food",
        type: "EXPENSE",
      });

    const categoryId = categoryResponse.body.category.id;

    const budgetResponse = await request(app)
      .post("/budgets")
      .set("Authorization", `Bearer ${token}`)
      .send({
        amount: 1000000,
        month: "2026-09-01",
        categoryId,
      });

    expect(budgetResponse.status).toBe(201);

    const transactionResponse = await request(app)
      .post("/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        amount: 250000,
        description: "Groceries",
        type: "EXPENSE",
        date: "2026-09-15T12:00:00.000Z",
        categoryId,
      });

    expect(transactionResponse.status).toBe(201);

    const response = await request(app)
      .get("/budgets")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.budgets).toHaveLength(1);

    expect(response.body.budgets[0]).toMatchObject({
      id: budgetResponse.body.budget.id,
      amount: 1000000,
      spent: 250000,
      remaining: 750000,
      percentage: 25,
      category: {
        id: categoryId,
        name: "Food",
      },
    });
  });

  it("PATCH /budgets/:id updates a budget owned by the authenticated user", async () => {
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

    const categoryResponse = await request(app)
      .post("/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Food",
        type: "EXPENSE",
      });

    const categoryId = categoryResponse.body.category.id;

    const budgetResponse = await request(app)
      .post("/budgets")
      .set("Authorization", `Bearer ${token}`)
      .send({
        amount: 1000000,
        month: "2026-09-01",
        categoryId,
      });

    const budgetId = budgetResponse.body.budget.id;

    const response = await request(app)
      .patch(`/budgets/${budgetId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        amount: 1500000,
      });

    expect(response.status).toBe(200);

    expect(response.body.budget).toMatchObject({
      id: budgetId,
      amount: "1500000",
      categoryId,
    });
  });

  it("DELETE /budgets/:id deletes a budget and rejects another user's budget", async () => {
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

    const categoryResponse = await request(app)
      .post("/categories")
      .set("Authorization", `Bearer ${firstToken}`)
      .send({
        name: "Food",
        type: "EXPENSE",
      });

    const categoryId = categoryResponse.body.category.id;

    const budgetResponse = await request(app)
      .post("/budgets")
      .set("Authorization", `Bearer ${firstToken}`)
      .send({
        amount: 1000000,
        month: "2026-09-01",
        categoryId,
      });

    const budgetId = budgetResponse.body.budget.id;

    const deleteResponse = await request(app)
      .delete(`/budgets/${budgetId}`)
      .set("Authorization", `Bearer ${firstToken}`);

    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body).toEqual({
      message: "Budget deleted successfully",
    });

    const deletedBudget = await prisma.budget.findUnique({
      where: {
        id: budgetId,
      },
    });

    expect(deletedBudget).toBeNull();

    // Crear un segundo presupuesto para comprobar aislamiento.
    const secondBudgetResponse = await request(app)
      .post("/budgets")
      .set("Authorization", `Bearer ${firstToken}`)
      .send({
        amount: 2000000,
        month: "2026-10-01",
        categoryId,
      });

    expect(secondBudgetResponse.status).toBe(201);

    const secondBudgetId =
      secondBudgetResponse.body.budget.id;

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

    const unauthorizedDeleteResponse = await request(app)
      .delete(`/budgets/${secondBudgetId}`)
      .set("Authorization", `Bearer ${secondToken}`);

    expect(unauthorizedDeleteResponse.status).toBe(404);
    expect(unauthorizedDeleteResponse.body).toEqual({
      message: "Budget not found",
    });

    const budgetStillExists = await prisma.budget.findUnique({
      where: {
        id: secondBudgetId,
      },
    });

    expect(budgetStillExists).not.toBeNull();
  });

  // ─────────────────────────────────────────────
  // DASHBOARD
  // ─────────────────────────────────────────────

  it("GET /dashboard/summary returns the authenticated user's financial summary", async () => {
    await request(app).post("/auth/register").send({
      name: "Vitest User",
      email: testEmail,
      password: "password123",
      currency: "PYG",
    });

    const loginResponse = await request(app).post("/auth/login").send({
      email: testEmail,
      password: "password123",
    });

    const token = loginResponse.body.token;

    const expenseCategoryResponse = await request(app)
      .post("/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Food", type: "EXPENSE" });

    const incomeCategoryResponse = await request(app)
      .post("/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Salary", type: "INCOME" });

    const expenseCategoryId = expenseCategoryResponse.body.category.id;
    const incomeCategoryId = incomeCategoryResponse.body.category.id;
    const now = new Date();

    const currentMonthDate = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 15, 12, 0, 0)
    ).toISOString();

    const previousMonthDate = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 15, 12, 0, 0)
    ).toISOString();

    await request(app)
      .post("/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        amount: 5000000,
        description: "Monthly salary",
        type: "INCOME",
        date: currentMonthDate,
        categoryId: incomeCategoryId,
      });

    await request(app)
      .post("/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        amount: 750000,
        description: "Current month groceries",
        type: "EXPENSE",
        date: currentMonthDate,
        categoryId: expenseCategoryId,
      });

    await request(app)
      .post("/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        amount: 250000,
        description: "Previous month groceries",
        type: "EXPENSE",
        date: previousMonthDate,
        categoryId: expenseCategoryId,
      });

    const response = await request(app)
      .get("/dashboard/summary")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      message: "Dashboard summary",
      totalIncome: 5000000,
      totalExpenses: 1000000,
      balance: 4000000,
      monthlyIncome: 5000000,
      monthlyExpenses: 750000,
    });

    expect(response.body.userId).toBeDefined();
    expect(response.body.recentTransactions).toHaveLength(3);
    expect(response.body.recentTransactions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          description: "Monthly salary",
          amount: "5000000",
          type: "INCOME",
        }),
        expect.objectContaining({
          description: "Current month groceries",
          amount: "750000",
          type: "EXPENSE",
        }),
        expect.objectContaining({
          description: "Previous month groceries",
          amount: "250000",
          type: "EXPENSE",
        }),
      ])
    );
  });

  it("GET /dashboard/categories groups expenses by category and sorts them by total", async () => {
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

    const foodResponse = await request(app)
      .post("/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Food",
        type: "EXPENSE",
      });

    const transportResponse = await request(app)
      .post("/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Transport",
        type: "EXPENSE",
      });

    const incomeResponse = await request(app)
      .post("/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Salary",
        type: "INCOME",
      });

    const foodId = foodResponse.body.category.id;
    const transportId = transportResponse.body.category.id;
    const incomeId = incomeResponse.body.category.id;

    await request(app)
      .post("/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        amount: 200000,
        description: "Groceries",
        type: "EXPENSE",
        date: "2026-09-10T12:00:00.000Z",
        categoryId: foodId,
      });

    await request(app)
      .post("/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        amount: 150000,
        description: "Restaurant",
        type: "EXPENSE",
        date: "2026-09-11T12:00:00.000Z",
        categoryId: foodId,
      });

    await request(app)
      .post("/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        amount: 100000,
        description: "Bus",
        type: "EXPENSE",
        date: "2026-09-12T12:00:00.000Z",
        categoryId: transportId,
      });

    await request(app)
      .post("/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        amount: 5000000,
        description: "Salary",
        type: "INCOME",
        date: "2026-09-12T12:00:00.000Z",
        categoryId: incomeId,
      });

    const response = await request(app)
      .get("/dashboard/categories")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);

    expect(response.body.categories).toEqual([
      {
        categoryId: foodId,
        categoryName: "Food",
        total: 350000,
      },
      {
        categoryId: transportId,
        categoryName: "Transport",
        total: 100000,
      },
    ]);
  });

    it("GET /dashboard/categories filters expenses by date range", async () => {
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

    const categoryResponse = await request(app)
      .post("/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Food",
        type: "EXPENSE",
      });

    const categoryId = categoryResponse.body.category.id;

    await request(app)
      .post("/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        amount: 100000,
        description: "Before range",
        type: "EXPENSE",
        date: "2026-08-31T12:00:00.000Z",
        categoryId,
      });

    await request(app)
      .post("/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        amount: 250000,
        description: "Inside range",
        type: "EXPENSE",
        date: "2026-09-10T12:00:00.000Z",
        categoryId,
      });

    await request(app)
      .post("/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        amount: 500000,
        description: "After range",
        type: "EXPENSE",
        date: "2026-09-20T12:00:00.000Z",
        categoryId,
      });

    const response = await request(app)
      .get("/dashboard/categories")
      .query({
        from: "2026-09-01",
        to: "2026-09-15",
      })
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);

    expect(response.body.categories).toEqual([
      {
        categoryId,
        categoryName: "Food",
        total: 250000,
      },
    ]);
  });

  it("GET /dashboard/categories rejects invalid date filters", async () => {
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

    const invalidFromResponse = await request(app)
      .get("/dashboard/categories")
      .query({
        from: "15-09-2026",
      })
      .set("Authorization", `Bearer ${token}`);

    expect(invalidFromResponse.status).toBe(400);
    expect(invalidFromResponse.body).toEqual({
      message: "Invalid from date. Use YYYY-MM-DD",
    });

    const invalidToResponse = await request(app)
      .get("/dashboard/categories")
      .query({
        to: "not-a-date",
      })
      .set("Authorization", `Bearer ${token}`);

    expect(invalidToResponse.status).toBe(400);
    expect(invalidToResponse.body).toEqual({
      message: "Invalid to date. Use YYYY-MM-DD",
    });

    const invalidRangeResponse = await request(app)
      .get("/dashboard/categories")
      .query({
        from: "2026-09-20",
        to: "2026-09-10",
      })
      .set("Authorization", `Bearer ${token}`);

    expect(invalidRangeResponse.status).toBe(400);
    expect(invalidRangeResponse.body).toEqual({
      message: "From date must be before or equal to to date",
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

    // ─────────────────────────────────────────────
  // SAVINGS GOALS
  // ─────────────────────────────────────────────

  it("POST /savings-goals creates a savings goal for the authenticated user", async () => {
    await request(app)
      .post("/auth/register")
      .send({
        name: "Savings User",
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

    const response = await request(app)
      .post("/savings-goals")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Notebook nueva",
        targetAmount: 8000000,
        currentAmount: 3000000,
        targetDate: "2027-03-31",
      });

    expect(response.status).toBe(201);
    expect(response.body.savingsGoal).toMatchObject({
      name: "Notebook nueva",
      targetAmount: "8000000",
      currentAmount: "3000000",
      targetDate: "2027-03-31T00:00:00.000Z",
    });

    expect(response.body.savingsGoal.id).toBeDefined();
  });

  it("POST /savings-goals uses zero as the default current amount", async () => {
    await request(app)
      .post("/auth/register")
      .send({
        name: "Savings User",
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

    const response = await request(app)
      .post("/savings-goals")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Viaje",
        targetAmount: 5000000,
      });

    expect(response.status).toBe(201);
    expect(response.body.savingsGoal.name).toBe("Viaje");
    expect(response.body.savingsGoal.targetAmount).toBe("5000000");
    expect(response.body.savingsGoal.currentAmount).toBe("0");
    expect(response.body.savingsGoal.targetDate).toBeNull();
  });

  it("POST /savings-goals rejects invalid savings goal data", async () => {
    await request(app)
      .post("/auth/register")
      .send({
        name: "Savings User",
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

    const response = await request(app)
      .post("/savings-goals")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "",
        targetAmount: -1000,
        currentAmount: -500,
        targetDate: "31-03-2027",
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid savings goal data");
  });

  it("GET /savings-goals calculates remaining and percentage", async () => {
    await request(app)
      .post("/auth/register")
      .send({
        name: "Savings User",
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

    await request(app)
      .post("/savings-goals")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Notebook nueva",
        targetAmount: 8000000,
        currentAmount: 3000000,
        targetDate: "2027-03-31",
      });

    const response = await request(app)
      .get("/savings-goals")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.savingsGoals).toHaveLength(1);

    expect(response.body.savingsGoals[0]).toMatchObject({
      name: "Notebook nueva",
      targetAmount: 8000000,
      currentAmount: 3000000,
      remaining: 5000000,
      percentage: 38,
      targetDate: "2027-03-31T00:00:00.000Z",
    });
  });

  it("PATCH /savings-goals/:id updates a savings goal owned by the authenticated user", async () => {
    await request(app)
      .post("/auth/register")
      .send({
        name: "Savings User",
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
      .post("/savings-goals")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Notebook",
        targetAmount: 8000000,
        currentAmount: 1000000,
        targetDate: "2027-03-31",
      });

    const goalId = createResponse.body.savingsGoal.id;

    const response = await request(app)
      .patch(`/savings-goals/${goalId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Notebook nueva",
        targetAmount: 9000000,
        currentAmount: 3000000,
        targetDate: "2027-05-31",
      });

    expect(response.status).toBe(200);
    expect(response.body.savingsGoal).toMatchObject({
      id: goalId,
      name: "Notebook nueva",
      targetAmount: "9000000",
      currentAmount: "3000000",
      targetDate: "2027-05-31T00:00:00.000Z",
    });
  });

  it("PATCH /savings-goals/:id rejects a savings goal owned by another user", async () => {
    await request(app)
      .post("/auth/register")
      .send({
        name: "First User",
        email: testEmail,
        password: "password123",
        currency: "PYG",
      });

    const firstLogin = await request(app)
      .post("/auth/login")
      .send({
        email: testEmail,
        password: "password123",
      });

    const firstToken = firstLogin.body.token;

    const createResponse = await request(app)
      .post("/savings-goals")
      .set("Authorization", `Bearer ${firstToken}`)
      .send({
        name: "Private Goal",
        targetAmount: 5000000,
      });

    const goalId = createResponse.body.savingsGoal.id;

    const secondEmail = `second-${Date.now()}@example.com`;

    await request(app)
      .post("/auth/register")
      .send({
        name: "Second User",
        email: secondEmail,
        password: "password123",
        currency: "PYG",
      });

    const secondLogin = await request(app)
      .post("/auth/login")
      .send({
        email: secondEmail,
        password: "password123",
      });

    const secondToken = secondLogin.body.token;

    const response = await request(app)
      .patch(`/savings-goals/${goalId}`)
      .set("Authorization", `Bearer ${secondToken}`)
      .send({
        name: "Changed Goal",
      });

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Savings goal not found");
  });

  it("DELETE /savings-goals/:id deletes a savings goal owned by the authenticated user", async () => {
    await request(app)
      .post("/auth/register")
      .send({
        name: "Savings User",
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
      .post("/savings-goals")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Emergency Fund",
        targetAmount: 10000000,
      });

    const goalId = createResponse.body.savingsGoal.id;

    const deleteResponse = await request(app)
      .delete(`/savings-goals/${goalId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body.message).toBe(
      "Savings goal deleted successfully"
    );

    const listResponse = await request(app)
      .get("/savings-goals")
      .set("Authorization", `Bearer ${token}`);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.savingsGoals).toHaveLength(0);
  });

  it("DELETE /savings-goals/:id rejects a savings goal owned by another user", async () => {
    await request(app)
      .post("/auth/register")
      .send({
        name: "First User",
        email: testEmail,
        password: "password123",
        currency: "PYG",
      });

    const firstLogin = await request(app)
      .post("/auth/login")
      .send({
        email: testEmail,
        password: "password123",
      });

    const firstToken = firstLogin.body.token;

    const createResponse = await request(app)
      .post("/savings-goals")
      .set("Authorization", `Bearer ${firstToken}`)
      .send({
        name: "Private Goal",
        targetAmount: 5000000,
      });

    const goalId = createResponse.body.savingsGoal.id;

    const secondEmail = `second-${Date.now()}@example.com`;

    await request(app)
      .post("/auth/register")
      .send({
        name: "Second User",
        email: secondEmail,
        password: "password123",
        currency: "PYG",
      });

    const secondLogin = await request(app)
      .post("/auth/login")
      .send({
        email: secondEmail,
        password: "password123",
      });

    const secondToken = secondLogin.body.token;

    const response = await request(app)
      .delete(`/savings-goals/${goalId}`)
      .set("Authorization", `Bearer ${secondToken}`);

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Savings goal not found");
  });
  
});