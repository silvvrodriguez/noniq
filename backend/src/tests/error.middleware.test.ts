import express from "express";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

import { errorHandler } from "../middleware/error.middleware.js";

describe("Error middleware", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a generic 500 response for unexpected errors", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const app = express();

    app.get("/error", () => {
      throw new Error("Sensitive internal error");
    });

    app.use(errorHandler);

    const response = await request(app).get("/error");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      message: "Internal server error",
    });

    expect(response.text).not.toContain(
      "Sensitive internal error"
    );

    expect(consoleErrorSpy).toHaveBeenCalledOnce();
  });
});