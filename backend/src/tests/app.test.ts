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

    expect(loginResponse.status).toBe(200);

    const token = loginResponse.body.token;

    const categoryResponse = await request(app)
      .post("/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Groceries",
        type: "EXPENSE",
      });

    expect(categoryResponse.status).toBe(201);

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
    expect(transactionResponse.body.message).toBe(
      "Transaction created successfully"
    );

    expect(transactionResponse.body.transaction).toMatchObject({
      amount: "175000",
      description: "Weekly groceries",
      type: "EXPENSE",
      categoryId,
    });

    expect(transactionResponse.body.transaction.id).toBeDefined();

    expect(transactionResponse.body.transaction.category).toMatchObject({
      id: categoryId,
      name: "Groceries",
      type: "EXPENSE",
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

    expect(categoryResponse.status).toBe(201);

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

    const transactionResponse = await request(app)
      .post("/transactions")
      .set("Authorization", `Bearer ${secondToken}`)
      .send({
        amount: 50000,
        description: "Unauthorized transaction",
        type: "EXPENSE",
        date: "2026-09-15T17:00:00.000Z",
        categoryId,
      });

    expect(transactionResponse.status).toBe(404);
    expect(transactionResponse.body).toEqual({
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

    expect(loginResponse.status).toBe(200);

    const token = loginResponse.body.token;

    const categoryResponse = await request(app)
      .post("/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Salary",
        type: "INCOME",
      });

    expect(categoryResponse.status).toBe(201);

    const categoryId = categoryResponse.body.category.id;

    const transactionResponse = await request(app)
      .post("/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        amount: 5000000,
        description: "Invalid expense",
        type: "EXPENSE",
        date: "2026-09-15T17:00:00.000Z",
        categoryId,
      });

    expect(transactionResponse.status).toBe(400);
    expect(transactionResponse.body).toEqual({
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
        description: "Monthly salary",
        type: "INCOME",
        date: "2026-09-15T09:00:00.000Z",
        categoryId: incomeCategoryId,
      });

    const response = await request(app)
      .get("/transactions")
      .query({
        type: "EXPENSE",
      })
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

    const foodCategoryResponse = await request(app)
      .post("/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Food",
        type: "EXPENSE",
      });

    const transportCategoryResponse = await request(app)
      .post("/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Transport",
        type: "EXPENSE",
      });

    const foodCategoryId =
      foodCategoryResponse.body.category.id;

    const transportCategoryId =
      transportCategoryResponse.body.category.id;

    await request(app)
      .post("/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        amount: 80000,
        description: "Breakfast",
        type: "EXPENSE",
        date: "2026-09-15T08:00:00.000Z",
        categoryId: foodCategoryId,
      });

    await request(app)
      .post("/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        amount: 50000,
        description: "Bus",
        type: "EXPENSE",
        date: "2026-09-15T07:00:00.000Z",
        categoryId: transportCategoryId,
      });

    const response = await request(app)
      .get("/transactions")
      .query({
        categoryId: foodCategoryId,
      })
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);

    expect(response.body.transactions).toHaveLength(1);

    expect(response.body.transactions[0]).toMatchObject({
      amount: "80000",
      description: "Breakfast",
      type: "EXPENSE",
      categoryId: foodCategoryId,
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
        description: "Before range",
        type: "EXPENSE",
        date: "2026-08-31T12:00:00.000Z",
        categoryId,
      });

    await request(app)
      .post("/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        amount: 20000,
        description: "Inside range",
        type: "EXPENSE",
        date: "2026-09-10T12:00:00.000Z",
        categoryId,
      });

    await request(app)
      .post("/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        amount: 30000,
        description: "After range",
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
      description: "Inside range",
      type: "EXPENSE",
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
      .query({
        type: "INVALID",
      })
      .set("Authorization", `Bearer ${token}`);

    expect(invalidTypeResponse.status).toBe(400);
    expect(invalidTypeResponse.body).toEqual({
      message: "Invalid transaction type",
    });

    const invalidFromResponse = await request(app)
      .get("/transactions")
      .query({
        from: "15-09-2026",
      })
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

    expect(createResponse.status).toBe(201);

    const transactionId = createResponse.body.transaction.id;

    const updateResponse = await request(app)
      .patch(`/transactions/${transactionId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        amount: 125000,
        description: "Updated lunch",
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.message).toBe(
      "Transaction updated successfully"
    );

    expect(updateResponse.body.transaction).toMatchObject({
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

    const categoryResponse = await request(app)
      .post("/categories")
      .set("Authorization", `Bearer ${firstToken}`)
      .send({
        name: "Private Food",
        type: "EXPENSE",
      });

    const firstCategoryId =
      categoryResponse.body.category.id;

    const transactionResponse = await request(app)
      .post("/transactions")
      .set("Authorization", `Bearer ${firstToken}`)
      .send({
        amount: 100000,
        description: "Private transaction",
        type: "EXPENSE",
        date: "2026-09-15T12:00:00.000Z",
        categoryId: firstCategoryId,
      });

    expect(transactionResponse.status).toBe(201);

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

    const updateResponse = await request(app)
      .patch(`/transactions/${transactionId}`)
      .set("Authorization", `Bearer ${secondToken}`)
      .send({
        categoryId: secondCategoryId,
      });

    expect(updateResponse.status).toBe(404);
    expect(updateResponse.body).toEqual({
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

    expect(transactionResponse.status).toBe(201);

    const transactionId = transactionResponse.body.transaction.id;

    const updateResponse = await request(app)
      .patch(`/transactions/${transactionId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        type: "INCOME",
        categoryId: expenseCategoryId,
      });

    expect(updateResponse.status).toBe(400);
    expect(updateResponse.body).toEqual({
      message: "Transaction type must match category type",
    });

    const validCategoryUpdateResponse = await request(app)
      .patch(`/transactions/${transactionId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        type: "INCOME",
        categoryId: incomeCategoryId,
      });

    expect(validCategoryUpdateResponse.status).toBe(200);

    expect(validCategoryUpdateResponse.body.transaction).toMatchObject({
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

    expect(createResponse.status).toBe(201);

    const transactionId = createResponse.body.transaction.id;

    const deleteResponse = await request(app)
      .delete(`/transactions/${transactionId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body).toEqual({
      message: "Transaction deleted successfully",
    });

    const transactionStillExists =
      await prisma.transaction.findUnique({
        where: {
          id: transactionId,
        },
      });

    expect(transactionStillExists).toBeNull();
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

    expect(transactionResponse.status).toBe(201);

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

    const deleteResponse = await request(app)
      .delete(`/transactions/${transactionId}`)
      .set("Authorization", `Bearer ${secondToken}`);

    expect(deleteResponse.status).toBe(404);
    expect(deleteResponse.body).toEqual({
      message: "Transaction not found",
    });

    const transactionStillExists =
      await prisma.transaction.findUnique({
        where: {
          id: transactionId,
        },
      });

    expect(transactionStillExists).not.toBeNull();

    expect(transactionStillExists?.description).toBe(
      "Private transaction"
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