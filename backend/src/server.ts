import express from "express";

import { prisma } from "./lib/prisma.js";
import authRouter from "./routes/auth.routes.js";
import categoriesRouter from "./routes/categories.routes.js";
import transactionsRouter from "./routes/transactions.routes.js";

const app = express();
const PORT = 4000;

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

app.listen(PORT, () => {
  console.log(`Noniq API running on http://localhost:${PORT}`);
});