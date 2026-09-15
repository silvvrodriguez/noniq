import request from "supertest";
import { describe, expect, it } from "vitest";

import app from "../app.js";

describe("Noniq API", () => {
  it("GET / returns the API status message", async () => {
    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: "Noniq API is running",
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