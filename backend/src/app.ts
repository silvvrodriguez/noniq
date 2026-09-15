import express from "express";

import { prisma } from "./lib/prisma.js";
import { errorHandler } from "./middleware/error.middleware.js";

import authRouter from "./routes/auth.routes.js";
import categoriesRouter from "./routes/categories.routes.js";
import transactionsRouter from "./routes/transactions.routes.js";
import dashboardRouter from "./routes/dashboard.routes.js";
import budgetRouter from "./routes/budget.routes.js";
import savingsGoalRouter from "./routes/savings-goal.routes.js";
import exportRouter from "./routes/export.routes.js";

const app = express();

app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    message: "Noniq API is running",
  });
});

app.get("/health", async (_req, res) => {
  const userCount = await prisma.user.count();

  res.json({
    status: "ok",
    database: "connected",
    users: userCount,
  });
});

app.use("/auth", authRouter);
app.use("/categories", categoriesRouter);
app.use("/transactions", transactionsRouter);
app.use("/dashboard", dashboardRouter);
app.use("/budgets", budgetRouter);
app.use("/savings-goals", savingsGoalRouter);
app.use("/export", exportRouter);

// Global error handler — must be registered after all routes.
app.use(errorHandler);

export default app;