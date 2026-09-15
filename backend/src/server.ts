import express from "express";

import { prisma } from "./lib/prisma.js";
import authRouter from "./routes/auth.routes.js";

const app = express();
const PORT = 4000;

app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    message: "Finora API is running",
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

app.listen(PORT, () => {
  console.log(`Finora API running on http://localhost:${PORT}`);
});